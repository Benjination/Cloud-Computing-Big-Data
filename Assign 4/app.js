// Firebase configuration - REPLACE WITH YOUR CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyDmF5x5HooHWLqm4-tLs2flSp5s5dmRl3A",
  authDomain: "data-visualization-d0863.firebaseapp.com",
  projectId: "data-visualization-d0863",
  storageBucket: "data-visualization-d0863.firebasestorage.app",
  messagingSenderId: "113850645003",
  appId: "1:113850645003:web:485a11c75894aa7e70e50e",
  measurementId: "G-79HXB7C0NP"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Global variables
let currentData = [];
let currentChart = null;
let categories = [];

// DOM elements
const csvFileInput = document.getElementById('csvFile');
const uploadBtn = document.getElementById('uploadBtn');
const toggleTableBtn = document.getElementById('toggleTableBtn');
const toggleManagerBtn = document.getElementById('toggleManagerBtn');
const chartTypeSelect = document.getElementById('chartType');
const pieCategorySelect = document.getElementById('pieCategory');
const xAxisSelect = document.getElementById('xAxis');
const yAxisSelect = document.getElementById('yAxis');
const generateBtn = document.getElementById('generateBtn');
const statusMessage = document.getElementById('statusMessage');
const tableContainer = document.getElementById('tableContainer');
const tableContent = document.getElementById('tableContent');
const chartCanvas = document.getElementById('chartCanvas');
const loadingMsg = document.getElementById('loadingMsg');
const fileNameDisplay = document.getElementById('fileName');
const fileManager = document.getElementById('fileManager');
const fileList = document.getElementById('fileList');

// Event Listeners
csvFileInput.addEventListener('change', handleFileSelect);
uploadBtn.addEventListener('click', uploadToFirebase);
toggleTableBtn.addEventListener('click', toggleTable);
toggleManagerBtn.addEventListener('click', toggleFileManager);
chartTypeSelect.addEventListener('change', handleChartTypeChange);
xAxisSelect.addEventListener('change', validateAxisSelection);
yAxisSelect.addEventListener('change', validateAxisSelection);
generateBtn.addEventListener('click', generateChart);
pieCategorySelect.addEventListener('change', () => {
    if (pieCategorySelect.value) {
        generateChart();
    }
});

// Handle file selection
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        fileNameDisplay.textContent = `Selected: ${file.name}`;
        uploadBtn.disabled = false;
        parseFile(file);
    }
}

// Load sample dataset
async function loadSampleDataset(datasetName) {
    try {
        showStatus(`Loading ${datasetName} sample dataset...`, 'info');
        
        const datasetPath = `sample_data/${datasetName === 'games' ? 'video_games' : 
                                          datasetName === 'phones' ? 'smartphones' : 
                                          datasetName === 'realestate' ? 'real_estate' : 
                                          datasetName}.csv`;
        
        const response = await fetch(datasetPath);
        if (!response.ok) {
            throw new Error('Failed to load dataset');
        }
        
        const csvText = await response.text();
        
        // Parse using Papa Parse
        if (typeof Papa !== 'undefined') {
            Papa.parse(csvText, {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
                complete: function(results) {
                    if (results.data.length === 0) {
                        showStatus('Dataset is empty', 'error');
                        return;
                    }
                    
                    currentData = results.data;
                    categories = Object.keys(results.data[0]);
                    
                    const datasetNames = {
                        'movies': '🎬 Movies',
                        'games': '🎮 Video Games',
                        'weather': '🌦️ Weather',
                        'realestate': '🏠 Real Estate',
                        'phones': '📱 Smartphones',
                        'restaurants': '🍕 Restaurants'
                    };
                    
                    showStatus(`${datasetNames[datasetName]} loaded: ${currentData.length} records, ${categories.length} columns`, 'success');
                    populateDropdowns();
                    displayTable();
                    chartTypeSelect.disabled = false;
                    toggleTableBtn.style.display = 'inline-block';
                },
                error: function(error) {
                    showStatus(`Error parsing dataset: ${error.message}`, 'error');
                }
            });
        }
    } catch (error) {
        showStatus(`Error loading sample dataset: ${error.message}`, 'error');
    }
}

// Parse file based on type
function parseFile(file) {
    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith('.csv')) {
        parseCSV(file);
    } else if (fileName.endsWith('.json')) {
        parseJSON(file);
    } else if (fileName.endsWith('.xml')) {
        parseXML(file);
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        parseExcel(file);
    } else {
        showStatus('Unsupported file type. Please use CSV, JSON, XML, or Excel files.', 'error');
    }
}

