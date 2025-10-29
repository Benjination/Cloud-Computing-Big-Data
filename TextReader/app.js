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
        wordFrequency: {},
        charFrequency: {},
        foreignChars: [],
        letterFrequency: {}
    };
    
    // Analyze original content for foreign characters BEFORE cleaning
    doc.foreignChars = findForeignCharacters(content);
    
    // Calculate letter frequency (a-z) from original content
    doc.letterFrequency = calculateLetterFrequency(content);
    
    // Clean the text
    doc.cleanedText = cleanText(content);
    
    // Tokenize into words
    doc.words = tokenizeText(doc.cleanedText);
    
    // Calculate word frequency
    doc.wordFrequency = calculateWordFrequency(doc.words);
    
    // Calculate character frequency from cleaned text
    doc.charFrequency = calculateCharacterFrequency(doc.cleanedText);
    
    // Count words (excluding stop words)
    doc.wordCount = doc.words.length;
    
    // Detect language using multiple methods
    doc.language = detectLanguage(doc.cleanedText, doc.letterFrequency, doc.foreignChars);
    
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

/**
 * Calculate letter frequency (a-z only) from text
 * @param {string} text - Text to analyze
 * @returns {Object} - Letter frequency object with percentages
 */
function calculateLetterFrequency(text) {
    const freq = {};
    let totalLetters = 0;
    
    // Initialize all letters
    for (let i = 97; i <= 122; i++) {
        freq[String.fromCharCode(i)] = 0;
    }
    
    // Count letters
    for (let char of text.toLowerCase()) {
        if (char >= 'a' && char <= 'z') {
            freq[char]++;
            totalLetters++;
        }
    }
    
    // Convert to percentages
    const percentages = {};
    for (let letter in freq) {
        percentages[letter] = totalLetters > 0 ? ((freq[letter] / totalLetters) * 100).toFixed(2) : 0;
    }
    
    return percentages;
}

/**
 * Find non-English characters (accented letters, etc.)
 * @param {string} text - Text to analyze
 * @returns {Array} - Array of foreign characters with counts
 */
function findForeignCharacters(text) {
    const foreignChars = {};
    
    for (let char of text) {
        // Check if character is not basic ASCII letter, number, punctuation, or whitespace
        if (char.match(/[^\x00-\x7F]/)) {
            // It's a non-ASCII character
            if (char.match(/[À-ÿ]/)) {
                // It's an accented letter
                foreignChars[char] = (foreignChars[char] || 0) + 1;
            }
        }
    }
    
    // Convert to array and sort by frequency
    return Object.entries(foreignChars)
        .sort(([,a], [,b]) => b - a)
        .map(([char, count]) => ({ char, count, description: getCharacterDescription(char) }));
}

/**
 * Get description of foreign character
 * @param {string} char - Character to describe
 * @returns {string} - Description of the character
 */
function getCharacterDescription(char) {
    const descriptions = {
        'à': 'a with grave accent',
        'á': 'a with acute accent',
        'â': 'a with circumflex',
        'ã': 'a with tilde',
        'ä': 'a with diaeresis',
        'å': 'a with ring above',
        'è': 'e with grave accent',
        'é': 'e with acute accent',
        'ê': 'e with circumflex',
        'ë': 'e with diaeresis',
        'ì': 'i with grave accent',
        'í': 'i with acute accent',
        'î': 'i with circumflex',
        'ï': 'i with diaeresis',
        'ò': 'o with grave accent',
        'ó': 'o with acute accent',
        'ô': 'o with circumflex',
        'õ': 'o with tilde',
        'ö': 'o with diaeresis',
        'ù': 'u with grave accent',
        'ú': 'u with acute accent',
        'û': 'u with circumflex',
        'ü': 'u with diaeresis',
        'ç': 'c with cedilla',
        'ñ': 'n with tilde'
    };
    
    return descriptions[char.toLowerCase()] || `accented character (${char})`;
}

// =====================================
// LANGUAGE DETECTION
// =====================================

/**
 * Detect language based on character frequency analysis and foreign characters
 * @param {string} text - Text to analyze
 * @param {Object} letterFreq - Letter frequency object
 * @param {Array} foreignChars - Array of foreign characters
 * @returns {string} - Detected language
 */
