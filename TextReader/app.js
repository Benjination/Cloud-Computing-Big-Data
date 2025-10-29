// app.js - Text Reader Backend Logic
// Firebase configuration and text processing functionality

// Add debugging to ensure JavaScript loads
console.log('TextReader app.js loaded successfully');

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
let stopWords = []; // English stop words (default)
let frenchStopWords = [];
let spanishStopWords = [];

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
        
        // Load and display stored files (this will also load documents internally)
        await loadStoredFiles();
        
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

/**
 * Check if a file with the given name already exists
 * @param {string} fileName - Name of the file to check
 * @returns {Promise<boolean>} - True if file exists, false otherwise
 */
async function checkFileExists(fileName) {
    if (!isFirebaseInitialized) {
        // Check local documents if Firebase is not available
        return currentDocuments.some(doc => doc.name === fileName);
    }
    
    try {
        // Query Firebase for documents with this exact name
        const snapshot = await db.collection('documents')
            .where('name', '==', fileName)
            .limit(1)
            .get();
        
        const exists = !snapshot.empty;
        console.log(`File "${fileName}" exists check: ${exists}`);
        return exists;
        
    } catch (error) {
        console.error('Error checking if file exists:', error);
        // If there's an error, assume file doesn't exist to allow upload
        return false;
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
        
        // Check if file already exists
        const fileExists = await checkFileExists(file.name);
        if (fileExists) {
            showProgress(false);
            showError(`File "${file.name}" already exists. Please rename the file or remove the existing one first.`);
            return;
        }
        
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
        
        // Display the analysis results immediately
        displayAnalysisResults(processedDoc);
        
        // Refresh the file list to show the new upload
        await loadStoredFiles();
        
        fileInput.value = ''; // Clear file input
        
    } catch (error) {
        showProgress(false);
        
        // Check if this is a garbage file error that should use the modal
        if (error.message && error.message.includes('Garbage file detected:')) {
            // Extract the detailed reason from the error message
            const reason = error.message.replace('Garbage file detected: ', '');
            
            // Format the message for the modal
            const modalMessage = `
                <p><strong>The file you uploaded cannot be processed:</strong></p>
                <p style="margin: 15px 0; padding: 15px; background-color: #f8f9fa; border-left: 4px solid #dc3545; border-radius: 4px;">
                    ${reason}
                </p>
                <p><strong>What to do:</strong></p>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>If this is a PDF file, use a PDF-to-text converter first</li>
                    <li>If this is a Word document, save it as a plain text (.txt) file</li>
                    <li>Make sure the file contains readable text content</li>
                    <li>Check that the file is not corrupted or in an unsupported format</li>
                </ul>
            `;
            
            showErrorModal(modalMessage);
        } else {
            // Use regular error display for other errors
            showError('Error uploading file: ' + error.message);
        }
        
        console.error('Upload error:', error);
    }
}

/**
 * Load a sample file from the server
 * @param {string} filename - Name of the sample file to load
 * @param {string} displayName - Display name for the file
 */
