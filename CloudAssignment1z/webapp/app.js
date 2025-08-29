// Application Configuration
const USE_AZURE_STORAGE = false; // Set to true when Azure credentials are configured
const STORAGE_ACCOUNT = 'storagebtn1609';
const TABLE_NAME = 'people';
const CONTAINER_NAME = 'images';

// Azure Storage Service instance (initialized when authentication is ready)
let azureStorage = null;

// Initialize Azure Storage Service when credentials are available
function initializeAzureStorage() {
    if (typeof AzureStorageService !== 'undefined' && typeof AZURE_CONFIG !== 'undefined') {
        azureStorage = new AzureStorageService(AZURE_CONFIG);
        console.log('Azure Storage Service initialized');
        return true;
    }
    console.warn('Azure Storage Service not available - using simulation mode');
    return false;
}

// Tab Management
function showTab(tabName) {
    // Hide all tab contents
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => content.classList.remove('active'));
    
    // Remove active class from all tab buttons
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => button.classList.remove('active'));
    
    // Show selected tab content
    document.getElementById(tabName).classList.add('active');
    
    // Add active class to clicked tab button
    event.target.classList.add('active');
}

// Utility Functions
function showStatus(elementId, message, type = 'info') {
    const statusElement = document.getElementById(elementId);
    statusElement.textContent = message;
    statusElement.className = `status ${type}`;
    statusElement.style.display = 'block';
}

function parseCSV(text) {
    const lines = text.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
            const values = lines[i].split(',').map(v => v.trim());
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });
            data.push(row);
        }
    }
    return data;
}

function getImagePath(pictureName) {
    // Helper function to map image names to correct paths
    if (!pictureName || pictureName.trim() === '') {
        return null;
    }
    
    // Check if we're in production mode with real Azure credentials
    if (window.AZURE_AUTH && window.AZURE_AUTH.isProduction) {
        // Return Azure Blob Storage URL with SAS token
        const accountName = window.AZURE_AUTH.accountName;
        const containerName = 'images';
        const sasToken = window.AZURE_AUTH.sasToken;
        
        // Clean the picture name (remove any existing path)
        const cleanPictureName = pictureName.includes('/') ? 
            pictureName.split('/').pop() : pictureName;
            
        return `https://${accountName}.blob.core.windows.net/${containerName}/${cleanPictureName}?${sasToken}`;
    } else {
        // Fallback to local images for simulation mode
        if (pictureName.includes('/')) {
            return pictureName;
        }
        return `../images/${pictureName}`;
    }
}

// Upload Functions
async function uploadCSV() {
    const fileInput = document.getElementById('csvFile');
    const file = fileInput.files[0];
    
    if (!file) {
        showStatus('csvStatus', 'Please select a CSV file', 'error');
        return;
    }
    
    if (!file.name.toLowerCase().endsWith('.csv')) {
        showStatus('csvStatus', 'Please select a valid CSV file', 'error');
        return;
    }
    
    try {
        showStatus('csvStatus', 'Reading CSV file...', 'info');
        
        const text = await file.text();
        const data = parseCSV(text);
        
        showStatus('csvStatus', `Found ${data.length} people records. Processing...`, 'info');
        
        // Upload to Azure Table Storage (real or simulated)
        await uploadTableData(data);
        
        showStatus('csvStatus', `Successfully uploaded ${data.length} people records to Table Storage!`, 'success');
        
    } catch (error) {
        console.error('Error uploading CSV:', error);
        showStatus('csvStatus', `Error uploading CSV: ${error.message}`, 'error');
    }
}

