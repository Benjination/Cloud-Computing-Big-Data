// app.js - Text Reader Backend Logic
// Firebase configuration and text processing functionality

// =====================================
// FIREBASE CONFIGURATION
// =====================================
// Using Firebase v8 compat SDK (easier for this project)

const firebaseConfig = {
  apiKey: "AIzaSyClo5xAooY-URlku9ojjBv7fHzFXpGECiQ",
  authDomain: "text-reader-d81fb.firebaseapp.com",
  projectId: "text-reader-d81fb",
  storageBucket: "text-reader-d81fb.firebasestorage.app",
  messagingSenderId: "915986817081",
  appId: "1:915986817081:web:c685ea869cc43fa4806de8",
  measurementId: "G-XHYW6TF33R"
};

// Initialize Firebase (will work when Firebase scripts are loaded)
let db, storage, analytics;

function initializeFirebaseServices() {
    try {
        if (typeof firebase !== 'undefined') {
            firebase.initializeApp(firebaseConfig);
            db = firebase.firestore();
            storage = firebase.storage();
            // analytics = firebase.analytics(); // Optional
            console.log('Firebase services initialized successfully');
            return true;
        } else {
            console.warn('Firebase SDK not loaded. Running in offline mode.');
            return false;
        }
    } catch (error) {
        console.error('Firebase initialization error:', error);
        return false;
    }
}

// =====================================
// GLOBAL VARIABLES
// =====================================
let isFirebaseInitialized = false;
let currentDocuments = [];
let searchIndex = {};
let stopWords = [];

// =====================================
// INITIALIZATION FUNCTIONS
// =====================================

/**
 * Initialize the application when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('Text Reader App initializing...');
    initializeApp();
});

/**
 * Main initialization function
 */
async function initializeApp() {
    try {
        // Load stop words
        await loadStopWords();
        
        // Initialize Firebase connection
        isFirebaseInitialized = initializeFirebaseServices();
        
        // Load existing documents from Firebase (if Firebase is available)
        if (isFirebaseInitialized) {
            await loadExistingDocuments();
        }
        
        console.log('App initialized successfully');
        showSuccess('Application initialized successfully!');
    } catch (error) {
        console.error('Error initializing app:', error);
        showError('Failed to initialize application: ' + error.message);
    }
}

/**
 * Initialize Firebase connection
 */
async function initializeFirebase() {
    try {
        // TODO: Uncomment when Firebase config is added
        // Test Firebase connection
        // await db.collection('test').add({ initialized: new Date() });
        // isFirebaseInitialized = true;
        // console.log('Firebase initialized successfully');
    } catch (error) {
        console.error('Firebase initialization failed:', error);
        throw error;
    }
}

// =====================================
// DOCUMENT PROCESSING FUNCTIONS
// =====================================

/**
 * Process uploaded text file
 * @param {File} file - The uploaded text file
 */
async function uploadText() {
    const fileInput = document.getElementById('textFile');
    const file = fileInput.files[0];
    
    if (!file) {
        showError('Please select a file to upload');
        return;
    }
    
    if (!file.name.endsWith('.txt')) {
        showError('Please upload a .txt file');
        return;
    }
    
    try {
        showProgress(true);
        
        // Read file content
        const content = await readFileContent(file);
        
        // Process the text
        const processedDoc = await processDocument(file.name, content);
        
        // Store in Firebase
        await storeDocument(processedDoc);
        
        // Update search index
        await updateSearchIndex(processedDoc);
        
        showProgress(false);
        showSuccess(`Successfully processed ${file.name}`);
        fileInput.value = ''; // Clear file input
        
    } catch (error) {
        showProgress(false);
        showError('Error uploading file: ' + error.message);
        console.error('Upload error:', error);
    }
}

/**
 * Read content from uploaded file
 * @param {File} file - The file to read
 * @returns {Promise<string>} - File content as string
 */