// Parse CSV file
function parseCSV(file) {
    // Use Papa Parse for robust CSV parsing
    if (typeof Papa !== 'undefined') {
        Papa.parse(file, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: function(results) {
                if (results.errors.length > 0) {
                    console.warn('CSV parsing warnings:', results.errors);
                }
                
                if (results.data.length === 0) {
                    showStatus('CSV file is empty or invalid', 'error');
                    return;
                }
                
                currentData = results.data;
                categories = Object.keys(results.data[0]);
                showStatus(`CSV parsed: ${currentData.length} rows, ${categories.length} columns`, 'success');
                populateDropdowns();
            },
            error: function(error) {
                showStatus(`CSV parsing error: ${error.message}`, 'error');
            }
        });
    } else {
        // Fallback to basic parsing if Papa Parse not available
        parseCSVBasic(file);
    }
}

// Basic CSV parser (fallback)
function parseCSVBasic(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
            showStatus('CSV file is empty or invalid', 'error');
            return;
        }

        // Parse headers
        const headers = lines[0].split(',').map(h => h.trim());
        categories = headers;

        // Parse data rows
        const data = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            if (values.length === headers.length) {
                const row = {};
                headers.forEach((header, index) => {
                    // Try to convert to number if possible
                    const value = values[index];
                    row[header] = isNaN(value) ? value : parseFloat(value);
                });
                data.push(row);
            }
        }

        currentData = data;
        showStatus(`CSV parsed successfully: ${data.length} rows, ${headers.length} columns`, 'success');
        populateDropdowns();
    };
    reader.readAsText(file);
}

// Parse JSON file
function parseJSON(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const jsonData = JSON.parse(e.target.result);
            
            // Handle different JSON structures
            let dataArray;
            if (Array.isArray(jsonData)) {
                dataArray = jsonData;
            } else if (jsonData.data && Array.isArray(jsonData.data)) {
                dataArray = jsonData.data;
            } else if (jsonData.records && Array.isArray(jsonData.records)) {
                dataArray = jsonData.records;
            } else if (jsonData.results && Array.isArray(jsonData.results)) {
                dataArray = jsonData.results;
            } else {
                // Try to find the first array property
                const firstArray = Object.values(jsonData).find(val => Array.isArray(val));
                if (firstArray) {
                    dataArray = firstArray;
                } else {
                    // Single object - wrap in array
                    dataArray = [jsonData];
                }
            }
            
            if (dataArray.length === 0) {
                showStatus('JSON file contains no data', 'error');
                return;
            }
            
            // Flatten nested objects to some degree
            currentData = dataArray.map(item => flattenObject(item));
            categories = Object.keys(currentData[0]);
            showStatus(`JSON parsed: ${currentData.length} records, ${categories.length} fields`, 'success');
            populateDropdowns();
        } catch (error) {
            showStatus(`JSON parsing error: ${error.message}`, 'error');
        }
    };
    reader.readAsText(file);
}

// Parse XML file
function parseXML(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(e.target.result, 'text/xml');
            
            // Check for parsing errors
            const parserError = xmlDoc.querySelector('parsererror');
            if (parserError) {
                showStatus('XML parsing error: Invalid XML format', 'error');
                return;
            }
            
            // Try to find repeating elements (common patterns)
            const root = xmlDoc.documentElement;
            let dataElements = [];
            
            // Common XML patterns
            const commonNames = ['record', 'item', 'row', 'entry', 'earthquake', 'data'];
            for (const name of commonNames) {
                dataElements = root.getElementsByTagName(name);
                if (dataElements.length > 0) break;
            }
            
            // If no common pattern, use direct children
            if (dataElements.length === 0) {
                dataElements = root.children;
            }
            
            if (dataElements.length === 0) {
                showStatus('No data elements found in XML', 'error');
                return;
            }
            
            // Convert XML elements to objects
            const data = [];
            for (let i = 0; i < dataElements.length; i++) {
                const element = dataElements[i];
                const obj = xmlElementToObject(element);
                if (Object.keys(obj).length > 0) {
                    data.push(obj);
                }
            }
            
            if (data.length === 0) {
                showStatus('No valid data extracted from XML', 'error');
                return;
            }
            
            currentData = data;
            categories = Object.keys(data[0]);
            showStatus(`XML parsed: ${data.length} records, ${categories.length} fields`, 'success');
            populateDropdowns();
        } catch (error) {
            showStatus(`XML parsing error: ${error.message}`, 'error');
        }
    };
    reader.readAsText(file);
}