async function uploadPictures() {
    const fileInput = document.getElementById('pictureFiles');
    const files = fileInput.files;
    
    if (files.length === 0) {
        showStatus('pictureStatus', 'Please select picture files', 'error');
        return;
    }
    
    try {
        showStatus('pictureStatus', `Uploading ${files.length} pictures...`, 'info');
        
        let successCount = 0;
        let errorCount = 0;
        
        for (let file of files) {
            if (file.type.startsWith('image/')) {
                // Here we would upload to Azure Blob Storage
                await uploadBlob(file);
                successCount++;
            } else {
                console.warn(`Skipping non-image file: ${file.name}`);
                errorCount++;
            }
        }
        
        showStatus('pictureStatus', 
            `Upload complete! ${successCount} pictures uploaded successfully.` +
            (errorCount > 0 ? ` ${errorCount} files skipped (not images).` : ''), 
            'success');
        
    } catch (error) {
        console.error('Error uploading pictures:', error);
        showStatus('pictureStatus', `Error uploading pictures: ${error.message}`, 'error');
    }
}

// Search Functions
async function searchByName() {
    const nameInput = document.getElementById('nameSearch');
    const name = nameInput.value.trim();
    
    if (!name) {
        showStatus('searchResults', 'Please enter a name to search', 'error');
        return;
    }
    
    try {
        showStatus('searchResults', `Searching for ${name}...`, 'info');
        
        // Here we would query Azure Table Storage
        const person = await queryTableData('name', name);
        
        if (person) {
            displayPersonResults([person]);
        } else {
            showStatus('searchResults', `No person found with name: ${name}`, 'error');
        }
        
    } catch (error) {
        console.error('Error searching by name:', error);
        showStatus('searchResults', `Error searching: ${error.message}`, 'error');
    }
}

async function searchBySalary() {
    const salaryInput = document.getElementById('salarySearch');
    const maxSalary = parseInt(salaryInput.value);
    
    if (!maxSalary || maxSalary <= 0) {
        showStatus('searchResults', 'Please enter a valid salary amount', 'error');
        return;
    }
    
    try {
        showStatus('searchResults', `Searching for people with salary less than ${maxSalary}...`, 'info');
        
        // Here we would query Azure Table Storage
        const people = await queryTableData('salary', maxSalary);
        
        if (people && people.length > 0) {
            displayPersonResults(people);
        } else {
            showStatus('searchResults', `No people found with salary less than ${maxSalary}`, 'info');
        }
        
    } catch (error) {
        console.error('Error searching by salary:', error);
        showStatus('searchResults', `Error searching: ${error.message}`, 'error');
    }
}

// Management Functions
async function updatePerson() {
    const name = document.getElementById('updateName').value.trim();
    const field = document.getElementById('updateField').value.trim();
    const value = document.getElementById('updateValue').value.trim();
    
    if (!name || !field || !value) {
        showStatus('manageStatus', 'Please fill in all fields', 'error');
        return;
    }
    
    try {
        showStatus('manageStatus', `Updating ${field} for ${name}...`, 'info');
        
        // Here we would update Azure Table Storage
        await updateTableData(name, field, value);
        
        showStatus('manageStatus', `Successfully updated ${field} for ${name}!`, 'success');
        
        // Clear the form
        document.getElementById('updateName').value = '';
        document.getElementById('updateField').value = '';
        document.getElementById('updateValue').value = '';
        
    } catch (error) {
        console.error('Error updating person:', error);
        showStatus('manageStatus', `Error updating person: ${error.message}`, 'error');
    }
}

async function addPicture() {
    const name = document.getElementById('pictureName').value.trim();
    const fileInput = document.getElementById('newPicture');
    const file = fileInput.files[0];
    
    if (!name || !file) {
        showStatus('manageStatus', 'Please enter a name and select a picture', 'error');
        return;
    }
    
    if (!file.type.startsWith('image/')) {
        showStatus('manageStatus', 'Please select a valid image file', 'error');
        return;
    }
    
    try {
        showStatus('manageStatus', `Adding picture for ${name}...`, 'info');
        
        // Upload picture to blob storage
        await uploadBlob(file);
        
        // Update person record with picture filename
        await updateTableData(name, 'Picture', file.name);
        
        showStatus('manageStatus', `Successfully added picture for ${name}!`, 'success');
        
        // Clear the form
        document.getElementById('pictureName').value = '';
        document.getElementById('newPicture').value = '';
        
    } catch (error) {
        console.error('Error adding picture:', error);
        showStatus('manageStatus', `Error adding picture: ${error.message}`, 'error');
    }
}