function readFileContent(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

/**
 * Process document content - clean, tokenize, and analyze
 * @param {string} filename - Name of the document
 * @param {string} content - Raw text content
 * @returns {Object} - Processed document object
 */
async function processDocument(filename, content) {
    const doc = {
        id: generateDocumentId(),
        name: filename,
        originalContent: content,
        uploadDate: new Date(),
        wordCount: 0,
        language: 'unknown',
        cleanedText: '',
        words: [],
        wordFrequency: {}
    };
    
    // Clean the text
    doc.cleanedText = cleanText(content);
    
    // Tokenize into words
    doc.words = tokenizeText(doc.cleanedText);
    
    // Calculate word frequency
    doc.wordFrequency = calculateWordFrequency(doc.words);
    
    // Count words (excluding stop words)
    doc.wordCount = doc.words.length;
    
    // Detect language
    doc.language = detectLanguage(doc.cleanedText);
    
    console.log(`Processed document: ${filename}, Words: ${doc.wordCount}, Language: ${doc.language}`);
    return doc;
}

/**
 * Clean text by removing non-ASCII, converting to lowercase, removing punctuation
 * @param {string} text - Raw text to clean
 * @returns {string} - Cleaned text
 */
function cleanText(text) {
    return text
        .replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII
        .toLowerCase() // Convert to lowercase
        .replace(/[^\w\s]/g, ' ') // Remove punctuation, replace with spaces
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .trim(); // Remove leading/trailing whitespace
}

/**
 * Tokenize text into words, removing stop words
 * @param {string} text - Cleaned text to tokenize
 * @returns {Array} - Array of words
 */
function tokenizeText(text) {
    const words = text.split(/\s+/).filter(word => 
        word.length > 1 && // Remove single characters
        !stopWords.includes(word) // Remove stop words
    );
    return words;
}

/**
 * Calculate word frequency in document
 * @param {Array} words - Array of words
 * @returns {Object} - Word frequency object
 */
function calculateWordFrequency(words) {
    const frequency = {};
    words.forEach(word => {
        frequency[word] = (frequency[word] || 0) + 1;
    });
    return frequency;
}

// =====================================
// LANGUAGE DETECTION
// =====================================

/**
 * Detect language based on character frequency analysis
 * @param {string} text - Text to analyze
 * @returns {string} - Detected language
 */
function detectLanguage(text) {
    // Simple language detection based on character frequency
    // This is a basic implementation - can be enhanced
    
    const charFreq = calculateCharacterFrequency(text);
    
    // Basic heuristics for English vs French
    const englishScore = calculateLanguageScore(charFreq, 'english');
    const frenchScore = calculateLanguageScore(charFreq, 'french');
    
    if (englishScore > frenchScore) {
        return 'English';
    } else if (frenchScore > englishScore) {
        return 'French';
    } else {
        return 'Unknown';
    }
}

/**
 * Calculate character frequency in text
 * @param {string} text - Text to analyze
 * @returns {Object} - Character frequency object
 */
function calculateCharacterFrequency(text) {
    const freq = {};
    for (let char of text.toLowerCase()) {
        if (char.match(/[a-z]/)) {
            freq[char] = (freq[char] || 0) + 1;
        }
    }
    return freq;
}

/**
 * Calculate language score based on character frequency
 * @param {Object} charFreq - Character frequency object
 * @param {string} language - Language to score against
 * @returns {number} - Language score
 */
function calculateLanguageScore(charFreq, language) {
    // Basic scoring - can be enhanced with actual language models
    // For now, just return a placeholder
    return Math.random();
}

// =====================================
// SEARCH FUNCTIONALITY
// =====================================

/**
 * Analyze text for language and word frequency
 */
async function analyzeText() {
    const fileInput = document.getElementById('textFile');
    const file = fileInput.files[0];
    
    if (!file) {
        showError('Please select a file to analyze');
        return;
    }
    
    try {
        showProgress(true);
        
        const content = await readFileContent(file);
        const analysis = await processDocument(file.name, content);
        
        showProgress(false);
        displayAnalysisResults(analysis);
        
    } catch (error) {
        showProgress(false);
        showError('Error analyzing text: ' + error.message);
    }
}

/**
 * Display analysis results to user
 * @param {Object} analysis - Analysis results
 */
function displayAnalysisResults(analysis) {
    const topWords = Object.entries(analysis.wordFrequency)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 15);
    
    const resultsHtml = `
        <div style="margin-top: 20px; padding: 25px; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); border-left: 5px solid #007bff;">
            <h3 style="color: #007bff; margin-bottom: 20px;">📊 Text Analysis Results</h3>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 25px;">
                <div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                    <h4 style="margin: 0 0 10px 0; color: #495057;">📄 Document Info</h4>
                    <p><strong>Name:</strong> ${analysis.name}</p>
                    <p><strong>Language:</strong> <span style="color: #28a745; font-weight: bold;">${analysis.language}</span></p>
                    <p><strong>Total Words:</strong> ${analysis.wordCount.toLocaleString()}</p>
                    <p><strong>Unique Words:</strong> ${Object.keys(analysis.wordFrequency).length.toLocaleString()}</p>
                </div>
                
                <div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                    <h4 style="margin: 0 0 10px 0; color: #495057;">📈 Statistics</h4>
                    <p><strong>Processed:</strong> ${analysis.uploadDate.toLocaleString()}</p>
                    <p><strong>Avg Word Length:</strong> ${calculateAverageWordLength(analysis.words).toFixed(1)} chars</p>
                    <p><strong>Text Density:</strong> ${(analysis.wordCount / analysis.cleanedText.length * 100).toFixed(1)}%</p>
                    <p><strong>Status:</strong> <span style="color: #28a745;">✅ Processed</span></p>
                </div>
            </div>
            
            <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                <h4 style="margin: 0 0 15px 0; color: #495057;">🏆 Most Frequent Words</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
                    ${topWords.map(([word, count], index) => `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: ${index < 3 ? '#fff3cd' : '#f8f9fa'}; border-radius: 5px; border-left: 3px solid ${index < 3 ? '#ffc107' : '#dee2e6'};">
                            <span style="font-weight: 500;">${index + 1}. ${word}</span>
                            <span style="color: #007bff; font-weight: bold;">${count}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div style="margin-top: 15px; text-align: center;">
                <button onclick="showDetailedAnalysis('${analysis.id}')" class="btn" style="background-color: #28a745;">📋 View Detailed Analysis</button>
                <button onclick="downloadAnalysis('${analysis.id}')" class="btn" style="background-color: #17a2b8; margin-left: 10px;">💾 Download Report</button>
            </div>
        </div>
    `;
    
    // Add results after the upload section
    const uploadDiv = document.getElementById('uploadText');
    const existingResults = document.getElementById('analysisResults');
    if (existingResults) {
        existingResults.remove();
    }
    
    const resultsDiv = document.createElement('div');
    resultsDiv.id = 'analysisResults';
    resultsDiv.innerHTML = resultsHtml;
    uploadDiv.after(resultsDiv);
    
    // Scroll to results
    resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// =====================================
// SEARCH INDEX MANAGEMENT
// =====================================

/**
 * Update search index with new document
 * @param {Object} doc - Processed document
 */
async function updateSearchIndex(doc) {
    // Update local search index
    doc.words.forEach((word, index) => {
        if (!searchIndex[word]) {
            searchIndex[word] = [];
        }
        searchIndex[word].push({
            docId: doc.id,
            docName: doc.name,
            position: index
        });
    });
    
    // TODO: Update Firebase search index
    console.log('Search index updated for document:', doc.name);
}

// =====================================
// DATABASE OPERATIONS
// =====================================

/**
 * Clear all documents from database
 */
async function clearDatabase() {
    if (!confirm('Are you sure you want to clear all documents? This action cannot be undone.')) {
        return;
    }
    
    try {
        showProgress(true);
        
        // Clear local data
        currentDocuments = [];
        searchIndex = {};
        
        // TODO: Clear Firebase collections
        // Clear documents collection
        // Clear search index collection
        
        showProgress(false);
        showSuccess('Database cleared successfully');
        
        // Clear any displayed results
        const resultsDiv = document.getElementById('analysisResults');
        if (resultsDiv) {
            resultsDiv.remove();
        }
        
    } catch (error) {
        showProgress(false);
        showError('Error clearing database: ' + error.message);
        console.error('Database clear error:', error);
    }
}

// =====================================
// UTILITY FUNCTIONS
// =====================================

/**
 * Load stop words from StopWords.txt
 */
async function loadStopWords() {
    try {
        // For now, use a basic stop words array
        // TODO: Load from StopWords.txt file
        stopWords = [
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
            'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
            'before', 'after', 'above', 'below', 'between', 'among', 'is', 'are', 
            'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 
            'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can',
            'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
            'my', 'your', 'his', 'her', 'its', 'our', 'their', 'this', 'that', 'these', 'those'
        ];
        console.log('Stop words loaded:', stopWords.length);
    } catch (error) {
        console.error('Error loading stop words:', error);
        showError('Failed to load stop words');
    }
}

/**
 * Generate unique document ID
 * @returns {string} - Unique document ID
 */
function generateDocumentId() {
    return 'doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Calculate average word length
 * @param {Array} words - Array of words
 * @returns {number} - Average word length
 */
function calculateAverageWordLength(words) {
    if (words.length === 0) return 0;
    const totalLength = words.reduce((sum, word) => sum + word.length, 0);
    return totalLength / words.length;
}

/**
 * Show detailed analysis (placeholder for future feature)
 * @param {string} docId - Document ID
 */
function showDetailedAnalysis(docId) {
    const doc = currentDocuments.find(d => d.id === docId);
    if (!doc) {
        showError('Document not found');
        return;
    }
    
    alert(`Detailed analysis for "${doc.name}" - This feature will be implemented in Phase 2!\n\nCurrent data:\n- Words: ${doc.wordCount}\n- Language: ${doc.language}\n- Unique words: ${Object.keys(doc.wordFrequency).length}`);
}

/**
 * Download analysis report (placeholder for future feature)
 * @param {string} docId - Document ID
 */
function downloadAnalysis(docId) {
    const doc = currentDocuments.find(d => d.id === docId);
    if (!doc) {
        showError('Document not found');
        return;
    }
    
    // Create a simple text report
    const report = `TEXT ANALYSIS REPORT
====================
Document: ${doc.name}
Analyzed: ${doc.uploadDate.toLocaleString()}
Language: ${doc.language}
Total Words: ${doc.wordCount}
Unique Words: ${Object.keys(doc.wordFrequency).length}

TOP WORDS:
${Object.entries(doc.wordFrequency)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 20)
    .map(([word, count], index) => `${index + 1}. ${word}: ${count}`)
    .join('\n')}