// Parse Excel file
function parseExcel(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            // Get first sheet
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // Convert to JSON
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
                raw: false, // Convert dates to strings
                defval: null // Use null for empty cells
            });
            
            if (jsonData.length === 0) {
                showStatus('Excel file contains no data', 'error');
                return;
            }
            
            currentData = jsonData;
            categories = Object.keys(jsonData[0]);
            showStatus(`Excel parsed: ${jsonData.length} rows, ${categories.length} columns from sheet "${firstSheetName}"`, 'success');
            populateDropdowns();
        } catch (error) {
            showStatus(`Excel parsing error: ${error.message}. Make sure XLSX library is loaded.`, 'error');
        }
    };
    reader.readAsArrayBuffer(file);
}

// Helper function to flatten nested objects
function flattenObject(obj, prefix = '') {
    const flattened = {};
    
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const value = obj[key];
            const newKey = prefix ? `${prefix}.${key}` : key;
            
            if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
                // Recursively flatten nested objects
                Object.assign(flattened, flattenObject(value, newKey));
            } else if (Array.isArray(value)) {
                // Convert arrays to string representation
                flattened[newKey] = value.join(', ');
            } else {
                // Try to convert to number if possible
                flattened[newKey] = isNaN(value) ? value : parseFloat(value);
            }
        }
    }
    
    return flattened;
}

// Helper function to convert XML element to object
function xmlElementToObject(element) {
    const obj = {};
    
    // Get attributes
    if (element.attributes) {
        for (let i = 0; i < element.attributes.length; i++) {
            const attr = element.attributes[i];
            const value = attr.value;
            obj[attr.name] = isNaN(value) ? value : parseFloat(value);
        }
    }
    
    // Get child elements
    if (element.children.length > 0) {
        for (let i = 0; i < element.children.length; i++) {
            const child = element.children[i];
            const childText = child.textContent.trim();
            if (childText) {
                obj[child.tagName] = isNaN(childText) ? childText : parseFloat(childText);
            }
        }
    } else {
        // Leaf element with text content
        const text = element.textContent.trim();
        if (text && element.tagName) {
            obj[element.tagName] = isNaN(text) ? text : parseFloat(text);
        }
    }
    
    return obj;
}

// Upload data to Firebase
async function uploadToFirebase() {
    if (currentData.length === 0) {
        showStatus('No data to upload', 'error');
        return;
    }

    try {
        uploadBtn.disabled = true;
        showStatus('Uploading to Firebase...', 'info');

        // Get original filename
        const fileName = csvFileInput.files[0]?.name || 'unknown_file';
        const fileId = `file_${Date.now()}`;
        
        // Create metadata document
        const metadataRef = db.collection('fileMetadata').doc(fileId);
        await metadataRef.set({
            fileName: fileName,
            uploadedAt: firebase.firestore.FieldValue.serverTimestamp(),
            recordCount: currentData.length,
            columns: categories
        });

        // Upload data to a subcollection under this file
        const dataCollectionRef = metadataRef.collection('data');
        const uploadPromises = currentData.map((row, index) => {
            return dataCollectionRef.doc(`record_${index}`).set(row);
        });

        await Promise.all(uploadPromises);
        
        showStatus(`Successfully uploaded ${currentData.length} records to Firebase!`, 'success');
        chartTypeSelect.disabled = false;
        toggleTableBtn.style.display = 'inline-block';
        toggleManagerBtn.style.display = 'inline-block';
        displayTable();
        loadStoredFiles(); // Refresh file list
    } catch (error) {
        showStatus(`Error uploading to Firebase: ${error.message}`, 'error');
        uploadBtn.disabled = false;
    }
}

// Populate dropdown menus
function populateDropdowns() {
    // Clear existing options
    pieCategorySelect.innerHTML = '<option value="">-- Select category --</option>';
    xAxisSelect.innerHTML = '<option value="">-- Select X-axis --</option>';
    yAxisSelect.innerHTML = '<option value="">-- Select Y-axis --</option>';

    // Add category options
    categories.forEach(category => {
        // Pie chart - all categories
        const pieOption = document.createElement('option');
        pieOption.value = category;
        pieOption.textContent = category;
        pieCategorySelect.appendChild(pieOption);

        // Axis selects - all categories
        const xOption = document.createElement('option');
        xOption.value = category;
        xOption.textContent = category;
        xAxisSelect.appendChild(xOption);

        const yOption = document.createElement('option');
        yOption.value = category;
        yOption.textContent = category;
        yAxisSelect.appendChild(yOption);
    });
}