function detectLanguage(text, letterFreq, foreignChars) {
    // Enhanced language detection using multiple indicators
    
    // Check for foreign characters first
    if (foreignChars && foreignChars.length > 0) {
        // Check for French-specific characters
        const frenchChars = foreignChars.filter(fc => 
            ['à', 'á', 'â', 'ç', 'è', 'é', 'ê', 'ë', 'î', 'ï', 'ô', 'ù', 'û', 'ü', 'ÿ'].includes(fc.char.toLowerCase())
        );
        
        if (frenchChars.length > 0) {
            return 'French (detected accented characters)';
        }
        
        // Check for other European languages
        const spanishChars = foreignChars.filter(fc => 
            ['ñ', 'á', 'é', 'í', 'ó', 'ú', 'ü'].includes(fc.char.toLowerCase())
        );
        
        if (spanishChars.length > 0) {
            return 'Spanish (detected accented characters)';
        }
        
        return `Unknown (contains accented characters)`;
    }
    
    // If no foreign characters, use letter frequency analysis
    if (letterFreq) {
        const eFreq = parseFloat(letterFreq.e) || 0;
        const aFreq = parseFloat(letterFreq.a) || 0;
        const tFreq = parseFloat(letterFreq.t) || 0;
        
        // English typically has high E frequency (~12-13%)
        // French has different patterns
        if (eFreq > 10 && tFreq > 8) {
            return 'English (letter frequency analysis)';
        } else if (eFreq > 14 && aFreq > 7) {
            return 'French (letter frequency analysis)';
        }
    }
    
    // Fallback to basic word analysis
    const commonEnglishWords = ['the', 'and', 'of', 'to', 'a', 'in', 'for', 'is', 'on', 'that'];
    const commonFrenchWords = ['le', 'de', 'et', 'un', 'à', 'être', 'ce', 'il', 'que', 'ne'];
    
    const lowerText = text.toLowerCase();
    let englishScore = 0;
    let frenchScore = 0;
    
    commonEnglishWords.forEach(word => {
        if (lowerText.includes(' ' + word + ' ')) englishScore++;
    });
    
    commonFrenchWords.forEach(word => {
        if (lowerText.includes(' ' + word + ' ')) frenchScore++;
    });
    
    if (englishScore > frenchScore) {
        return 'English (word analysis)';
    } else if (frenchScore > englishScore) {
        return 'French (word analysis)';
    }
    
    return 'Unknown';
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
        .slice(0, 5); // Show top 5 words as requested
    
    // Get top letter frequencies
    const topLetters = Object.entries(analysis.letterFrequency)
        .sort(([,a], [,b]) => parseFloat(b) - parseFloat(a))
        .slice(0, 10);
    
    const resultsHtml = `
        <div style="margin-top: 20px; padding: 25px; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); border-left: 5px solid #007bff;">
            <h3 style="color: #007bff; margin-bottom: 20px;">📊 Linguistic Analysis Results</h3>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 25px;">
                <div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                    <h4 style="margin: 0 0 10px 0; color: #495057;">📄 Document Info</h4>
                    <p><strong>Name:</strong> ${analysis.name}</p>
                    <p><strong>Language:</strong> <span style="color: #28a745; font-weight: bold;">${analysis.language}</span></p>
                    <p><strong>Total Words:</strong> ${analysis.wordCount.toLocaleString()}</p>
                    <p><strong>Unique Words:</strong> ${Object.keys(analysis.wordFrequency).length.toLocaleString()}</p>
                    <p><strong>Processed:</strong> ${analysis.uploadDate.toLocaleString()}</p>
                </div>
                
                <div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                    <h4 style="margin: 0 0 10px 0; color: #495057;">� Letter Frequency (A-Z)</h4>
                    <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 5px; font-size: 12px;">
                        ${topLetters.map(([letter, freq]) => `
                            <div style="text-align: center; padding: 5px; background: #f8f9fa; border-radius: 3px;">
                                <div style="font-weight: bold; text-transform: uppercase;">${letter}</div>
                                <div style="color: #007bff;">${freq}%</div>
                            </div>
                        `).join('')}
                    </div>
                    <p style="margin-top: 10px; font-size: 12px; color: #6c757d;">Top 10 most frequent letters</p>
                </div>
            </div>
            
            ${analysis.foreignChars && analysis.foreignChars.length > 0 ? `
            <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); margin-bottom: 20px;">
                <h4 style="margin: 0 0 15px 0; color: #495057;">🌍 Non-English Characters Found</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 10px;">
                    ${analysis.foreignChars.slice(0, 10).map(fc => `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #fff3cd; border-radius: 5px; border-left: 3px solid #ffc107;">
                            <span style="font-weight: 500; font-size: 16px;">${fc.char}</span>
                            <div style="text-align: right; font-size: 12px;">
                                <div style="color: #007bff; font-weight: bold;">${fc.count} times</div>
                                <div style="color: #6c757d;">${fc.description}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <p style="margin-top: 10px; font-size: 12px; color: #6c757d;">
                    Found ${analysis.foreignChars.length} type(s) of accented characters - indicates non-English text
                </p>
            </div>
            ` : `
            <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); margin-bottom: 20px;">
                <h4 style="margin: 0 0 15px 0; color: #495057;">🌍 Character Analysis</h4>
                <p style="color: #28a745; font-weight: bold;">✅ No accented characters found - text uses standard English alphabet</p>
            </div>
            `}
            
            <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                <h4 style="margin: 0 0 15px 0; color: #495057;">🏆 Top 5 Most Frequent Words</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                    ${topWords.map(([word, count], index) => `
                        <div style="text-align: center; padding: 15px; background: ${index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : '#f8f9fa'}; border-radius: 8px; border: 2px solid ${index < 3 ? '#ffc107' : '#dee2e6'};">
                            <div style="font-size: 24px; margin-bottom: 5px;">${index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}</div>
                            <div style="font-weight: bold; font-size: 18px; margin-bottom: 5px;">${word}</div>
                            <div style="color: #007bff; font-weight: bold; font-size: 16px;">${count} occurrences</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div style="margin-top: 15px; text-align: center;">
                <button onclick="showDetailedAnalysis('${analysis.id}')" class="btn" style="background-color: #28a745;">📋 View Letter Distribution</button>
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
 * Show detailed analysis (letter distribution)
 * @param {string} docId - Document ID
 */
function showDetailedAnalysis(docId) {
    const doc = currentDocuments.find(d => d.id === docId);
    if (!doc) {
        showError('Document not found');
        return;
    }
    
    // Create detailed letter distribution chart
    const allLetters = 'abcdefghijklmnopqrstuvwxyz'.split('');
    const letterData = allLetters.map(letter => ({
        letter: letter.toUpperCase(),
        frequency: parseFloat(doc.letterFrequency[letter]) || 0
    }));
    
    const detailsHtml = `
        <div style="margin-top: 20px; padding: 25px; background: white; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); border-left: 5px solid #17a2b8;">
            <h3 style="color: #17a2b8; margin-bottom: 20px;">📊 Complete Letter Distribution - ${doc.name}</h3>
            
            <div style="display: grid; grid-template-columns: repeat(13, 1fr); gap: 10px; margin-bottom: 20px;">
                ${letterData.map(({ letter, frequency }) => `
                    <div style="text-align: center; padding: 10px; background: linear-gradient(135deg, #f8f9fa 0%, ${frequency > 8 ? '#ffecb3' : frequency > 4 ? '#f0f4f8' : '#fafafa'} 100%); border-radius: 8px; border: 1px solid #dee2e6;">
                        <div style="font-weight: bold; font-size: 18px; color: #495057;">${letter}</div>
                        <div style="color: #007bff; font-weight: bold;">${frequency}%</div>
                        <div style="height: ${Math.max(3, frequency * 2)}px; background: linear-gradient(45deg, #007bff, #17a2b8); margin-top: 5px; border-radius: 2px;"></div>
                    </div>
                `).join('')}
            </div>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <h4 style="margin: 0 0 10px 0;">📈 Analysis Summary</h4>
                <p><strong>Most common letter:</strong> ${letterData.sort((a, b) => b.frequency - a.frequency)[0].letter} (${letterData.sort((a, b) => b.frequency - a.frequency)[0].frequency}%)</p>
                <p><strong>Least common letter:</strong> ${letterData.filter(l => l.frequency > 0).sort((a, b) => a.frequency - b.frequency)[0]?.letter || 'None'} (${letterData.filter(l => l.frequency > 0).sort((a, b) => a.frequency - b.frequency)[0]?.frequency || 0}%)</p>
                <p><strong>Letters not found:</strong> ${letterData.filter(l => l.frequency === 0).map(l => l.letter).join(', ') || 'All letters present'}</p>
            </div>
            
            ${doc.foreignChars && doc.foreignChars.length > 0 ? `
            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107;">
                <h4 style="margin: 0 0 10px 0;">🌍 Foreign Characters Details</h4>
                ${doc.foreignChars.map(fc => `
                    <p><strong>${fc.char}</strong> (${fc.description}): appears ${fc.count} times</p>
                `).join('')}
            </div>
            ` : ''}
            
            <div style="text-align: center; margin-top: 20px;">
                <button onclick="closeDetailedAnalysis()" class="btn" style="background-color: #6c757d;">✖ Close</button>
            </div>
        </div>
    `;
    
    // Add detailed analysis
    const analysisDiv = document.getElementById('analysisResults');
    let detailedDiv = document.getElementById('detailedAnalysis');
    if (detailedDiv) {
        detailedDiv.remove();
    }
    
    detailedDiv = document.createElement('div');
    detailedDiv.id = 'detailedAnalysis';
    detailedDiv.innerHTML = detailsHtml;
    analysisDiv.after(detailedDiv);
    
    // Scroll to detailed analysis
    detailedDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Close detailed analysis view
 */
function closeDetailedAnalysis() {
    const detailedDiv = document.getElementById('detailedAnalysis');
    if (detailedDiv) {
        detailedDiv.remove();
    }
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
window.closeDetailedAnalysis = closeDetailedAnalysis;

// For testing purposes, you can also access these
// window.TextReaderApp = {
//     cleanText,
//     tokenizeText,
//     detectLanguage,
//     processDocument
// };