async function loadSampleFile(filename, displayName) {
    try {
        showProgress(true);
        
        // Fetch the sample file content
        const response = await fetch(filename);
        if (!response.ok) {
            throw new Error(`Failed to load ${filename}: ${response.statusText}`);
        }
        
        const content = await response.text();
        
        // Process the text using the display name (but don't store in Firebase)
        const processedDoc = await processDocument(displayName, content);
        
        // Note: We don't store sample files in Firebase since they're static server files
        // await storeDocument(processedDoc);  // REMOVED
        // await updateSearchIndex(processedDoc);  // REMOVED
        
        showProgress(false);
        showSuccess(`Successfully analyzed ${displayName} (sample file - not stored in database)`);
        
        // Display the analysis results immediately
        displayAnalysisResults(processedDoc);
        
        // No need to refresh file list since sample files aren't stored
        
    } catch (error) {
        showProgress(false);
        showError('Error loading sample file: ' + error.message);
        console.error('Sample file load error:', error);
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
 * Detect if a file appears to be corrupted, binary, or garbage data
 * @param {string} content - File content to analyze
 * @returns {Object} - {isGarbage: boolean, reason: string}
 */
function detectGarbageFile(content) {
    // Check for common signs of binary/corrupted files
    
    // 1. Check for PDF signatures
    if (content.includes('%PDF') || content.includes('%%EOF')) {
        return {
            isGarbage: true,
            reason: 'This appears to be a PDF file. PDF files cannot be directly converted to .txt format. Please use a proper PDF-to-text converter or save the content as plain text.'
        };
    }
    
    // 2. Check for other binary file signatures
    const binarySignatures = [
        'PK\x03\x04', // ZIP files
        '\x89PNG', // PNG files
        '\xFF\xD8\xFF', // JPEG files
        'GIF8', // GIF files
        '\x00\x00\x01\x00', // ICO files
        'RIFF', // WAV files
        '\x1f\x8b\x08', // GZIP files
        '\x50\x4b\x03\x04', // ZIP files (hex)
    ];
    
    for (const signature of binarySignatures) {
        if (content.includes(signature)) {
            return {
                isGarbage: true,
                reason: 'This appears to be a binary file (image, archive, etc.) disguised as text. Binary files cannot be processed as text documents.'
            };
        }
    }
    
    // 3. Check for excessive non-printable characters
    const totalChars = content.length;
    if (totalChars === 0) {
        return {
            isGarbage: true,
            reason: 'The file appears to be empty.'
        };
    }
    
    let nonPrintableCount = 0;
    let nullByteCount = 0;
    
    for (let i = 0; i < content.length; i++) {
        const charCode = content.charCodeAt(i);
        
        // Count null bytes (strong indicator of binary data)
        if (charCode === 0) {
            nullByteCount++;
        }
        
        // Count non-printable characters (excluding common whitespace)
        if (charCode < 32 && charCode !== 9 && charCode !== 10 && charCode !== 13) {
            nonPrintableCount++;
        }
    }
    
    // If more than 1% of characters are null bytes, it's likely binary
    if (nullByteCount > totalChars * 0.01) {
        return {
            isGarbage: true,
            reason: 'This file contains null bytes and appears to be binary data. Please ensure you are uploading a plain text (.txt) file.'
        };
    }
    
    // If more than 5% of characters are non-printable, it's likely corrupted/binary
    if (nonPrintableCount > totalChars * 0.05) {
        return {
            isGarbage: true,
            reason: 'This file contains excessive non-printable characters and may be corrupted or in an unsupported format.'
        };
    }
    
    // 4. Check for realistic text patterns
    const words = content.split(/\s+/).filter(word => word.length > 0);
    
    if (words.length === 0) {
        return {
            isGarbage: true,
            reason: 'The file does not contain recognizable words or text.'
        };
    }
    
    // Check if most "words" are just random characters
    let validWordCount = 0;
    for (const word of words.slice(0, 100)) { // Check first 100 words
        // A valid word should have mostly letters and be reasonable length
        const letterCount = (word.match(/[a-zA-ZÀ-ÿ]/g) || []).length;
        if (letterCount > word.length * 0.7 && word.length > 1 && word.length < 50) {
            validWordCount++;
        }
    }
    
    const wordSampleSize = Math.min(100, words.length);
    if (validWordCount < wordSampleSize * 0.3) {
        return {
            isGarbage: true,
            reason: 'The file does not contain enough recognizable words. It may be corrupted, encoded incorrectly, or not a text document.'
        };
    }
    
    return { isGarbage: false, reason: '' };
}

/**
 * Process document content - clean, tokenize, and analyze
 * @param {string} filename - Name of the document
 * @param {string} content - Raw text content
 * @returns {Object} - Processed document object
 */
async function processDocument(filename, content) {
    // First, check if this is a garbage/binary file
    const garbageCheck = detectGarbageFile(content);
    if (garbageCheck.isGarbage) {
        throw new Error(`Garbage file detected: ${garbageCheck.reason}`);
    }
    
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
    
    // Detect language FIRST using multiple methods
    doc.language = detectLanguage(doc.cleanedText, doc.letterFrequency, doc.foreignChars);
    
    // Tokenize into words using language-specific stop words
    doc.words = tokenizeText(doc.cleanedText, doc.language);
    
    // Calculate word frequency
    doc.wordFrequency = calculateWordFrequency(doc.words);
    
    // Calculate character frequency from cleaned text
    doc.charFrequency = calculateCharacterFrequency(doc.cleanedText);
    
    // Count words (excluding stop words)
    doc.wordCount = doc.words.length;
    
    console.log(`Processed document: ${filename}, Words: ${doc.wordCount}, Language: ${doc.language}`);
    return doc;
}

/**
 * Clean text by removing non-ASCII, converting to lowercase, removing punctuation and numbers
 * @param {string} text - Raw text to clean
 * @returns {string} - Cleaned text
 */
function cleanText(text) {
    return text
        .replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII
        .toLowerCase() // Convert to lowercase
        .replace(/\d/g, ' ') // Remove all digits/numbers
        .replace(/[^a-z\s]/g, ' ') // Remove punctuation and any remaining non-letter characters
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .trim(); // Remove leading/trailing whitespace
}

/**
 * Tokenize text into words, removing language-specific stop words
 * @param {string} text - Cleaned text to tokenize
 * @param {string} language - Detected language to determine which stop words to use
 * @returns {Array} - Array of words
 */
function tokenizeText(text, language = 'English') {
    const allWords = text.split(/\s+/).filter(word => word.length > 1);
    
    // Select appropriate stop words based on detected language
    let currentStopWords = stopWords; // Default to English
    if (language.toLowerCase().includes('french')) {
        currentStopWords = frenchStopWords;
    } else if (language.toLowerCase().includes('spanish')) {
        currentStopWords = spanishStopWords;
    }
    
    // Debug: log some info about stop words
    console.log('=== TOKENIZE DEBUG ===');
    console.log('Detected language:', language);
    console.log('Using stop words for:', language.toLowerCase().includes('french') ? 'French' : 
                                         language.toLowerCase().includes('spanish') ? 'Spanish' : 'English');
    console.log('Total words before filtering:', allWords.length);
    console.log('Stop words array length:', currentStopWords.length);
    console.log('First 10 stop words:', currentStopWords.slice(0, 10));
    console.log('Sample words from text:', allWords.slice(0, 10));
    
    // Test a few specific stop words
    const testWords = language.toLowerCase().includes('french') ? ['le', 'de', 'et', 'un', 'à'] :
                      language.toLowerCase().includes('spanish') ? ['el', 'de', 'que', 'y', 'a'] :
                      ['the', 'and', 'in', 'to', 'is'];
    testWords.forEach(word => {
        console.log(`Stop word "${word}" is in stopWords array: ${currentStopWords.includes(word)}`);
    });
    
    const filteredWords = allWords.filter(word => {
        const wordLower = word.toLowerCase();
        const isStopWord = currentStopWords.includes(wordLower);
        
        // Log first few words for debugging
        if (allWords.indexOf(word) < 10) {
            console.log(`Word "${word}" → "${wordLower}" → isStopWord: ${isStopWord} → ${isStopWord ? 'REMOVED' : 'KEPT'}`);
        }
        
        return !isStopWord; // Keep words that are NOT stop words
    });
    
    console.log('Words after stop word filtering:', filteredWords.length);
    console.log('First 10 filtered words:', filteredWords.slice(0, 10));
    console.log('=== END TOKENIZE DEBUG ===');
    
    return filteredWords;
}

/**
 * Calculate word frequency in document
 * @param {Array} words - Array of words
 * @returns {Object} - Word frequency object
 */
function calculateWordFrequency(words) {
    console.log('=== WORD FREQUENCY DEBUG ===');
    console.log('Words array length:', words.length);
    console.log('First 10 words for frequency calculation:', words.slice(0, 10));
    
    const frequency = {};
    words.forEach(word => {
        frequency[word] = (frequency[word] || 0) + 1;
    });
    
    // Show top 10 most frequent words
    const topWords = Object.entries(frequency)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);
    
    console.log('Top 10 most frequent words:', topWords);
    console.log('=== END WORD FREQUENCY DEBUG ===');
    
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
    // Enhanced language detection using letter frequency as primary method
    console.log('Starting language detection...');
    
    // Use letter frequency analysis as primary detection method
    if (letterFreq) {
        const eFreq = parseFloat(letterFreq.e) || 0;
        const aFreq = parseFloat(letterFreq.a) || 0;
        const tFreq = parseFloat(letterFreq.t) || 0;
        const oFreq = parseFloat(letterFreq.o) || 0;
        const rFreq = parseFloat(letterFreq.r) || 0;
        const nFreq = parseFloat(letterFreq.n) || 0;
        const iFreq = parseFloat(letterFreq.i) || 0;
        const sFreq = parseFloat(letterFreq.s) || 0;
        
        console.log('Letter frequencies:');
        console.log(`E: ${eFreq}%, A: ${aFreq}%, T: ${tFreq}%, O: ${oFreq}%`);
        console.log(`R: ${rFreq}%, N: ${nFreq}%, I: ${iFreq}%, S: ${sFreq}%`);
        
        // More sophisticated frequency analysis based on linguistic research
        
        // French characteristics:
        // - Very high E frequency (14-17%)
        // - Moderate A frequency (7-8.5%)
        // - Lower T frequency compared to English
        // - High R frequency (6-7%)
        if (eFreq > 13.5 && aFreq > 7 && aFreq < 9.5 && rFreq > 5.5) {
            console.log('French pattern detected: High E, moderate A, good R frequency');
            return 'French';
        }
        
        // English characteristics:
        // - High E frequency (12-13%)
        // - High T frequency (9-10%)
        // - Moderate A frequency (8-9%)
        // - Lower R frequency than French
        if (eFreq > 11 && eFreq < 14 && tFreq > 8.5 && aFreq > 7.5 && aFreq < 9.5) {
            console.log('English pattern detected: High E and T, moderate A');
            return 'English';
        }
        
        // Spanish characteristics:
        // - High A frequency (11-13%)
        // - High O frequency (8.5-10%)
        // - High E frequency but less than French (12-14%)
        // - High S frequency (7-8%)
        if (aFreq > 10.5 && oFreq > 7.5 && sFreq > 6.5) {
            console.log('Spanish pattern detected: High A, O, and S frequencies');
            return 'Spanish';
        }
        
        console.log('No clear letter frequency pattern matched - proceeding to character analysis...');
    }
    
    // Secondary check: Look for unique characters only if frequency analysis is unclear
    if (foreignChars && foreignChars.length > 0) {
        console.log('Foreign characters found:', foreignChars.map(fc => fc.char).join(', '));
        
        // Check for uniquely Spanish characters (ñ)
        const spanishUniqueCount = foreignChars
            .filter(fc => ['ñ'].includes(fc.char.toLowerCase()))
            .reduce((sum, fc) => sum + fc.count, 0);
        
        if (spanishUniqueCount >= 10) {
            console.log(`Found ${spanishUniqueCount} ñ characters - definitely Spanish`);
            return 'Spanish';
        }
        
        // Check for French-heavy characters (these appear much more in French than Spanish)
        const frenchHeavyCount = foreignChars
            .filter(fc => ['ç', 'è', 'ê', 'ë', 'à', 'â', 'ù', 'û', 'ÿ'].includes(fc.char.toLowerCase()))
            .reduce((sum, fc) => sum + fc.count, 0);
        
        if (frenchHeavyCount >= 10) {
            console.log(`Found ${frenchHeavyCount} French-heavy characters - definitely French`);
            return 'French';
        }
        
        // If we have some special characters but not enough for high confidence
        if (spanishUniqueCount > 0 || frenchHeavyCount > 0) {
            console.log(`Found some special characters (Spanish: ${spanishUniqueCount}, French: ${frenchHeavyCount}) but below confidence threshold of 10`);
        }
    }
    
    // Fallback to basic word analysis
    console.log('Performing word analysis...');
    const commonEnglishWords = ['the', 'and', 'of', 'to', 'a', 'in', 'for', 'is', 'on', 'that'];
    const commonFrenchWords = ['le', 'de', 'et', 'un', 'à', 'être', 'ce', 'il', 'que', 'ne'];
    const commonSpanishWords = ['el', 'de', 'que', 'y', 'a', 'en', 'un', 'es', 'se', 'no', 'te', 'lo', 'le', 'da', 'su', 'por', 'son', 'con', 'para', 'al'];
    
    const lowerText = text.toLowerCase();
    let englishScore = 0;
    let frenchScore = 0;
    let spanishScore = 0;
    
    // Count exact word matches (with word boundaries)
    commonEnglishWords.forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'g');
        const matches = (lowerText.match(regex) || []).length;
        englishScore += matches;
    });
    
    commonFrenchWords.forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'g');
        const matches = (lowerText.match(regex) || []).length;
        frenchScore += matches;
    });
    
    commonSpanishWords.forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'g');
        const matches = (lowerText.match(regex) || []).length;
        spanishScore += matches;
    });
    
    console.log('Word analysis scores:');
    console.log('- English:', englishScore);
    console.log('- French:', frenchScore);
    console.log('- Spanish:', spanishScore);
    
    // Require significant confidence for language detection
    const minScore = 3; // Require at least 3 common words found
    const confidenceMargin = 2; // Winner must beat second place by at least 2 points
    
    const maxScore = Math.max(englishScore, frenchScore, spanishScore);
    
    // Check if we have enough evidence and a clear winner
    if (maxScore >= minScore) {
        if (englishScore === maxScore && englishScore >= frenchScore + confidenceMargin && englishScore >= spanishScore + confidenceMargin) {
            return 'English';
        } else if (frenchScore === maxScore && frenchScore >= englishScore + confidenceMargin && frenchScore >= spanishScore + confidenceMargin) {
            return 'French';
        } else if (spanishScore === maxScore && spanishScore >= englishScore + confidenceMargin && spanishScore >= frenchScore + confidenceMargin) {
            return 'Spanish';
        }
    }
    
    // If we reach here, we don't have enough confidence
    console.log('Language detection failed: insufficient evidence or too close to call');
    
    // Check if there are foreign characters that suggest corruption
    if (foreignChars && foreignChars.length > 0) {
        const totalForeignChars = foreignChars.reduce((sum, fc) => sum + fc.count, 0);
        if (totalForeignChars > text.length * 0.1) { // More than 10% foreign chars
            return 'Language cannot be detected - possible file corruption or unsupported encoding';
        } else {
            return 'Language cannot be detected - insufficient linguistic patterns';
        }
    }
    
    return 'Language cannot be detected - insufficient linguistic patterns';
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
    console.log('=== DISPLAY ANALYSIS DEBUG ===');
    console.log('Analysis object keys:', Object.keys(analysis));
    console.log('Word frequency object:', analysis.wordFrequency);
    
    const topWords = Object.entries(analysis.wordFrequency)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5); // Show top 5 words as requested
    
    console.log('Top 5 words for display:', topWords);
    console.log('=== END DISPLAY ANALYSIS DEBUG ===');
    
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
        
        if (isFirebaseInitialized) {
            // Clear all Firebase collections
            const collections = ['documents', 'wordFrequencies', 'letterFrequencies', 'foreignCharacters', 'searchIndex'];
            
            for (const collectionName of collections) {
                const snapshot = await db.collection(collectionName).get();
                const batch = db.batch();
                
                snapshot.docs.forEach(doc => {
                    batch.delete(doc.ref);
                });
                
                if (!snapshot.empty) {
                    await batch.commit();
                }
            }
        }
        
        showProgress(false);
        showSuccess('Database cleared successfully');
        
        // Clear any displayed results
        const resultsDiv = document.getElementById('analysisResults');
        if (resultsDiv) {
            resultsDiv.remove();
        }
        
        // Refresh the file list
        await loadStoredFiles();
        
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
 * Load stop words for all supported languages
 */