// Handle chart type change
function handleChartTypeChange() {
    const chartType = chartTypeSelect.value;
    const pieControls = document.getElementById('pieControls');
    const axisControls = document.getElementById('axisControls');

    // Hide all controls first
    pieControls.style.display = 'none';
    axisControls.classList.remove('show');
    generateBtn.style.display = 'none';

    // Reset selections
    pieCategorySelect.value = '';
    xAxisSelect.value = '';
    yAxisSelect.value = '';

    if (chartType === 'pie') {
        pieControls.style.display = 'block';
        pieCategorySelect.disabled = false;
    } else if (chartType === 'bar' || chartType === 'scatter') {
        axisControls.classList.add('show');
        xAxisSelect.disabled = false;
        yAxisSelect.disabled = false;
        generateBtn.style.display = 'block';
    }
}

// Validate axis selection (prevent same category for X and Y)
function validateAxisSelection() {
    const xValue = xAxisSelect.value;
    const yValue = yAxisSelect.value;

    if (xValue && yValue) {
        if (xValue === yValue) {
            showStatus('X-axis and Y-axis cannot be the same category', 'error');
            generateBtn.disabled = true;
        } else {
            showStatus('', 'info');
            generateBtn.disabled = false;
        }
    } else {
        generateBtn.disabled = true;
    }
}

// Generate chart
function generateChart() {
    const chartType = chartTypeSelect.value;

    if (!chartType) {
        showStatus('Please select a chart type', 'error');
        return;
    }

    // Destroy existing chart
    if (currentChart) {
        currentChart.destroy();
    }

    try {
        if (chartType === 'pie') {
            generatePieChart();
        } else if (chartType === 'bar') {
            generateBarChart();
        } else if (chartType === 'scatter') {
            generateScatterChart();
        }
    } catch (error) {
        showStatus(`Error generating chart: ${error.message}`, 'error');
    }
}

// Generate pie chart
function generatePieChart() {
    const category = pieCategorySelect.value;
    
    if (!category) {
        showStatus('Please select a category', 'error');
        return;
    }

    // Count occurrences or sum values
    const valueCounts = {};
    currentData.forEach(row => {
        const value = row[category];
        if (value !== undefined && value !== null && value !== '') {
            // For numeric data, create ranges
            if (typeof value === 'number') {
                const range = Math.floor(value);
                valueCounts[range] = (valueCounts[range] || 0) + 1;
            } else {
                valueCounts[value] = (valueCounts[value] || 0) + 1;
            }
        }
    });

    const labels = Object.keys(valueCounts);
    const data = Object.values(valueCounts);
    const colors = generateColors(labels.length);

    const ctx = chartCanvas.getContext('2d');
    currentChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        font: { size: 14 },
                        padding: 15
                    }
                },
                title: {
                    display: true,
                    text: `Distribution of ${category}`,
                    font: { size: 18, weight: 'bold' }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });

    showStatus(`Pie chart generated for ${category}`, 'success');
}

// Generate bar chart
function generateBarChart() {
    const xCategory = xAxisSelect.value;
    const yCategory = yAxisSelect.value;

    if (!xCategory || !yCategory) {
        showStatus('Please select both X and Y axes', 'error');
        return;
    }

    // Aggregate data
    const aggregated = {};
    currentData.forEach(row => {
        const xValue = row[xCategory];
        const yValue = row[yCategory];
        
        if (xValue !== undefined && yValue !== undefined) {
            const xKey = typeof xValue === 'number' ? xValue.toFixed(2) : xValue;
            if (!aggregated[xKey]) {
                aggregated[xKey] = [];
            }
            aggregated[xKey].push(typeof yValue === 'number' ? yValue : 1);
        }
    });

    // Calculate averages for each x value
    const labels = Object.keys(aggregated).sort();
    const data = labels.map(label => {
        const values = aggregated[label];
        return values.reduce((a, b) => a + b, 0) / values.length;
    });

    // Calculate min and max for better scaling
    const minValue = Math.min(...data);
    const maxValue = Math.max(...data);
    const range = maxValue - minValue;
    const yMin = minValue - (range * 0.1);
    const yMax = maxValue + (range * 0.1);

    const ctx = chartCanvas.getContext('2d');
    currentChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: `Average ${yCategory}`,
                data: data,
                backgroundColor: 'rgba(102, 126, 234, 0.7)',
                borderColor: 'rgba(102, 126, 234, 1)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: true },
                title: {
                    display: true,
                    text: `${yCategory} vs ${xCategory}`,
                    font: { size: 18, weight: 'bold' }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: xCategory,
                        font: { size: 14, weight: 'bold' }
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: yCategory,
                        font: { size: 14, weight: 'bold' }
                    },
                    min: yMin,
                    max: yMax
                }
            }
        }
    });

    showStatus(`Bar chart generated: ${yCategory} vs ${xCategory}`, 'success');
}

