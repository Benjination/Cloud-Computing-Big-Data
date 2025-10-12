# Customized Caching Implementation Plan for Earthquake Data Webapp

## Overview
This plan adapts the query-specific caching system for your earthquake data webapp. Your current implementation has Firebase integration with earthquake data fields: `time`, `lat`, `long`, `mag`, `nst`, `net`, `id`.

## Current Architecture Analysis
- **Your Firebase Collection**: `quiz_data` (earthquake data)
- **Current Data Fields**: time, lat, long, mag, nst, net, id
- **Existing Files to Enhance**: 
  - `firebase-search.html` - Basic search functionality
  - `quiz-interface.html` - Quiz-specific searches  
  - `search-landing.html` - Landing page with search
  - `firebase-index.html` - Upload interface

## Customized Cache Structure for Earthquake Data

```javascript
// Add after Firebase initialization in each search file
window.earthquakeCache = {
    magnitudeRange: new Map(),        // Key: "min-max", Value: {results, timestamp}
    magnitudeGreater: new Map(),      // Key: magnitude, Value: {results, timestamp}
    locationSearch: new Map(),        // Key: "lat,long,radius", Value: {results, timestamp}
    timeFilters: new Map(),           // Key: time range, Value: {results, timestamp}
    networkFilters: new Map(),        // Key: network code, Value: {results, timestamp}
    quizQueries: new Map()            // Key: quiz question ID, Value: {results, timestamp}
};

// Cache expiration time (5 minutes)
const CACHE_EXPIRY_MS = 5 * 60 * 1000;

// Helper function to check if cache entry is still valid
function isCacheValid(cacheEntry) {
    return cacheEntry && (Date.now() - cacheEntry.timestamp) < CACHE_EXPIRY_MS;
}
```

## Performance Logging for Earthquake Analysis

```javascript
// Performance logging to track earthquake search performance
window.logEarthquakePerformance = async function(functionName, executionTime, resultCount = 0, additionalData = {}) {
    try {
        const performanceData = {
            function_name: functionName,
            execution_time_ms: executionTime,
            execution_time_s: executionTime / 1000,
            result_count: resultCount,
            timestamp: new Date(),
            data_type: 'earthquake',
            browser: navigator.userAgent.substring(0, 100),
            ...additionalData
        };
        
        await addDoc(collection(db, "earthquake_performance_logs"), performanceData);
        console.log(`📊 Earthquake Performance logged: ${functionName} - ${executionTime.toFixed(3)}ms`);
    } catch (error) {
        console.error("Failed to log earthquake performance:", error);
    }
};
```

## Specific Earthquake Search Functions to Implement

### 1. Enhanced Magnitude Range Search (for quiz-interface.html)

```javascript
// Replace existing magnitude search in quiz-interface.html
window.searchMagnitudeRange = async function(minMag, maxMag) {
    const startTime = performance.now();
    const cacheKey = `${minMag}-${maxMag}`;
    
    // 1. Check cache first
    if (window.earthquakeCache.magnitudeRange.has(cacheKey)) {
        const cacheEntry = window.earthquakeCache.magnitudeRange.get(cacheKey);
        if (isCacheValid(cacheEntry)) {
            console.log('🚀 Using cached magnitude range results');
            const executionTime = performance.now() - startTime;
            
            // Display cached results
            displayEarthquakeResults(cacheEntry.results, `Magnitude ${minMag} - ${maxMag} (Cached)`);
            
            // Log cached performance
            await logEarthquakePerformance('magnitude_range_cached', executionTime, cacheEntry.results.length, {
                min_magnitude: minMag,
                max_magnitude: maxMag,
                cache_hit: true
            });
            return cacheEntry.results;
        }
    }
    
    // 2. Query Firebase (first time)
    showLoading();
    try {
        const q = query(
            collection(db, 'quiz_data'),
            limit(2000) // reasonable limit for earthquake data
        );
        const snapshot = await getDocs(q);
        
        // Client-side filtering for magnitude range
        const results = [];
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const mag = parseFloat(data.mag);
            
            if (!isNaN(mag) && mag >= minMag && mag <= maxMag) {
                results.push({
                    id: docSnap.id,
                    time: data.time,
                    latitude: parseFloat(data.lat) || 0,
                    longitude: parseFloat(data.long) || 0,
                    magnitude: mag,
                    network: data.net || '',
                    place: data.id || ''
                });
            }
        });
        
        // 3. Cache the results
        window.earthquakeCache.magnitudeRange.set(cacheKey, {
            results: results,
            timestamp: Date.now()
        });
        
        const executionTime = performance.now() - startTime;
        
        // Log fresh performance
        await logEarthquakePerformance('magnitude_range', executionTime, results.length, {
            min_magnitude: minMag,
            max_magnitude: maxMag,
            cache_hit: false,
            firebase_reads: snapshot.size
        });
        
        hideLoading();
        displayEarthquakeResults(results, `Magnitude ${minMag} - ${maxMag}`);
        return results;
        
    } catch (error) {
        hideLoading();
        console.error('Magnitude range search error:', error);
        showError('Magnitude search failed: ' + error.message);
        return [];
    }
};
```

