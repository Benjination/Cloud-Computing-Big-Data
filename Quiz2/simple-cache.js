// Simple Application-Level Cache for Earthquake Data
// This caches results in memory without interfering with network requests

class SimpleEarthquakeCache {
    constructor() {
        this.cache = new Map();
        this.maxEntries = 50;
        this.ttl = 30 * 60 * 1000; // 30 minutes
        console.log('🚀 Simple Earthquake Cache initialized');
    }
    
    // Generate cache key from search parameters
    generateKey(searchType, params) {
        return `${searchType}:${JSON.stringify(params)}`;
    }
    
    // Get cached result
    get(searchType, params) {
        const key = this.generateKey(searchType, params);
        const cached = this.cache.get(key);
        
        if (cached) {
            const age = Date.now() - cached.timestamp;
            if (age < this.ttl) {
                console.log(`🎯 Cache hit for ${key} (${Math.round(age/1000)}s old)`);
                return cached.data;
            } else {
                // Expired
                this.cache.delete(key);
                console.log(`⏰ Cache expired for ${key}`);
            }
        }
        
        console.log(`🌐 Cache miss for ${key}`);
        return null;
    }
    
    // Store result in cache
    set(searchType, params, data) {
        const key = this.generateKey(searchType, params);
        
        // Remove oldest entry if cache is full
        if (this.cache.size >= this.maxEntries) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
            console.log('🧹 Removed oldest cache entry');
        }
        
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
        
        console.log(`💾 Cached result for ${key} (${data.length} records)`);
    }
    
    // Clear all cache
    clear() {
        this.cache.clear();
        console.log('🗑️ Cache cleared');
    }
    
    // Get cache statistics
    getStats() {
        const now = Date.now();
        let validEntries = 0;
        let expiredEntries = 0;
        
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp < this.ttl) {
                validEntries++;
            } else {
                expiredEntries++;
            }
        }
        
        return {
            totalEntries: this.cache.size,
            validEntries: validEntries,
            expiredEntries: expiredEntries,
            maxEntries: this.maxEntries,
            ttlMinutes: this.ttl / 60000
        };
    }
    
    // Clean expired entries
    cleanExpired() {
        const now = Date.now();
        let cleaned = 0;
        
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp >= this.ttl) {
                this.cache.delete(key);
                cleaned++;
            }
        }
        
        if (cleaned > 0) {
            console.log(`🧹 Cleaned ${cleaned} expired cache entries`);
        }
        
        return cleaned;
    }
}

// Create global cache instance
window.simpleEarthquakeCache = new SimpleEarthquakeCache();

// Clean expired entries every 5 minutes
setInterval(() => {
    window.simpleEarthquakeCache.cleanExpired();
}, 5 * 60 * 1000);

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SimpleEarthquakeCache;
}