`;
    
    // Download as text file
    const blob = new Blob([report], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analysis_${doc.name.replace('.txt', '')}_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showSuccess('Analysis report downloaded!');
}

/**
 * Show progress indicator
 * @param {boolean} show - Whether to show or hide progress
 */
function showProgress(show) {
    const progressDiv = document.getElementById('uploadProgress');
    if (progressDiv) {
        progressDiv.style.display = show ? 'block' : 'none';
        
        if (show) {
            // Update progress text to be more informative
            const percentageSpan = document.getElementById('uploadPercentage');
            const recordsSpan = document.getElementById('recordsUploaded');
            if (percentageSpan) percentageSpan.textContent = 'Processing...';
            if (recordsSpan) recordsSpan.textContent = 'Analyzing text';
        }
    }
    
    // Also show/hide loading overlay
    let loadingOverlay = document.getElementById('loadingOverlay');
    if (show && !loadingOverlay) {
        loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'loadingOverlay';
        loadingOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        `;
        loadingOverlay.innerHTML = `
            <div style="background: white; padding: 30px; border-radius: 10px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                <div class="loading-spinner"></div>
                <h3>Processing Document...</h3>
                <p>Analyzing text and detecting language</p>
            </div>
        `;
        document.body.appendChild(loadingOverlay);
    } else if (!show && loadingOverlay) {
        loadingOverlay.remove();
    }
}