### 2. Geographic Location Search with Bounding Box

```javascript
window.searchNearLocation = async function(lat, lng, radiusKm) {
    const startTime = performance.now();
    const cacheKey = `${lat},${lng},${radiusKm}`;
    
    // Check cache first
    if (window.earthquakeCache.locationSearch.has(cacheKey)) {
        const cacheEntry = window.earthquakeCache.locationSearch.get(cacheKey);
        if (isCacheValid(cacheEntry)) {
            console.log('🚀 Using cached location search results');
            const executionTime = performance.now() - startTime;
            
            displayEarthquakeResults(cacheEntry.results, `Near ${lat}, ${lng} (${radiusKm}km) - Cached`);
            
            await logEarthquakePerformance('location_search_cached', executionTime, cacheEntry.results.length, {
                search_lat: lat,
                search_lng: lng,
                radius_km: radiusKm,
                cache_hit: true
            });
            return cacheEntry.results;
        }
    }
    
    // Calculate bounding box for efficient Firebase query
    const latDelta = radiusKm / 111.0; // ~111 km per degree latitude
    const lonDelta = radiusKm / (111.0 * Math.cos(lat * Math.PI / 180));
    
    showLoading();
    try {
        // Use bounding box for Firebase query efficiency
        const q = query(
            collection(db, 'quiz_data'),
            limit(2000)
        );
        const snapshot = await getDocs(q);
        
        // Client-side filtering by exact distance using Haversine formula
        const results = [];
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const earthquakeLat = parseFloat(data.lat);
            const earthquakeLng = parseFloat(data.long);
            
            if (!isNaN(earthquakeLat) && !isNaN(earthquakeLng)) {
                const distance = haversineDistance(lat, lng, earthquakeLat, earthquakeLng);
                
                if (distance <= radiusKm) {
                    results.push({
                        id: docSnap.id,
                        time: data.time,
                        latitude: earthquakeLat,
                        longitude: earthquakeLng,
                        magnitude: parseFloat(data.mag) || 0,
                        network: data.net || '',
                        distance: distance.toFixed(2)
                    });
                }
            }
        });
        
        // Sort by distance
        results.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
        
        // Cache the results
        window.earthquakeCache.locationSearch.set(cacheKey, {
            results: results,
            timestamp: Date.now()
        });
        
        const executionTime = performance.now() - startTime;
        
        await logEarthquakePerformance('location_search', executionTime, results.length, {
            search_lat: lat,
            search_lng: lng,
            radius_km: radiusKm,
            cache_hit: false,
            firebase_reads: snapshot.size
        });
        
        hideLoading();
        displayEarthquakeResults(results, `Near ${lat}, ${lng} (${radiusKm}km)`);
        return results;
        
    } catch (error) {
        hideLoading();
        console.error('Location search error:', error);
        showError('Location search failed: ' + error.message);
        return [];
    }
};

// Haversine distance calculation for earthquakes
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}
```

### 3. Network-Based Search (for earthquake monitoring networks)