// Generate scatter chart
function generateScatterChart() {
    const xCategory = xAxisSelect.value;
    const yCategory = yAxisSelect.value;

    if (!xCategory || !yCategory) {
        showStatus('Please select both X and Y axes', 'error');
        return;
    }

    // Prepare scatter data
    const scatterData = currentData
        .filter(row => {
            const xVal = row[xCategory];
            const yVal = row[yCategory];
            return xVal !== undefined && yVal !== undefined && 
                   typeof xVal === 'number' && typeof yVal === 'number';
        })
        .map(row => ({
            x: row[xCategory],
            y: row[yCategory]
        }));

    if (scatterData.length === 0) {
        showStatus('No valid numeric data for scatter plot', 'error');
        return;
    }

    // Calculate min and max for both axes with 10% buffer
    const xValues = scatterData.map(d => d.x);
    const yValues = scatterData.map(d => d.y);
    
    const xMin = Math.min(...xValues);
    const xMax = Math.max(...xValues);
    const xRange = xMax - xMin;
    const xMinScaled = xMin - (xRange * 0.1);
    const xMaxScaled = xMax + (xRange * 0.1);
    
    const yMin = Math.min(...yValues);
    const yMax = Math.max(...yValues);
    const yRange = yMax - yMin;
    const yMinScaled = yMin - (yRange * 0.1);
    const yMaxScaled = yMax + (yRange * 0.1);

    const ctx = chartCanvas.getContext('2d');
    currentChart = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: `${yCategory} vs ${xCategory}`,
                data: scatterData,
                backgroundColor: 'rgba(118, 75, 162, 0.6)',
                borderColor: 'rgba(118, 75, 162, 1)',
                borderWidth: 1,
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: true },
                title: {
                    display: true,
                    text: `${yCategory} vs ${xCategory}`,
                    font: { size: 18, weight: 'bold' }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: xCategory,
                        font: { size: 14, weight: 'bold' }
                    },
                    min: xMinScaled,
                    max: xMaxScaled
                },
                y: {
                    title: {
                        display: true,
                        text: yCategory,
                        font: { size: 14, weight: 'bold' }
                    },
                    min: yMinScaled,
                    max: yMaxScaled
                }
            }
        }
    });

    showStatus(`Scatter plot generated: ${yCategory} vs ${xCategory}`, 'success');
}

// Display data table
function displayTable() {
    if (currentData.length === 0) return;

    const headers = Object.keys(currentData[0]);
    let tableHTML = '<table><thead><tr>';
    
    headers.forEach(header => {
        tableHTML += `<th>${header}</th>`;
    });
    tableHTML += '</tr></thead><tbody>';

    currentData.forEach(row => {
        tableHTML += '<tr>';
        headers.forEach(header => {
            tableHTML += `<td>${row[header]}</td>`;
        });
        tableHTML += '</tr>';
    });

    tableHTML += '</tbody></table>';
    tableContent.innerHTML = tableHTML;
}

// Toggle table visibility
function toggleTable() {
    tableContainer.classList.toggle('show');
}

// Show status message
function showStatus(message, type) {
    if (!message) {
        statusMessage.classList.remove('show');
        return;
    }
    
    statusMessage.textContent = message;
    statusMessage.className = `status show ${type}`;
    
    if (type === 'success') {
        setTimeout(() => {
            statusMessage.classList.remove('show');
        }, 5000);
    }
}

// Generate random colors for pie chart
function generateColors(count) {
    const colors = [
        'rgba(102, 126, 234, 0.8)',
        'rgba(118, 75, 162, 0.8)',
        'rgba(237, 100, 166, 0.8)',
        'rgba(255, 154, 158, 0.8)',
        'rgba(250, 208, 196, 0.8)',
        'rgba(156, 136, 255, 0.8)',
        'rgba(75, 192, 192, 0.8)',
        'rgba(255, 206, 86, 0.8)',
        'rgba(255, 99, 132, 0.8)',
        'rgba(54, 162, 235, 0.8)'
    ];

    const result = [];
    for (let i = 0; i < count; i++) {
        result.push(colors[i % colors.length]);
    }
    return result;
}

