# Earthquake Data Visualization Project

## Overview
A web application for visualizing earthquake data using Firebase Firestore and Chart.js. Upload CSV files and create interactive pie charts, bar charts, and scatter plots.

## Features
- 📁 Multiple file format support:
  - **CSV** - Comma-separated values (uses Papa Parse for robust parsing)
  - **JSON** - JavaScript Object Notation (handles various structures)
  - **XML** - Extensible Markup Language (auto-detects data elements)
  - **Excel** - .xlsx and .xls files (uses SheetJS/XLSX library)
- 🔥 Firebase Firestore integration
- 📊 Three visualization types:
  - Pie Chart (single category distribution)
  - Bar Chart (comparison between two categories)
  - Scatter Plot (relationship between two numeric variables)
- 📋 Collapsible data table view
- 🎨 Modern, responsive UI

## Setup Instructions

### 1. Firebase Configuration
You need to add your Firebase configuration to `app.js`:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing one
3. Go to Project Settings → General → Your apps
4. Copy your Firebase config
5. Replace the placeholder config in `app.js` (lines 2-8):

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

### 2. Enable Firestore Database
1. In Firebase Console, go to Firestore Database
2. Click "Create database"
3. Choose production mode or test mode
4. Select your region
5. The app uses collection name: `earthquakeData`

### 3. Deploy Firestore Rules
Your `firestore.rules` file is already set up for development (permissive access).

**⚠️ IMPORTANT:** For production, update rules to be more restrictive!

### 4. GitHub Deployment Options

#### Option A: GitHub Pages (Static Hosting)
```bash
# Enable GitHub Pages in repository settings
# Settings → Pages → Source: main branch

# Your site will be at:
# https://[username].github.io/[repository-name]/
```

#### Option B: Firebase Hosting
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize hosting
firebase init hosting

# Deploy
firebase deploy --only hosting
```

## File Format Support

The application accepts multiple file formats for maximum flexibility:

### CSV (Comma-Separated Values)
```csv
magnitude,depth,latitude,longitude,location
2.5,10.3,34.05,-118.25,California
3.1,15.7,40.71,-74.01,New York
1.8,5.2,37.77,-122.42,San Francisco
```
- Uses Papa Parse library for robust parsing
- Handles quoted fields, special characters
- Auto-detects numeric vs string columns

### JSON (JavaScript Object Notation)
```json
[
  {
    "magnitude": 2.5,
    "depth": 10.3,
    "latitude": 34.05,
    "longitude": -118.25,
    "location": "California"
  },
  {
    "magnitude": 3.1,
    "depth": 15.7,
    "latitude": 40.71,
    "longitude": -74.01,
    "location": "New York"
  }
]
```
- Supports multiple structures: direct arrays, nested data objects
- Automatically flattens nested objects (e.g., `location.city` becomes `location.city`)
- Handles arrays within objects by converting to comma-separated strings

Supported JSON structures:
- Direct array: `[{...}, {...}]`
- Wrapped data: `{"data": [{...}]}`, `{"records": [{...}]}`, `{"results": [{...}]}`
- Any object with an array property

### XML (Extensible Markup Language)
```xml
<?xml version="1.0"?>
<earthquakes>
  <earthquake>
    <magnitude>2.5</magnitude>
    <depth>10.3</depth>
    <latitude>34.05</latitude>
    <longitude>-118.25</longitude>
    <location>California</location>
  </earthquake>
  <earthquake>
    <magnitude>3.1</magnitude>
    <depth>15.7</depth>
    <latitude>40.71</latitude>
    <longitude>-74.01</longitude>
    <location>New York</location>
  </earthquake>