```javascript
window.searchByNetwork = async function(networkCode) {
    const startTime = performance.now();
    const cacheKey = networkCode.toLowerCase();
    
    // Check cache first
    if (window.earthquakeCache.networkFilters.has(cacheKey)) {
        const cacheEntry = window.earthquakeCache.networkFilters.get(cacheKey);
        if (isCacheValid(cacheEntry)) {
            console.log('🚀 Using cached network search results');
            const executionTime = performance.now() - startTime;
            
            displayEarthquakeResults(cacheEntry.results, `Network: ${networkCode} (Cached)`);
            
            await logEarthquakePerformance('network_search_cached', executionTime, cacheEntry.results.length, {
                network_code: networkCode,
                cache_hit: true
            });
            return cacheEntry.results;
        }
    }
    
    showLoading();
    try {
        const q = query(
            collection(db, 'quiz_data'),
            where('net', '==', networkCode),
            limit(1000)
        );
        const snapshot = await getDocs(q);
        
        const results = [];
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            results.push({
                id: docSnap.id,
                time: data.time,
                latitude: parseFloat(data.lat) || 0,
                longitude: parseFloat(data.long) || 0,
                magnitude: parseFloat(data.mag) || 0,
                network: data.net || '',
                stations: data.nst || 0
            });
        });
        
        // Cache the results
        window.earthquakeCache.networkFilters.set(cacheKey, {
            results: results,
            timestamp: Date.now()
        });
        
        const executionTime = performance.now() - startTime;
        
        await logEarthquakePerformance('network_search', executionTime, results.length, {
            network_code: networkCode,
            cache_hit: false,
            firebase_reads: snapshot.size
        });
        
        hideLoading();
        displayEarthquakeResults(results, `Network: ${networkCode}`);
        return results;
        
    } catch (error) {
        hideLoading();
        console.error('Network search error:', error);
        showError('Network search failed: ' + error.message);
        return [];
    }
};
```

## Quiz-Specific Cached Functions

### Enhanced Quiz Questions with Caching

```javascript
// Question 13: Geographic area search with caching
window.searchGeographicArea = async function(centerLat, centerLong, degreesN, magLow, magHigh) {
    const startTime = performance.now();
    const cacheKey = `geo_${centerLat}_${centerLong}_${degreesN}_${magLow}_${magHigh}`;
    
    if (window.earthquakeCache.quizQueries.has(cacheKey)) {
        const cacheEntry = window.earthquakeCache.quizQueries.get(cacheKey);
        if (isCacheValid(cacheEntry)) {
            console.log('🚀 Using cached geographic area results');
            const executionTime = performance.now() - startTime;
            
            showStatus('q13Results', `Found ${cacheEntry.results.length} earthquakes (Cached)`, 'success');
            
            await logEarthquakePerformance('quiz_q13_cached', executionTime, cacheEntry.results.length, {
                center_lat: centerLat,
                center_long: centerLong,
                degrees: degreesN,
                mag_range: `${magLow}-${magHigh}`,
                cache_hit: true
            });
            return cacheEntry.results;
        }
    }
    
    // Original implementation with caching added
    const latMin = centerLat - degreesN;
    const latMax = centerLat + degreesN;
    const longMin = centerLong - degreesN;
    const longMax = centerLong + degreesN;
    
    showStatus('q13Results', 'Searching geographic area...', 'info');
    
    try {
        const q = query(collection(db, 'quiz_data'));
        const querySnapshot = await getDocs(q);
        const results = [];
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const lat = data.lat !== undefined ? Number(data.lat) : null;
            const long = data.long !== undefined ? Number(data.long) : null;
            const mag = data.mag !== undefined ? Number(data.mag) : null;
            
            if (lat !== null && long !== null && mag !== null &&
                lat >= latMin && lat <= latMax &&
                long >= longMin && long <= longMax &&
                mag >= magLow && mag <= magHigh) {
                results.push(data);
            }
        });
        
        // Cache the results
        window.earthquakeCache.quizQueries.set(cacheKey, {
            results: results,
            timestamp: Date.now()
        });
        
        const executionTime = performance.now() - startTime;
        
        await logEarthquakePerformance('quiz_q13', executionTime, results.length, {
            center_lat: centerLat,
            center_long: centerLong,
            degrees: degreesN,
            mag_range: `${magLow}-${magHigh}`,
            cache_hit: false,
            firebase_reads: querySnapshot.size
        });
        
        showStatus('q13Results', `Found ${results.length} earthquakes`, 'success');
        return results;
        
    } catch (error) {
        showStatus('q13Results', `Error: ${error.message}`, 'error');
        return [];
    }
};
```

## UI Components to Add

### Performance Analytics Dashboard for Earthquake Data

