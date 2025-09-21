# Firebase Quick Setup Guide for Quiz Project

## Your Firebase Project: realquiz2-a1d06

### 🚀 IMMEDIATE SETUP (5 minutes)

1. **Add Web App to Your Project**
   - Go to: https://console.firebase.google.com/project/realquiz2-a1d06/settings/general
   - Click "Add app" button
   - Choose the web icon `</>`
   - Enter app nickname: `quiz-app`
   - Click "Register app"
   - **COPY THE CONFIG OBJECT** (looks like the example below)

2. **Enable Firestore Database**
   - Go to: https://console.firebase.google.com/project/realquiz2-a1d06/firestore
   - Click "Create database"
   - Choose "Start in test mode"
   - Select region: `us-central1`
   - Click "Done"

3. **Update Your Files**
   - Open `firebase-index.html`
   - Find this section:
   ```javascript
   const firebaseConfig = {
       apiKey: "YOUR_API_KEY_HERE",
       authDomain: "realquiz2-a1d06.firebaseapp.com",
       // ... rest of config
   };
   ```
   - Replace with YOUR actual config from step 1
   - Repeat for `firebase-search.html`

### 📋 Example Config (Replace with your actual values)

```javascript
const firebaseConfig = {
    apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXX",
    authDomain: "realquiz2-a1d06.firebaseapp.com",
    projectId: "realquiz2-a1d06",
    storageBucket: "realquiz2-a1d06.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef123456789"
};
```

### 🔧 Customization for Your Quiz

**Collection Name:**
- Current: `quiz_data`
- Change in both files: Search for `COLLECTION_NAME = "quiz_data"`
- Replace with your data type (e.g., `earthquakes`, `restaurants`, `products`)

**Security Rules (for production):**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; // CHANGE FOR PRODUCTION
    }
  }
}
```

### ✅ Test Your Setup
1. Open `firebase-index.html` in browser
2. Click "Test Firebase Connection"
3. Should show "✅ Firebase connection successful!"
4. If errors, check console and verify config

### 🚀 During Quiz Day
1. Upload your CSV data using the upload page
2. Data will auto-detect field types (numeric, date, text)
3. Use search page for analysis and filtering
4. Export results as CSV or JSON

### 📁 Files Created
- `firebase-index.html` - Upload interface
- `firebase-search.html` - Search and analysis
- `firebase-setup.md` - This guide
- `steps.txt` - Complete preparation guide

**Project URL:** https://console.firebase.google.com/project/realquiz2-a1d06