async function loadStopWords() {
    try {
        console.log('Loading comprehensive stop words for all languages...');
        
        // English stop words
        stopWords = [
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
            'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
            'before', 'after', 'above', 'below', 'between', 'among', 'is', 'are', 
            'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 
            'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can',
            'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
            'my', 'your', 'his', 'her', 'its', 'our', 'their', 'this', 'that', 'these', 'those',
            'textbf', 'so', 'than', 'too', 'very', 'myself', 'ourselves', 'yours', 'yourself',
            'yourselves', 'himself', 'herself', 'itself', 'themselves', 'what', 'which', 'who',
            'whom', 'am', 'having', 'doing', 'ought', 'further', 'then', 'once', 'here', 'there',
            'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most',
            'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'down', 'out',
            'off', 'over', 'under', 'again', 'ours', 'against', 'as', 'until', 'while', 'same',
            'if', 'because', 'now', 'since', 'just', 'even', 'also', 'still', 'already', 'yet',
            'never', 'always', 'sometimes', 'often', 'usually', 'really', 'actually', 'quite',
            'rather', 'pretty', 'enough', 'almost', 'nearly', 'little', 'much', 'many', 'long',
            'short', 'old', 'new', 'good', 'bad', 'big', 'small', 'high', 'low', 'right', 'left',
            'first', 'last', 'next', 'previous', 'another', 'every', 'each', 'either', 'neither',
            'both', 'one', 'two', 'three', 'way', 'back', 'come', 'came', 'get', 'got', 'go',
            'went', 'see', 'saw', 'know', 'knew', 'think', 'thought', 'say', 'said', 'take',
            'took', 'give', 'gave', 'make', 'made', 'look', 'looked', 'use', 'used', 'find',
            'found', 'want', 'wanted', 'work', 'worked', 'call', 'called', 'try', 'tried'
        ];
        
        // French stop words
        frenchStopWords = [
            'le', 'de', 'et', 'à', 'un', 'il', 'être', 'et', 'en', 'avoir', 'que', 'pour',
            'dans', 'ce', 'son', 'une', 'sur', 'avec', 'ne', 'se', 'pas', 'tout', 'plus',
            'par', 'grand', 'en', 'une', 'être', 'et', 'en', 'avoir', 'que', 'pour', 'dans',
            'ce', 'son', 'sur', 'avec', 'ne', 'se', 'pas', 'tout', 'plus', 'par', 'grand',
            'en', 'une', 'être', 'et', 'en', 'avoir', 'que', 'pour', 'dans', 'ce', 'son',
            'la', 'des', 'les', 'du', 'est', 'un', 'pour', 'sont', 'se', 'le', 'avec',
            'te', 'si', 'lui', 'nous', 'ou', 'elle', 'mais', 'où', 'donc', 'très', 'sans',
            'être', 'avoir', 'faire', 'aller', 'pouvoir', 'voir', 'en', 'dire', 'me', 'donner',
            'tout', 'rien', 'bien', 'autre', 'après', 'long', 'ici', 'tous', 'pendant',
            'matin', 'trop', 'je', 'tu', 'vous', 'nos', 'vos', 'ses', 'ces', 'cette',
            'cet', 'mon', 'ton', 'sa', 'ma', 'ta', 'notre', 'votre', 'leur', 'leurs'
        ];
        
        // Spanish stop words
        spanishStopWords = [
            'el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'ser', 'se', 'no', 'te', 'lo',
            'le', 'da', 'su', 'por', 'son', 'con', 'para', 'al', 'del', 'los', 'las', 'una',
            'es', 'está', 'como', 'me', 'si', 'sin', 'sobre', 'este', 'ya', 'entre', 'cuando',
            'todo', 'esta', 'ser', 'son', 'dos', 'también', 'fue', 'había', 'era', 'muy',
            'años', 'hasta', 'desde', 'está', 'estaba', 'estamos', 'pueden', 'hubo', 'hay',
            'han', 'he', 'has', 'había', 'habían', 'tener', 'tiene', 'tenía', 'tengo',
            'pero', 'por', 'qué', 'porque', 'o', 'u', 'yo', 'tú', 'él', 'ella', 'nosotros',
            'vosotros', 'ellos', 'ellas', 'mi', 'mis', 'tu', 'tus', 'sus', 'nuestro',
            'nuestra', 'nuestros', 'nuestras', 'vuestro', 'vuestra', 'vuestros', 'vuestras',
            'este', 'esta', 'estos', 'estas', 'ese', 'esa', 'esos', 'esas', 'aquel',
            'aquella', 'aquellos', 'aquellas', 'ser', 'estar', 'tener', 'hacer', 'poder',
            'decir', 'ir', 'ver', 'dar', 'saber', 'querer', 'llegar', 'pasar', 'deber',
            'poner', 'parecer', 'quedar', 'creer', 'hablar', 'llevar', 'dejar', 'seguir',
            'encontrar', 'llamar', 'venir', 'pensar', 'salir', 'volver', 'tomar', 'conocer',
            'vivir', 'sentir', 'tratar', 'mirar', 'contar', 'empezar', 'esperar', 'buscar',
            'existir', 'entrar', 'trabajar', 'escribir', 'perder', 'producir', 'ocurrir'
        ];
        
        console.log('Stop words loaded:');
        console.log('- English:', stopWords.length);
        console.log('- French:', frenchStopWords.length);
        console.log('- Spanish:', spanishStopWords.length);
        
        // Verify common stop words are included for each language
        console.log('\nVerifying stop words:');
        
        // English verification
        const commonEnglishWords = ['the', 'and', 'in', 'to', 'is', 'at', 'of', 'for'];
        console.log('English stop words:');
        commonEnglishWords.forEach(word => {
            const included = stopWords.includes(word);
            console.log(`  "${word}" included: ${included}`);
        });
        
        // French verification
        const commonFrenchWords = ['le', 'de', 'et', 'un', 'à', 'être', 'ce', 'il'];
        console.log('French stop words:');
        commonFrenchWords.forEach(word => {
            const included = frenchStopWords.includes(word);
            console.log(`  "${word}" included: ${included}`);
        });
        
        // Spanish verification
        const commonSpanishWords = ['el', 'de', 'que', 'y', 'a', 'en', 'un', 'es'];
        console.log('Spanish stop words:');
        commonSpanishWords.forEach(word => {
            const included = spanishStopWords.includes(word);
            console.log(`  "${word}" included: ${included}`);
        });
        
    } catch (error) {
        console.error('Error in loadStopWords:', error);
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

/**
 * Show error modal for garbage files and other critical errors
 * @param {string} message - Error message to display
 */
function showErrorModal(message) {
    console.error('Modal Error:', message);
    
    const modal = document.getElementById('errorModal');
    const messageContainer = document.getElementById('modalErrorMessage');
    
    if (modal && messageContainer) {
        messageContainer.innerHTML = message;
        modal.style.display = 'block';
        
        // Add click handler to close modal when clicking outside
        modal.onclick = function(event) {
            if (event.target === modal) {
                closeErrorModal();
            }
        };
        
        // Add escape key handler
        document.addEventListener('keydown', handleModalEscape);
    } else {
        // Fallback to regular error if modal elements not found
        showError(message);
    }
}

/**
 * Close the error modal
 */
function closeErrorModal() {
    const modal = document.getElementById('errorModal');
    if (modal) {
        modal.style.display = 'none';
        // Remove escape key handler
        document.removeEventListener('keydown', handleModalEscape);
    }
}

/**
 * Handle escape key to close modal
 * @param {KeyboardEvent} event - Keyboard event
 */
function handleModalEscape(event) {
    if (event.key === 'Escape') {
        closeErrorModal();
    }
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
// FILE LIST MANAGEMENT
// =====================================

// Drag and drop state variables
let draggedElement = null;
let draggedIndex = null;
let currentDropIndex = null;
let placeholder = null;

/**
 * Load and display all stored files from Firebase
 */
async function loadStoredFiles() {
    const fileListDiv = document.getElementById('fileList');
    
    if (!isFirebaseInitialized) {
        // Show local files if any
        if (currentDocuments.length === 0) {
            fileListDiv.innerHTML = `
                <div style="text-align: center; color: #6c757d; padding: 20px;">
                    <div style="font-size: 24px; margin-bottom: 10px;">📄</div>
                    <p>No files uploaded yet. Upload a text file above to get started!</p>
                </div>
            `;
        } else {
            // Apply saved order to local files
            const orderedFiles = await applyFileOrder(currentDocuments);
            displayFileList(orderedFiles);
        }
        return;
    }
    
    try {
        fileListDiv.innerHTML = `
            <div style="text-align: center; color: #6c757d; padding: 20px;">
                <div class="loading-spinner"></div>
                <p>Loading files...</p>
            </div>
        `;
        
        const snapshot = await db.collection('documents').orderBy('uploadDate', 'desc').get();
        const files = [];
        
        snapshot.forEach(doc => {
            files.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        if (files.length === 0) {
            fileListDiv.innerHTML = `
                <div style="text-align: center; color: #6c757d; padding: 20px;">
                    <div style="font-size: 24px; margin-bottom: 10px;">📄</div>
                    <p>No files uploaded yet. Upload a text file above to get started!</p>
                </div>
            `;
        } else {
            // Apply saved order to files
            const orderedFiles = await applyFileOrder(files);
            displayFileList(orderedFiles);
        }
        
    } catch (error) {
        console.error('Error loading stored files:', error);
        fileListDiv.innerHTML = `
            <div style="text-align: center; color: #dc3545; padding: 20px;">
                <div style="font-size: 24px; margin-bottom: 10px;">⚠️</div>
                <p>Error loading files. Please try refreshing the page.</p>
            </div>
        `;
    }
}

/**
 * Display the list of files in the UI with drag and drop functionality
 */
function displayFileList(files) {
    const fileListDiv = document.getElementById('fileList');
    
    const filesHtml = files.map((file, index) => {
        const uploadDate = file.uploadDate instanceof Date ? file.uploadDate : 
                          file.uploadDate?.toDate ? file.uploadDate.toDate() : 
                          new Date(file.uploadDate);
        
        return `
            <div class="file-item" 
                 draggable="true"
                 data-file-id="${file.id}"
                 data-index="${index}"
                 style="display: flex; align-items: center; justify-content: space-between; padding: 15px; margin-bottom: 10px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #007bff; cursor: move;">
                
                <!-- Drag Handle -->
                <div class="drag-handle" style="display: flex; flex-direction: column; align-items: center; margin-right: 10px; color: #6c757d; cursor: grab; padding: 5px;" title="Drag to reorder">
                    <div style="width: 4px; height: 4px; background: #6c757d; border-radius: 50%; margin: 1px;"></div>
                    <div style="width: 4px; height: 4px; background: #6c757d; border-radius: 50%; margin: 1px;"></div>
                    <div style="width: 4px; height: 4px; background: #6c757d; border-radius: 50%; margin: 1px;"></div>
                    <div style="width: 4px; height: 4px; background: #6c757d; border-radius: 50%; margin: 1px;"></div>
                    <div style="width: 4px; height: 4px; background: #6c757d; border-radius: 50%; margin: 1px;"></div>
                    <div style="width: 4px; height: 4px; background: #6c757d; border-radius: 50%; margin: 1px;"></div>
                </div>
                
                <div style="flex-grow: 1;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 20px;">📄</span>
                        <div>
                            <div class="file-name" style="font-weight: bold; color: #007bff; cursor: pointer; text-decoration: underline;" 
                                 onclick="viewFileAnalysis('${file.id}', '${file.name}')" 
                                 title="Click to view analysis">
                                ${file.name}
                            </div>
                            <div style="font-size: 12px; color: #6c757d;">
                                Uploaded: ${uploadDate.toLocaleDateString()} at ${uploadDate.toLocaleTimeString()}
                                | Words: ${file.wordCount?.toLocaleString() || 'N/A'}
                                | Language: ${file.language || 'Unknown'}
                            </div>
                        </div>
                    </div>
                </div>
                <button onclick="removeFile('${file.id}', '${file.name}')" 
                        class="btn" 
                        style="background-color: #dc3545; padding: 8px 15px; font-size: 12px;"
                        title="Remove this file">
                    🗑️ Remove
                </button>
            </div>
        `;
    }).join('');
    
    fileListDiv.innerHTML = filesHtml;
    
    // Add drag and drop event listeners after the HTML is rendered
    setupDragAndDrop();
}

/**
 * Setup drag and drop functionality for file list
 */
function setupDragAndDrop() {
    const fileItems = document.querySelectorAll('.file-item');
    
    fileItems.forEach((item, index) => {
        // Drag start
        item.addEventListener('dragstart', (e) => {
            draggedElement = item;
            draggedIndex = parseInt(item.dataset.index);
            
            // Style the dragged element
            item.classList.add('dragging');
            
            // Change cursor for drag handle
            const dragHandle = item.querySelector('.drag-handle');
            if (dragHandle) {
                dragHandle.style.cursor = 'grabbing';
            }
            
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', item.outerHTML);
        });
        
        // Drag end
        item.addEventListener('dragend', (e) => {
            item.classList.remove('dragging');
            
            // Reset cursor for drag handle
            const dragHandle = item.querySelector('.drag-handle');
            if (dragHandle) {
                dragHandle.style.cursor = 'grab';
            }
            
            // Remove all drop indicators
            document.querySelectorAll('.file-item').forEach(el => {
                el.style.borderTop = '';
                el.style.borderBottom = '';
            });
            
            // Reset global variables
            draggedElement = null;
            draggedIndex = null;
            currentDropIndex = null;
            placeholder = null;
        });
        
        // Drag over
        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            if (draggedElement && draggedElement !== item) {
                const rect = item.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;
                
                // Remove previous indicators
                document.querySelectorAll('.file-item').forEach(el => {
                    el.style.borderTop = '';
                    el.style.borderBottom = '';
                });
                
                // Add drop indicator
                if (e.clientY < midY) {
                    item.style.borderTop = '3px solid #007bff';
                } else {
                    item.style.borderBottom = '3px solid #007bff';
                }
            }
        });
        
        // Drag leave
        item.addEventListener('dragleave', (e) => {
            // Only remove border if we're actually leaving the item
            if (!item.contains(e.relatedTarget)) {
                item.style.borderTop = '';
                item.style.borderBottom = '';
            }
        });
        
        // Drop
        item.addEventListener('drop', (e) => {
            e.preventDefault();
            
            if (draggedElement && draggedElement !== item) {
                const dropIndex = parseInt(item.dataset.index);
                const rect = item.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;
                
                let newIndex;
                if (e.clientY < midY) {
                    newIndex = dropIndex;
                } else {
                    newIndex = dropIndex + 1;
                }
                
                // Adjust for removal of dragged item
                if (draggedIndex < newIndex) {
                    newIndex--;
                }
                
                reorderFiles(draggedIndex, newIndex);
            }
            
            // Remove all drop indicators
            document.querySelectorAll('.file-item').forEach(el => {
                el.style.borderTop = '';
                el.style.borderBottom = '';
            });
        });
        
        // Hover effects for drag handle
        const dragHandle = item.querySelector('.drag-handle');
        if (dragHandle) {
            dragHandle.addEventListener('mouseenter', () => {
                dragHandle.style.color = '#007bff';
            });
            
            dragHandle.addEventListener('mouseleave', () => {
                dragHandle.style.color = '#6c757d';
            });
        }
    });
}

/**
 * Reorder files array and update display
 */
async function reorderFiles(fromIndex, toIndex) {
    const fileListDiv = document.getElementById('fileList');
    const allItems = Array.from(fileListDiv.children);
    
    // Get current file data from the DOM
    const currentFiles = allItems.map(item => ({
        id: item.dataset.fileId,
        element: item
    }));
    
    // Perform the reorder
    const [movedFile] = currentFiles.splice(fromIndex, 1);
    currentFiles.splice(toIndex, 0, movedFile);
    
    // Update the display order
    fileListDiv.innerHTML = '';
    currentFiles.forEach((file, index) => {
        file.element.dataset.index = index;
        fileListDiv.appendChild(file.element);
    });
    
    // Re-setup drag and drop for the reordered elements
    setupDragAndDrop();
    
    // Save the new order to Firebase
    await saveFileOrder(currentFiles.map(file => file.id));
    
    console.log(`Moved file from position ${fromIndex} to position ${toIndex}`);
}

/**
 * Save the current file order to Firebase
 */
async function saveFileOrder(fileIds) {
    if (!isFirebaseInitialized) {
        console.log('Firebase not initialized, file order saved locally only');
        localStorage.setItem('textReader_fileOrder', JSON.stringify(fileIds));
        return;
    }
    
    try {
        const orderData = {
            fileIds: fileIds,
            lastUpdated: new Date(),
            userId: 'default' // You could expand this for multi-user support
        };
        
        await db.collection('fileOrder').doc('default').set(orderData);
        console.log('File order saved to Firebase');
        
        // Also save to localStorage as backup
        localStorage.setItem('textReader_fileOrder', JSON.stringify(fileIds));
        
    } catch (error) {
        console.error('Error saving file order:', error);
        // Fallback to localStorage
        localStorage.setItem('textReader_fileOrder', JSON.stringify(fileIds));
    }
}

/**
 * Load the saved file order from Firebase
 */
async function loadFileOrder() {
    if (!isFirebaseInitialized) {
        // Try to load from localStorage
        const savedOrder = localStorage.getItem('textReader_fileOrder');
        return savedOrder ? JSON.parse(savedOrder) : null;
    }
    
    try {
        const orderDoc = await db.collection('fileOrder').doc('default').get();
        
        if (orderDoc.exists) {
            const orderData = orderDoc.data();
            console.log('File order loaded from Firebase');
            
            // Also save to localStorage as backup
            localStorage.setItem('textReader_fileOrder', JSON.stringify(orderData.fileIds));
            
            return orderData.fileIds;
        } else {
            // Try localStorage as fallback
            const savedOrder = localStorage.getItem('textReader_fileOrder');
            return savedOrder ? JSON.parse(savedOrder) : null;
        }
        
    } catch (error) {
        console.error('Error loading file order:', error);
        
        // Fallback to localStorage
        const savedOrder = localStorage.getItem('textReader_fileOrder');
        return savedOrder ? JSON.parse(savedOrder) : null;
    }
}

/**
 * Apply saved file order to files array
 */
async function applyFileOrder(files) {
    const savedOrder = await loadFileOrder();
    
    if (!savedOrder || savedOrder.length === 0) {
        // No saved order, return files sorted by upload date (newest first)
        return files.sort((a, b) => {
            const dateA = a.uploadDate instanceof Date ? a.uploadDate : 
                         a.uploadDate?.toDate ? a.uploadDate.toDate() : new Date(a.uploadDate);
            const dateB = b.uploadDate instanceof Date ? b.uploadDate : 
                         b.uploadDate?.toDate ? b.uploadDate.toDate() : new Date(b.uploadDate);
            return dateB - dateA;
        });
    }
    
    // Create a map for quick lookup
    const fileMap = new Map();
    files.forEach(file => fileMap.set(file.id, file));
    
    // Order files according to saved order
    const orderedFiles = [];
    const remainingFiles = [...files];
    
    // First, add files in the saved order
    savedOrder.forEach(fileId => {
        const file = fileMap.get(fileId);
        if (file) {
            orderedFiles.push(file);
            const index = remainingFiles.findIndex(f => f.id === fileId);
            if (index !== -1) {
                remainingFiles.splice(index, 1);
            }
        }
    });
    
    // Then add any new files that weren't in the saved order (at the end)
    remainingFiles.forEach(file => {
        orderedFiles.push(file);
    });
    
    console.log(`Applied file order: ${orderedFiles.length} files arranged`);
    return orderedFiles;
}

/**
 * Update saved file order after a file is deleted
 */
async function updateFileOrderAfterDeletion(deletedFileId) {
    try {
        const savedOrder = await loadFileOrder();
        if (savedOrder && savedOrder.length > 0) {
            // Remove the deleted file from the saved order
            const updatedOrder = savedOrder.filter(fileId => fileId !== deletedFileId);
            
            if (updatedOrder.length !== savedOrder.length) {
                // Save the updated order
                await saveFileOrder(updatedOrder);
                console.log(`Updated file order after deletion: removed ${deletedFileId}`);
            }
        }
    } catch (error) {
        console.error('Error updating file order after deletion:', error);
    }
}

/**
 * View analysis results for a specific file
 */
async function viewFileAnalysis(fileId, fileName) {
    try {
        showProgress(true);
        
        if (!isFirebaseInitialized) {
            // Find file in local storage
            const file = currentDocuments.find(doc => doc.id === fileId);
            if (file) {
                displayAnalysisResults(file);
            } else {
                showError('File not found in local storage');
            }
            showProgress(false);
            return;
        }
        
        // Fetch complete file data from Firebase
        const docSnapshot = await db.collection('documents').doc(fileId).get();
        const wordFreqSnapshot = await db.collection('wordFrequencies').doc(fileId).get();
        const letterFreqSnapshot = await db.collection('letterFrequencies').doc(fileId).get();
        const foreignCharsSnapshot = await db.collection('foreignCharacters').doc(fileId).get();
        
        if (!docSnapshot.exists) {
            showError('File not found in database');
            showProgress(false);
            return;
        }
        
        // Reconstruct the analysis object
        const docData = docSnapshot.data();
        const wordFreqData = wordFreqSnapshot.exists ? wordFreqSnapshot.data() : {};
        const letterFreqData = letterFreqSnapshot.exists ? letterFreqSnapshot.data() : {};
        const foreignCharsData = foreignCharsSnapshot.exists ? foreignCharsSnapshot.data() : {};
        
        const analysisData = {
            id: fileId,
            name: docData.name,
            uploadDate: docData.uploadDate?.toDate ? docData.uploadDate.toDate() : new Date(docData.uploadDate),
            wordCount: docData.wordCount,
            language: docData.language,
            wordFrequency: wordFreqData.frequencies || {},
            letterFrequency: letterFreqData.frequencies || {},
            foreignChars: foreignCharsData.characters || []
        };
        
        displayAnalysisResults(analysisData);
        showProgress(false);
        
    } catch (error) {
        showProgress(false);
        showError('Error loading file analysis: ' + error.message);
        console.error('Error loading file analysis:', error);
    }
}

/**
 * Remove a file from the database
 */
async function removeFile(fileId, fileName) {
    if (!confirm(`Are you sure you want to remove "${fileName}"? This action cannot be undone.`)) {
        return;
    }
    
    try {
        showProgress(true);
        
        if (!isFirebaseInitialized) {
            // Remove from local storage
            const index = currentDocuments.findIndex(doc => doc.id === fileId);
            if (index !== -1) {
                currentDocuments.splice(index, 1);
                await loadStoredFiles(); // Refresh the list
                showSuccess(`Removed "${fileName}" from local storage`);
            } else {
                showError('File not found in local storage');
            }
            showProgress(false);
            return;
        }
        
        // Delete from all Firebase collections
        const batch = db.batch();
        
        batch.delete(db.collection('documents').doc(fileId));
        batch.delete(db.collection('wordFrequencies').doc(fileId));
        batch.delete(db.collection('letterFrequencies').doc(fileId));
        batch.delete(db.collection('foreignCharacters').doc(fileId));
        batch.delete(db.collection('searchIndex').doc(fileId));
        
        await batch.commit();
        
        showProgress(false);
        showSuccess(`Successfully removed "${fileName}"`);
        
        // Clear analysis results if showing this file
        const analysisResults = document.getElementById('analysisResults');
        if (analysisResults) {
            analysisResults.remove();
        }
        
        // Refresh the file list
        await loadStoredFiles();
        
        // Update the saved order to remove the deleted file
        await updateFileOrderAfterDeletion(fileId);
        
    } catch (error) {
        showProgress(false);
        showError('Error removing file: ' + error.message);
        console.error('Error removing file:', error);
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
window.loadStoredFiles = loadStoredFiles;
window.viewFileAnalysis = viewFileAnalysis;
window.removeFile = removeFile;

// For testing purposes, you can also access these
// window.TextReaderApp = {
//     cleanText,
//     tokenizeText,
//     detectLanguage,
//     processDocument
// };

// =====================================
// GLOBAL FUNCTION ASSIGNMENTS
// =====================================

// Make functions globally available for HTML onclick handlers
window.uploadText = uploadText;
window.loadSampleFile = loadSampleFile;
window.analyzeText = analyzeText;
window.viewFileAnalysis = viewFileAnalysis;
window.removeFile = removeFile;
window.clearDatabase = clearDatabase;
window.closeErrorModal = closeErrorModal;

console.log('Global functions assigned:', {
    uploadText: typeof window.uploadText,
    loadSampleFile: typeof window.loadSampleFile,
    analyzeText: typeof window.analyzeText,
    viewFileAnalysis: typeof window.viewFileAnalysis,
    removeFile: typeof window.removeFile,
    clearDatabase: typeof window.clearDatabase,
    closeErrorModal: typeof window.closeErrorModal
});

console.log('TextReader app.js fully loaded and ready!');