async function removePerson() {
    const name = document.getElementById('removeName').value.trim();
    
    if (!name) {
        showStatus('manageStatus', 'Please enter a name to remove', 'error');
        return;
    }
    
    if (!confirm(`Are you sure you want to remove ${name}? This action cannot be undone.`)) {
        return;
    }
    
    try {
        showStatus('manageStatus', `Removing ${name}...`, 'info');
        
        // Here we would delete from Azure Table Storage
        await deleteTableData(name);
        
        showStatus('manageStatus', `Successfully removed ${name}!`, 'success');
        
        // Clear the form
        document.getElementById('removeName').value = '';
        
    } catch (error) {
        console.error('Error removing person:', error);
        showStatus('manageStatus', `Error removing person: ${error.message}`, 'error');
    }
}

// Display Functions
function displayPersonResults(people) {
    const resultsContainer = document.getElementById('searchResults');
    
    if (!people || people.length === 0) {
        resultsContainer.innerHTML = '<p>No results found.</p>';
        return;
    }
    
    let html = `<h3>Found ${people.length} result(s):</h3>`;
    
    people.forEach(person => {
        const imagePath = getImagePath(person.Picture);
        const imageSource = imagePath || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=';
        
        html += `
            <div class="person-card">
                <img src="${imageSource}" alt="${person.Name}" class="person-image" 
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4='" />
                <div class="person-details">
                    <h4>${person.Name}</h4>
                    <p><strong>State:</strong> ${person.State || 'N/A'}</p>
                    <p><strong>Salary:</strong> ${person.Salary ? '$' + person.Salary : 'N/A'}</p>
                    <p><strong>Grade:</strong> ${person.Grade || 'N/A'}</p>
                    <p><strong>Room:</strong> ${person.Room || 'N/A'}</p>
                    <p><strong>Phone:</strong> ${person.Telnum || 'N/A'}</p>
                    <p><strong>Picture:</strong> ${person.Picture || 'N/A'}</p>
                    <p><strong>Keywords:</strong> ${person.Keywords || 'N/A'}</p>
                </div>
            </div>
        `;
    });
    
    resultsContainer.innerHTML = html;
}

// Simulation Functions (Replace with real Azure calls)
async function simulateTableStorageUpload(data) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Process the data to show how it would be stored
    const processedData = data.map(person => ({
        PartitionKey: 'person',
        RowKey: person.Name,
        ...person
        // Note: Picture field keeps original filename (e.g., "tanzima.jpg")
        // The web app handles path mapping when displaying images
    }));
    
    console.log('Simulating upload to Table Storage:', processedData);
}

async function simulateBlobStorageUpload(file) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('Simulating upload to Blob Storage:', file.name);
}

async function simulateTableStorageQuery(type, value) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Sample data (replace with real Azure Table Storage queries)
    const sampleData = [
        { Name: 'Tanzima', State: 'CA', Salary: 220200, Grade: '', Room: '', Telnum: '', Picture: 'tanzima.jpg', Keywords: 'Tanzima works very hard' },
        { Name: 'Chuck', State: 'TX', Salary: 1000, Grade: 98, Room: 420, Telnum: '', Picture: 'chuck.jpg', Keywords: 'Jees is too' },
        { Name: 'Dave', State: 'NN', Salary: 20, Grade: 40, Room: 525, Telnum: 0, Picture: 'dave.jpg', Keywords: 'Who is this' },
        { Name: 'Tuan', State: 'CA', Salary: '', Grade: 80, Room: -1, Telnum: '', Picture: 'tuan.jpg', Keywords: 'Tuan is gone' }
    ];
    
    if (type === 'name') {
        return sampleData.find(person => person.Name.toLowerCase() === value.toLowerCase());
    } else if (type === 'salary') {
        return sampleData.filter(person => person.Salary && parseInt(person.Salary) < value);
    }
    
    return null;
}

