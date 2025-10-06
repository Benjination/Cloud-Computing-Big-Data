// Dynamic Cache Manager for Earthquake Data
// Integrates with Service Worker for transparent caching

class EarthquakeCacheManager {
    constructor() {
        this.serviceWorkerRegistered = false;
        this.cacheStats = null;
        this.init();
    }
    
    async init() {
        await this.registerServiceWorker();
        this.setupCacheMonitoring();
        console.log('🚀 Earthquake Cache Manager initialized');
    }
    
    // Register Service Worker for dynamic caching
    async registerServiceWorker() {
        console.log('⚠️ Service Worker temporarily disabled for debugging');
        this.serviceWorkerRegistered = false;
        return;
        
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                this.serviceWorkerRegistered = true;
                
                console.log('✅ Service Worker registered for earthquake caching');
                
                // Handle updates
                registration.addEventListener('updatefound', () => {
                    console.log('🔄 Service Worker update found');
                });
                
                // Listen for service worker messages
                navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage.bind(this));
                
            } catch (error) {
                console.warn('❌ Service Worker registration failed:', error);
                this.serviceWorkerRegistered = false;
            }
        } else {
            console.warn('⚠️ Service Worker not supported in this browser');
        }
    }
    
    // Setup cache performance monitoring
    setupCacheMonitoring() {
        // Monitor fetch performance
        const originalFetch = window.fetch;
        let requestCount = 0;
        let cacheHitCount = 0;
        
        window.fetch = async function(...args) {
            const startTime = performance.now();
            const response = await originalFetch.apply(this, args);
            const endTime = performance.now();
            
            // Check if this was a Firestore request
            if (args[0] && args[0].includes && args[0].includes('firestore.googleapis.com')) {
                requestCount++;
                
                // Check if response came from cache (approximate detection)
                const responseTime = endTime - startTime;
                if (responseTime < 50) { // Very fast responses likely from cache
                    cacheHitCount++;
                    console.log(`🎯 Fast response (${Math.round(responseTime)}ms) - likely cache hit`);
                } else {
                    console.log(`🌐 Network response (${Math.round(responseTime)}ms)`);
                }
                
                // Update cache hit rate
                const hitRate = (cacheHitCount / requestCount * 100).toFixed(1);
                console.log(`📊 Cache hit rate: ${hitRate}% (${cacheHitCount}/${requestCount})`);
            }
            
            return response;
        };
    }
    
    // Handle messages from Service Worker
    handleServiceWorkerMessage(event) {
        const { type, data } = event.data;
        
        switch (type) {
            case 'CACHE_HIT':
                console.log('🎯 Cache hit:', data);
                break;
            case 'CACHE_MISS':
                console.log('🌐 Cache miss:', data);
                break;
            case 'CACHE_STORED':
                console.log('💾 Result cached:', data);
                break;
        }
    }
    
    // Get cache statistics
    async getCacheStats() {
        if (!this.serviceWorkerRegistered) {
            return { error: 'Service Worker not available' };
        }
        
        try {
            const messageChannel = new MessageChannel();
            
            return new Promise((resolve, reject) => {
                messageChannel.port1.onmessage = (event) => {
                    if (event.data.success) {
                        resolve(event.data.data);
                    } else {
                        reject(new Error(event.data.error));
                    }
                };
                
                navigator.serviceWorker.controller?.postMessage(
                    { action: 'GET_CACHE_STATS' },
                    [messageChannel.port2]
                );
                
                // Timeout after 5 seconds
                setTimeout(() => reject(new Error('Timeout')), 5000);
            });
            
        } catch (error) {
            console.error('Error getting cache stats:', error);
            return { error: error.message };
        }
    }
    
    // Clear cache
    async clearCache() {
        if (!this.serviceWorkerRegistered) {
            throw new Error('Service Worker not available');
        }
        
        try {
            const messageChannel = new MessageChannel();
            
            return new Promise((resolve, reject) => {
                messageChannel.port1.onmessage = (event) => {
                    if (event.data.success) {
                        resolve(event.data.message);
                    } else {
                        reject(new Error(event.data.error));
                    }
                };
                
                navigator.serviceWorker.controller?.postMessage(
                    { action: 'CLEAR_CACHE' },
                    [messageChannel.port2]
                );
                
                // Timeout after 5 seconds
                setTimeout(() => reject(new Error('Timeout')), 5000);
            });
            
        } catch (error) {
            console.error('Error clearing cache:', error);
            throw error;
        }
    }
    
    // Display cache status in UI
    async displayCacheStatus() {
        try {
            const stats = await this.getCacheStats();
            
            if (stats.error) {
                return `⚠️ Cache: ${stats.error}`;
            }
            
            return `📊 Cache: ${stats.totalEntries} entries, ${stats.estimatedSize}, ${stats.cacheDuration} TTL`;
            
        } catch (error) {
            return `❌ Cache: Error (${error.message})`;
        }
    }
    
    // Check if Service Worker is active and caching
    isActive() {
        return this.serviceWorkerRegistered && 
               navigator.serviceWorker.controller !== null;
    }
    
    // Get cache performance metrics
    getPerformanceMetrics() {
        // This would be implemented with more sophisticated tracking
        return {
            serviceWorkerActive: this.isActive(),
            cacheSupported: 'serviceWorker' in navigator && 'caches' in window,
            estimatedHitRate: 'Tracking in progress...'
        };
    }
}

// Create global cache manager instance
window.earthquakeCacheManager = new EarthquakeCacheManager();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EarthquakeCacheManager;
}