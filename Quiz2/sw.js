// Service Worker for Dynamic Earthquake Data Caching
// This caches Firestore API responses after users make searches

const CACHE_NAME = 'earthquake-api-cache-v1';
const MAX_CACHE_ENTRIES = 50; // Limit cache size
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

console.log('🚀 Earthquake Service Worker loaded');

// Install event - setup cache
self.addEventListener('install', event => {
    console.log('📦 Service Worker installing...');
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('✅ Cache created:', CACHE_NAME);
            return cache;
        })
    );
    self.skipWaiting(); // Activate immediately
});

// Activate event - cleanup old caches
self.addEventListener('activate', event => {
    console.log('🔄 Service Worker activating...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('🗑️ Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    return self.clients.claim(); // Take control immediately
});

// Fetch event - intercept and cache Firestore requests
self.addEventListener('fetch', event => {
    const request = event.request;
    
    // Only cache Firestore API calls
    if (shouldCacheRequest(request)) {
        event.respondWith(handleFirestoreRequest(request));
    }
});

// Determine if request should be cached
function shouldCacheRequest(request) {
    const url = request.url;
    
    // Cache Firestore REST API calls
    if (url.includes('firestore.googleapis.com') && request.method === 'POST') {
        return true;
    }
    
    // Cache Firebase Functions calls (if you add them later)
    if (url.includes('cloudfunctions.net') && request.method === 'POST') {
        return true;
    }
    
    return false;
}

// Handle Firestore requests with caching
async function handleFirestoreRequest(request) {
    try {
        const cacheKey = await generateCacheKey(request);
        const cache = await caches.open(CACHE_NAME);
        
        // Check cache first
        const cachedResponse = await cache.match(cacheKey);
        if (cachedResponse) {
            const cacheTime = parseInt(cachedResponse.headers.get('cache-time') || '0');
            const now = Date.now();
            
            // Check if cache is still valid
            if (now - cacheTime < CACHE_DURATION) {
                console.log('🎯 Cache hit for earthquake search');
                
                // Add cache indicator to response
                const responseClone = cachedResponse.clone();
                const body = await responseClone.text();
                const modifiedBody = JSON.stringify({
                    ...JSON.parse(body),
                    _cacheInfo: {
                        source: 'service-worker-cache',
                        cachedAt: new Date(cacheTime).toISOString(),
                        age: Math.round((now - cacheTime) / 1000) + 's'
                    }
                });
                
                return new Response(modifiedBody, {
                    status: cachedResponse.status,
                    statusText: cachedResponse.statusText,
                    headers: cachedResponse.headers
                });
            } else {
                // Cache expired, remove it
                await cache.delete(cacheKey);
                console.log('⏰ Cache expired, removed entry');
            }
        }
        
        // Cache miss - fetch from network
        console.log('🌐 Cache miss, fetching from Firestore...');
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // Clone response for caching
            const responseToCache = networkResponse.clone();
            
            // Add cache metadata to headers
            const headers = new Headers(responseToCache.headers);
            headers.set('cache-time', Date.now().toString());
            headers.set('cache-key', cacheKey);
            
            // Create response with cache metadata
            const cachedResponse = new Response(responseToCache.body, {
                status: responseToCache.status,
                statusText: responseToCache.statusText,
                headers: headers
            });
            
            // Clean cache before adding new entry
            await cleanCache(cache);
            
            // Cache the response
            await cache.put(cacheKey, cachedResponse);
            console.log('💾 Cached earthquake search result');
        }
        
        return networkResponse;
        
    } catch (error) {
        console.error('❌ Service Worker error:', error);
        // Fallback to network
        return fetch(request);
    }
}

// Generate unique cache key from request
async function generateCacheKey(request) {
    try {
        const requestClone = request.clone();
        const body = await requestClone.text();
        const url = request.url;
        
        // Create a simple hash from URL + body
        let hash = 0;
        const str = url + body;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        
        return `earthquake-query-${Math.abs(hash)}`;
        
    } catch (error) {
        console.error('Error generating cache key:', error);
        return `earthquake-query-${Date.now()}`;
    }
}

// Clean cache to maintain size limit
async function cleanCache(cache) {
    try {
        const keys = await cache.keys();
        
        if (keys.length >= MAX_CACHE_ENTRIES) {
            // Remove oldest entries (simple FIFO approach)
            const keysToDelete = keys.slice(0, keys.length - MAX_CACHE_ENTRIES + 5);
            await Promise.all(keysToDelete.map(key => cache.delete(key)));
            console.log(`🧹 Cleaned ${keysToDelete.length} old cache entries`);
        }
        
        // Also remove expired entries
        const now = Date.now();
        for (const key of keys) {
            const response = await cache.match(key);
            if (response) {
                const cacheTime = parseInt(response.headers.get('cache-time') || '0');
                if (now - cacheTime >= CACHE_DURATION) {
                    await cache.delete(key);
                    console.log('⏰ Removed expired cache entry');
                }
            }
        }
        
    } catch (error) {
        console.error('Error cleaning cache:', error);
    }
}

// Handle messages from main thread
self.addEventListener('message', event => {
    const { action, data } = event.data;
    
    switch (action) {
        case 'GET_CACHE_STATS':
            getCacheStats().then(stats => {
                event.ports[0].postMessage({ success: true, data: stats });
            }).catch(error => {
                event.ports[0].postMessage({ success: false, error: error.message });
            });
            break;
            
        case 'CLEAR_CACHE':
            clearCache().then(() => {
                event.ports[0].postMessage({ success: true, message: 'Cache cleared' });
            }).catch(error => {
                event.ports[0].postMessage({ success: false, error: error.message });
            });
            break;
    }
});

// Get cache statistics
async function getCacheStats() {
    try {
        const cache = await caches.open(CACHE_NAME);
        const keys = await cache.keys();
        
        let totalSize = 0;
        let expiredCount = 0;
        const now = Date.now();
        
        for (const key of keys) {
            const response = await cache.match(key);
            if (response) {
                const cacheTime = parseInt(response.headers.get('cache-time') || '0');
                if (now - cacheTime >= CACHE_DURATION) {
                    expiredCount++;
                }
                
                // Estimate size (rough approximation)
                const text = await response.clone().text();
                totalSize += text.length;
            }
        }
        
        return {
            totalEntries: keys.length,
            expiredEntries: expiredCount,
            estimatedSize: `${Math.round(totalSize / 1024)}KB`,
            maxEntries: MAX_CACHE_ENTRIES,
            cacheDuration: `${CACHE_DURATION / 60000}min`
        };
        
    } catch (error) {
        throw new Error('Failed to get cache stats: ' + error.message);
    }
}

// Clear all cache
async function clearCache() {
    try {
        const cache = await caches.open(CACHE_NAME);
        const keys = await cache.keys();
        await Promise.all(keys.map(key => cache.delete(key)));
        console.log('🗑️ All cache entries cleared');
    } catch (error) {
        throw new Error('Failed to clear cache: ' + error.message);
    }
}