async function simulateTableStorageUpdate(name, field, value) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log(`Simulating update: ${name}.${field} = ${value}`);
}

async function simulateTableStorageDelete(name) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log(`Simulating delete: ${name}`);
}

// Real Azure Storage Functions (replace simulation when USE_AZURE_STORAGE = true)
async function realTableStorageUpload(data) {
    if (!azureStorage) throw new Error('Azure Storage not initialized');
    
    const results = [];
    for (const person of data) {
        try {
            const result = await azureStorage.createEntity(person);
            results.push({ success: true, person: person.Name });
        } catch (error) {
            console.error(`Failed to upload ${person.Name}:`, error);
            results.push({ success: false, person: person.Name, error: error.message });
        }
    }
    return results;
}

async function realBlobStorageUpload(file) {
    if (!azureStorage) throw new Error('Azure Storage not initialized');
    
    const blobName = file.name;
    await azureStorage.uploadBlob(file, blobName);
    return azureStorage.getBlobUrl(blobName);
}

async function realTableStorageQuery(type, value) {
    if (!azureStorage) throw new Error('Azure Storage not initialized');
    
    let filter = '';
    if (type === 'name') {
        filter = `RowKey eq '${value}'`;
    } else if (type === 'salary') {
        filter = `Salary lt ${value}`;
    }
    
    const entities = await azureStorage.queryEntities(filter);
    
    if (type === 'name') {
        return entities.length > 0 ? entities[0] : null;
    } else {
        return entities;
    }
}

async function realTableStorageUpdate(name, field, value) {
    if (!azureStorage) throw new Error('Azure Storage not initialized');
    
    // First, get the existing entity
    const entity = await azureStorage.getEntity('person', name);
    
    // Update the field
    entity[field] = value;
    
    // Save back to Azure
    await azureStorage.updateEntity('person', name, entity);
}

async function realTableStorageDelete(name) {
    if (!azureStorage) throw new Error('Azure Storage not initialized');
    
    await azureStorage.deleteEntity('person', name);
}

// Wrapper functions that choose between real Azure or simulation
async function uploadTableData(data) {
    if (USE_AZURE_STORAGE && azureStorage) {
        return await realTableStorageUpload(data);
    } else {
        return await simulateTableStorageUpload(data);
    }
}

async function uploadBlob(file) {
    if (USE_AZURE_STORAGE && azureStorage) {
        return await realBlobStorageUpload(file);
    } else {
        return await simulateBlobStorageUpload(file);
    }
}

async function queryTableData(type, value) {
    if (USE_AZURE_STORAGE && azureStorage) {
        return await realTableStorageQuery(type, value);
    } else {
        return await simulateTableStorageQuery(type, value);
    }
}

async function updateTableData(name, field, value) {
    if (USE_AZURE_STORAGE && azureStorage) {
        return await realTableStorageUpdate(name, field, value);
    } else {
        return await simulateTableStorageUpdate(name, field, value);
    }
}

async function deleteTableData(name) {
    if (USE_AZURE_STORAGE && azureStorage) {
        return await realTableStorageDelete(name);
    } else {
        return await simulateTableStorageDelete(name);
    }
}

// Simulation Functions (used when USE_AZURE_STORAGE = false)

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('Cloud Picture Storage System initialized');
    
    // Try to initialize Azure Storage
    const azureInitialized = initializeAzureStorage();
    
    if (USE_AZURE_STORAGE) {
        if (azureInitialized) {
            showStatus('csvStatus', 'Ready to upload CSV file (Azure Storage connected)', 'success');
            showStatus('pictureStatus', 'Ready to upload pictures (Azure Storage connected)', 'success');
        } else {
            showStatus('csvStatus', 'Azure Storage not configured - using simulation mode', 'info');
            showStatus('pictureStatus', 'Azure Storage not configured - using simulation mode', 'info');
        }
    } else {
        showStatus('csvStatus', 'Ready to upload CSV file (simulation mode)', 'info');
        showStatus('pictureStatus', 'Ready to upload pictures (simulation mode)', 'info');
    }
});