// Toggle file manager visibility
function toggleFileManager() {
    fileManager.classList.toggle('show');
    if (fileManager.classList.contains('show')) {
        loadStoredFiles();
    }
}

// Load list of stored files from Firebase
async function loadStoredFiles() {
    try {
        fileList.innerHTML = '<div class="no-files">Loading files...</div>';
        
        const snapshot = await db.collection('fileMetadata').orderBy('uploadedAt', 'desc').get();
        
        if (snapshot.empty) {
            fileList.innerHTML = '<div class="no-files">No files stored in Firebase yet. Upload a file to get started!</div>';
            return;
        }
        
        let html = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            const uploadDate = data.uploadedAt ? data.uploadedAt.toDate().toLocaleString() : 'Unknown date';
            
            html += `
                <div class="file-item" data-file-id="${doc.id}">
                    <div class="file-info">
                        <div class="file-name">📄 ${data.fileName}</div>
                        <div class="file-meta">
                            ${data.recordCount} records • ${data.columns?.length || 0} columns • Uploaded: ${uploadDate}
                        </div>
                    </div>
                    <div class="file-actions">
                        <button class="btn-load" onclick="loadFileFromFirebase('${doc.id}')">Load</button>
                        <button class="btn-delete" onclick="deleteFileFromFirebase('${doc.id}', '${data.fileName}')">Delete</button>
                    </div>
                </div>
            `;
        });
        
        fileList.innerHTML = html;
    } catch (error) {
        fileList.innerHTML = `<div class="no-files">Error loading files: ${error.message}</div>`;
        console.error('Error loading files:', error);
    }
}

// Load a specific file from Firebase
async function loadFileFromFirebase(fileId) {
    try {
        loadingMsg.style.display = 'block';
        showStatus('Loading file from Firebase...', 'info');
        
        // Get file metadata
        const metadataDoc = await db.collection('fileMetadata').doc(fileId).get();
        if (!metadataDoc.exists) {
            showStatus('File not found', 'error');
            return;
        }
        
        const metadata = metadataDoc.data();
        
        // Load data from subcollection
        const dataSnapshot = await db.collection('fileMetadata').doc(fileId).collection('data').get();
        currentData = dataSnapshot.docs.map(doc => doc.data());
        
        if (currentData.length > 0) {
            categories = metadata.columns || Object.keys(currentData[0]);
            populateDropdowns();
            displayTable();
            chartTypeSelect.disabled = false;
            toggleTableBtn.style.display = 'inline-block';
            toggleManagerBtn.style.display = 'inline-block';
            showStatus(`Loaded "${metadata.fileName}" - ${currentData.length} records`, 'success');
            
            // Close file manager
            fileManager.classList.remove('show');
        }
        
        loadingMsg.style.display = 'none';
    } catch (error) {
        showStatus(`Error loading file: ${error.message}`, 'error');
        loadingMsg.style.display = 'none';
    }
}

// Delete a file from Firebase
async function deleteFileFromFirebase(fileId, fileName) {
    const confirmed = confirm(`Are you sure you want to delete "${fileName}"? This cannot be undone.`);
    if (!confirmed) return;
    
    try {
        showStatus('Deleting file...', 'info');
        
        // Delete all data documents in subcollection
        const dataSnapshot = await db.collection('fileMetadata').doc(fileId).collection('data').get();
        const deletePromises = dataSnapshot.docs.map(doc => doc.ref.delete());
        await Promise.all(deletePromises);
        
        // Delete metadata document
        await db.collection('fileMetadata').doc(fileId).delete();
        
        showStatus(`"${fileName}" deleted successfully`, 'success');
        
        // Reload file list
        loadStoredFiles();
    } catch (error) {
        showStatus(`Error deleting file: ${error.message}`, 'error');
        console.error('Error deleting file:', error);
    }
}

// Load data from Firebase on page load (optional)
window.addEventListener('load', async () => {
    try {
        // Check if there are any stored files
        const snapshot = await db.collection('fileMetadata').limit(1).get();
        if (!snapshot.empty) {
            toggleManagerBtn.style.display = 'inline-block';
        }
    } catch (error) {
        console.log('Error checking for existing files:', error);
    }
});