</earthquakes>
```
- Auto-detects repeating elements (looks for common patterns: `<record>`, `<item>`, `<row>`, `<entry>`)
- Extracts both element text content and attributes
- Converts to flat object structure

### Excel (.xlsx, .xls)
- Reads the first sheet by default
- Converts to JSON format internally
- Preserves column headers from first row
- Handles dates, formulas, and various cell types
- Uses SheetJS (XLSX) library for parsing

## File Format Guidelines

**Choose the best format for your data:**
- **CSV**: Simple tabular data, easy to create/edit
- **JSON**: Complex nested data, API responses
- **XML**: Legacy systems, hierarchical data
- **Excel**: Existing spreadsheets, formatted data

**All formats support:**
- Automatic numeric type detection
- Mixed text and numeric columns
- Missing/empty values
- Large datasets (thousands of rows)

## Usage

1. **Upload Data File**: Click "Choose File" and select your CSV, JSON, XML, or Excel file
2. **Upload to Firebase**: Click "Upload to Firebase" button
3. **Select Chart Type**: Choose Pie Chart, Bar Chart, or Scatter Plot
4. **Configure Chart**:
   - **Pie Chart**: Select one category to visualize its distribution
   - **Bar/Scatter**: Select different categories for X and Y axes
5. **View Results**: Chart appears automatically (for pie) or after clicking "Generate Chart"
6. **Toggle Table**: Click "Show/Hide Data Table" to view raw data

## Technical Details

### Technologies Used
- HTML5/CSS3 with modern styling
- Vanilla JavaScript (ES6+)
- Firebase SDK 9.22.0 (compat mode)
- Chart.js 4.4.0 for visualizations
- Papa Parse 5.4.1 for CSV parsing
- SheetJS (XLSX) 0.18.5 for Excel support
- No build process required!

### File Structure
```
.
├── index.html          # Main HTML interface
├── app.js             # JavaScript application logic
├── firestore.rules    # Firebase security rules
└── README.md          # This file
```

### Browser Compatibility
- Chrome/Edge (recommended)
- Firefox
- Safari
- Mobile browsers

## Potential Issues & Solutions

### Issue 1: CORS Errors
**Problem**: Loading from `file://` protocol may cause CORS issues.
**Solution**: Use a local server or deploy to GitHub Pages/Firebase Hosting.

```bash
# Quick local server options:
python -m http.server 8000
# or
npx http-server
```

### Issue 2: Large CSV Files
**Problem**: Very large CSV files (>1MB) may be slow to upload.
**Solution**: Consider batching uploads or implementing pagination.

### Issue 3: Numeric vs String Data
**Problem**: CSV columns may be interpreted incorrectly.
**Solution**: The parser auto-detects numbers, but you may need to adjust logic in `parseCSV()` function.

### Issue 4: Firebase Quota Limits
**Problem**: Free tier has limits on reads/writes.
**Solution**: 
- Use caching (already implemented: data loads from memory after first upload)
- For production, upgrade to Blaze plan

### Issue 5: Same Category Selection
**Problem**: Bar/Scatter charts need different X and Y axes.
**Solution**: Already implemented validation to prevent this!

## Customization Ideas

1. **Add more chart types**: Line charts, area charts, etc.
2. **Data filtering**: Add date range or value filters
3. **Export functionality**: Download charts as images
4. **Multiple datasets**: Compare data from different uploads
5. **Real-time updates**: Use Firebase real-time listeners
6. **Authentication**: Add user login for personalized data

## Assignment Requirements Checklist
✅ Cloud-based (Firebase Firestore)  
✅ No local installs required  
✅ Runs in browser  
✅ Three visualization types  
✅ Interactive user interface  
✅ Query results displayed graphically  
✅ Responsive design  
✅ Uses JavaScript visualization library (Chart.js)  

## Troubleshooting

**Chart not appearing?**
- Check browser console for errors
- Ensure Firebase config is correct
- Verify data was uploaded successfully

**Data table empty?**
- Ensure CSV has correct format
- Check that file was selected and uploaded
- Look for status messages

**Firebase errors?**
- Verify Firebase project is active
- Check Firestore rules allow access
- Ensure correct collection name

## License
Academic project for CSE 6332 Cloud Computing, Fall 2025, UTA