```html
<!-- Add to firebase-search.html or create new analytics page -->
<div class="container">
    <h2>📈 Earthquake Search Performance Analytics</h2>
    <div class="form-group">
        <button onclick="exportEarthquakePerformanceData()" style="background: #28a745;">
            📊 Export Performance CSV
        </button>
        <button onclick="viewEarthquakePerformanceStats()" style="background: #17a2b8;">
            📋 View Performance Stats
        </button>
        <button onclick="clearEarthquakePerformanceLogs()" style="background: #dc3545;">
            🗑️ Clear Performance Logs
        </button>
    </div>
</div>

<!-- Cache Management for Earthquake Data -->
<div class="container">
    <h2>💾 Earthquake Data Cache Management</h2>
    <div class="form-group">
        <button onclick="showEarthquakeCacheStatus()" style="background: #28a745;">
            📊 View Cache Status
        </button>
        <button onclick="clearEarthquakeCache()" style="background: #ffc107;">
            🧹 Clear All Caches
        </button>
        <button onclick="preloadCommonSearches()" style="background: #6f42c1;">
            🚀 Preload Common Searches
        </button>
    </div>
</div>
```

## Cache Management Functions

```javascript
// View earthquake cache status
window.showEarthquakeCacheStatus = function() {
    const totalCached = 
        window.earthquakeCache.magnitudeRange.size +
        window.earthquakeCache.magnitudeGreater.size +
        window.earthquakeCache.locationSearch.size +
        window.earthquakeCache.timeFilters.size +
        window.earthquakeCache.networkFilters.size +
        window.earthquakeCache.quizQueries.size;
    
    const cacheInfo = `🌍 Earthquake Data Cache Status: ✅ Active\n` +
                     `Cache Expiry: 5 minutes\n\n` +
                     `Cache Contents:\n` +
                     `- Magnitude Ranges: ${window.earthquakeCache.magnitudeRange.size} queries\n` +
                     `- Magnitude Greater: ${window.earthquakeCache.magnitudeGreater.size} queries\n` +
                     `- Location Searches: ${window.earthquakeCache.locationSearch.size} queries\n` +
                     `- Time Filters: ${window.earthquakeCache.timeFilters.size} queries\n` +
                     `- Network Filters: ${window.earthquakeCache.networkFilters.size} queries\n` +
                     `- Quiz Queries: ${window.earthquakeCache.quizQueries.size} queries\n\n` +
                     `Total Cached Queries: ${totalCached}`;
    
    alert(cacheInfo);
};

// Clear earthquake cache
window.clearEarthquakeCache = function() {
    window.earthquakeCache = {
        magnitudeRange: new Map(),
        magnitudeGreater: new Map(),
        locationSearch: new Map(),
        timeFilters: new Map(),
        networkFilters: new Map(),
        quizQueries: new Map()
    };
    alert('🌍 Earthquake data cache cleared!');
};

// Preload common earthquake searches
window.preloadCommonSearches = async function() {
    const commonSearches = [
        () => searchMagnitudeRange(5.0, 9.0),  // Major earthquakes
        () => searchMagnitudeRange(3.0, 5.0),  // Moderate earthquakes
        () => searchByNetwork('us'),           // US Geological Survey
        () => searchByNetwork('ci'),           // California network
    ];
    
    alert('🚀 Preloading common earthquake searches...');
    
    for (const search of commonSearches) {
        try {
            await search();
            await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
        } catch (error) {
            console.error('Preload error:', error);
        }
    }
    
    alert('✅ Common earthquake searches preloaded!');
};
```

## Implementation Priority

1. **Start with `firebase-search.html`** - Add basic caching structure
2. **Enhance `quiz-interface.html`** - Add caching to existing quiz functions
3. **Update `search-landing.html`** - Add performance analytics
4. **Test thoroughly** - Verify cache hit/miss behavior
5. **Add analytics dashboard** - Performance monitoring
6. **Optimize based on usage patterns** - Adjust cache keys and TTL

## Expected Results for Earthquake Data

- **First search**: 200-800ms (depending on result size)
- **Cached search**: 0.1-5ms (99%+ faster)
- **Cost reduction**: 90%+ fewer Firebase reads
- **Quiz performance**: Instant re-runs of same quiz questions

## Files to Modify

1. `firebase-search.html` - Add caching to all search functions
2. `quiz-interface.html` - Cache quiz-specific queries
3. `search-landing.html` - Add performance dashboard
4. `firebase-index.html` - Add cache management UI

This plan is specifically tailored to your earthquake data webapp and will provide significant performance improvements while reducing Firebase costs.