/**
 * Show error message
 * @param {string} message - Error message to display
 */
function showError(message) {
    console.error(message);
    
    // Create or update error message div
    let errorDiv = document.getElementById('errorMessage');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = 'errorMessage';
        errorDiv.className = 'error';
        document.body.appendChild(errorDiv);
    }
    
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

/**
 * Show success message
 * @param {string} message - Success message to display
 */
function showSuccess(message) {
    console.log(message);
    
    // Create or update success message div
    let successDiv = document.getElementById('successMessage');
    if (!successDiv) {
        successDiv = document.createElement('div');
        successDiv.id = 'successMessage';
        successDiv.className = 'success';
        document.body.appendChild(successDiv);
    }
    
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        successDiv.style.display = 'none';
    }, 3000);
}

// =====================================
// FIREBASE HELPER FUNCTIONS
// =====================================

/**
 * Store document in Firebase
 * @param {Object} doc - Document to store
 */
async function storeDocument(doc) {
    if (!isFirebaseInitialized) {
        console.log('Firebase not initialized. Document stored locally only:', doc.name);
        // Store in local array for now
        currentDocuments.push(doc);
        return;
    }
    
    try {
        // Store main document data
        await db.collection('documents').doc(doc.id).set({
            name: doc.name,
            uploadDate: doc.uploadDate,
            wordCount: doc.wordCount,
            language: doc.language,
            originalContent: doc.originalContent,
            cleanedText: doc.cleanedText
        });
        
        // Store word frequency data
        await db.collection('wordFrequencies').doc(doc.id).set({
            documentId: doc.id,
            documentName: doc.name,
            frequencies: doc.wordFrequency
        });
        
        // Also store locally
        currentDocuments.push(doc);
        
        console.log('Document stored in Firebase successfully:', doc.name);
    } catch (error) {
        if (error.code === 'permission-denied') {
            console.warn('Firebase permission denied for writing. Storing locally only:', doc.name);
            // Store locally as fallback
            currentDocuments.push(doc);
        } else {
            console.error('Error storing document in Firebase:', error);
            // Still store locally even if Firebase fails
            currentDocuments.push(doc);
            throw error;
        }
    }
}

