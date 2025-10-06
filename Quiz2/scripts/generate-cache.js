const admin = require('firebase-admin');
const fs = require('fs').promises;
const path = require('path');

console.log('🚀 Starting earthquake cache generation...');

// Initialize Firebase Admin with environment variables
// In GitHub Actions, these come from repository secrets
const firebaseConfig = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
};

// Initialize Firebase Admin
try {
  admin.initializeApp({
    credential: admin.credential.cert(firebaseConfig)
  });
  console.log('✅ Firebase Admin initialized successfully');
} catch (error) {
  console.error('❌ Firebase initialization failed:', error.message);
  process.exit(1);
}

const db = admin.firestore();

async function generateCacheFiles() {
  // Create cache directory in the parent folder (Quiz2/cache/)
  const cacheDir = path.join(__dirname, '../cache');
  await fs.mkdir(cacheDir, { recursive: true });
  console.log(`📁 Cache directory created: ${cacheDir}`);
  
  // Define popular searches to pre-cache
  const searches = [
    {
      name: 'High Magnitude Earthquakes (5.0+)',
      type: 'magnitude',
      params: { min: 5.0 },
      filename: 'magnitude-5-plus.json',
      limit: 500
    },
    {
      name: 'Major Earthquakes (6.0+)',
      type: 'magnitude', 
      params: { min: 6.0 },
      filename: 'magnitude-6-plus.json',
      limit: 200
    },
    {
      name: 'Moderate Earthquakes (4.0-5.0)',
      type: 'magnitude',
      params: { min: 4.0, max: 5.0 },
      filename: 'magnitude-4-to-5.json',
      limit: 1000
    },
    {
      name: 'Recent Earthquakes (Last 100)',
      type: 'recent',
      params: { limit: 100 },
      filename: 'recent-earthquakes.json',
      limit: 100
    }
  ];
  
  console.log(`🔄 Generating ${searches.length} cache files...`);
  
  for (const search of searches) {
    try {
      console.log(`\n📊 Processing: ${search.name}`);
      
      let query = db.collection('earthquakes');
      
      // Build query based on search type
      switch(search.type) {
        case 'magnitude':
          query = query.where('magnitude', '>=', search.params.min);
          if (search.params.max) {
            query = query.where('magnitude', '<=', search.params.max);
          }
          query = query.orderBy('magnitude', 'desc');
          break;
          
        case 'recent':
          // Simple recent query without compound filters
          query = query.orderBy('time', 'desc');
          break;
      }
      
      // Execute query with limit
      const snapshot = await query.limit(search.limit).get();
      const results = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        results.push({
          id: doc.id,
          magnitude: parseFloat(data.magnitude) || 0,
          latitude: parseFloat(data.latitude) || 0,
          longitude: parseFloat(data.longitude) || 0,
          depth: parseFloat(data.depth) || 0,
          place: data.place || '',
          time: data.time || '',
          // Add any other fields you need
        });
      });
      
      // Create cache file data
      const cacheData = {
        searchType: search.type,
        searchParams: search.params,
        data: results,
        metadata: {
          generated: new Date().toISOString(),
          count: results.length,
          queryLimit: search.limit,
          cacheKey: search.filename.replace('.json', ''),
          description: search.name
        }
      };
      
      // Write cache file
      const filePath = path.join(cacheDir, search.filename);
      await fs.writeFile(filePath, JSON.stringify(cacheData, null, 2));
      
      console.log(`✅ Generated ${search.filename}: ${results.length} records`);
      
    } catch (error) {
      console.error(`❌ Error generating ${search.filename}:`, error.message);
      // Continue with other files even if one fails
    }
  }
  
  // Generate summary statistics file
  await generateSummaryStats(cacheDir);
  
  console.log('\n🎉 Cache generation complete!');
}

async function generateSummaryStats(cacheDir) {
  try {
    console.log('\n📈 Generating summary statistics...');
    
    const snapshot = await db.collection('earthquakes').get();
    
    const stats = {
      total: snapshot.size,
      averageMagnitude: 0,
      maxMagnitude: 0,
      minMagnitude: 10,
      byMagnitudeRange: {
        minor: 0,      // < 4.0
        light: 0,      // 4.0 - 4.9
        moderate: 0,   // 5.0 - 5.9
        strong: 0,     // 6.0 - 6.9
        major: 0,      // 7.0 - 7.9
        great: 0       // >= 8.0
      },
      byDepthRange: {
        shallow: 0,    // < 70km
        intermediate: 0, // 70-300km
        deep: 0        // > 300km
      },
      recentActivity: {
        last24Hours: 0,
        last7Days: 0,
        last30Days: 0
      }
    };
    
    let totalMagnitude = 0;
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const magnitude = parseFloat(data.magnitude) || 0;
      const depth = parseFloat(data.depth) || 0;
      const time = data.time?.toDate ? data.time.toDate() : (data.time ? new Date(data.time) : new Date());
      
      // Only process records with valid magnitude data
      if (magnitude > 0) {
        totalMagnitude += magnitude;
        stats.maxMagnitude = Math.max(stats.maxMagnitude, magnitude);
        stats.minMagnitude = Math.min(stats.minMagnitude, magnitude);
        
        // Categorize by magnitude
        if (magnitude < 4.0) stats.byMagnitudeRange.minor++;
        else if (magnitude < 5.0) stats.byMagnitudeRange.light++;
        else if (magnitude < 6.0) stats.byMagnitudeRange.moderate++;
        else if (magnitude < 7.0) stats.byMagnitudeRange.strong++;
        else if (magnitude < 8.0) stats.byMagnitudeRange.major++;
        else stats.byMagnitudeRange.great++;
      }
      
      // Categorize by depth
      if (depth < 70) stats.byDepthRange.shallow++;
      else if (depth < 300) stats.byDepthRange.intermediate++;
      else stats.byDepthRange.deep++;
      
      // Count recent activity
      if (time >= oneDayAgo) stats.recentActivity.last24Hours++;
      if (time >= sevenDaysAgo) stats.recentActivity.last7Days++;
      if (time >= thirtyDaysAgo) stats.recentActivity.last30Days++;
    });
    
    stats.averageMagnitude = totalMagnitude / stats.total;
    
    const summaryData = {
      statistics: stats,
      metadata: {
        generated: new Date().toISOString(),
        description: 'Earthquake database summary statistics'
      }
    };
    
    const filePath = path.join(cacheDir, 'stats-summary.json');
    await fs.writeFile(filePath, JSON.stringify(summaryData, null, 2));
    
    console.log(`✅ Generated stats-summary.json: ${stats.total} total earthquakes analyzed`);
    
  } catch (error) {
    console.error('❌ Error generating summary stats:', error.message);
  }
}

// Run the cache generation
generateCacheFiles()
  .then(() => {
    console.log('✨ Cache generation completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Cache generation failed:', error);
    process.exit(1);
  });