/**
 * Load existing documents from Firebase
 */
async function loadExistingDocuments() {
    if (!isFirebaseInitialized) {
        console.log('Firebase not initialized. Skipping document loading.');
        return;
    }
    
    try {
        // Test Firebase connection first with a simple read
        console.log('Testing Firebase connection...');
        const snapshot = await db.collection('documents').limit(1).get();
        
        if (snapshot.empty) {
            console.log('No documents found in Firebase (this is normal for new projects)');
            return;
        }
        
        // Load all documents if test was successful
        const allDocsSnapshot = await db.collection('documents').get();
        currentDocuments = [];
        
        allDocsSnapshot.forEach(doc => {
            currentDocuments.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log(`Loaded ${currentDocuments.length} documents from Firebase`);
    } catch (error) {
        if (error.code === 'permission-denied') {
            console.warn('Firebase permission denied. This is expected with secure rules. App will work in local mode.');
            console.warn('For development: You can temporarily allow access, but make sure to secure it for production.');
            showError('Firebase access restricted (this is normal for security). Working in offline mode.');
        } else {
            console.error('Error loading documents from Firebase:', error);
        }
        // Don't throw error - app should still work without Firebase
    }
}

// =====================================
// EXPORT FOR TESTING (if needed)
// =====================================
// Make functions globally accessible for HTML onclick handlers
window.uploadText = uploadText;
window.analyzeText = analyzeText;
window.clearDatabase = clearDatabase;
window.showDetailedAnalysis = showDetailedAnalysis;
window.downloadAnalysis = downloadAnalysis;

// For testing purposes, you can also access these
// window.TextReaderApp = {
//     cleanText,
//     tokenizeText,
//     detectLanguage,
//     processDocument
// };
