# Firebase Setup Instructions

## Your Firebase Project: realquiz2

Great! You've created your Firebase database. Now we need to get your configuration details and enable GitHub Pages.

## Step 1: Get Firebase Configuration

1. Go to your Firebase Console: https://console.firebase.google.com/project/realquiz2
2. Click the ⚙️ **Settings** gear icon → **Project settings**
3. Scroll down to **Your apps** section
4. Click **Add app** → **Web app** (</> icon)
5. Give it a name like "Earthquake Analysis App"
6. **Check** "Also set up Firebase Hosting" (optional but recommended)
7. Click **Register app**

You'll see a configuration object like this:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyAbc123...",
  authDomain: "realquiz2.firebaseapp.com",
  projectId: "realquiz2",
  storageBucket: "realquiz2.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123..."
};
```

## Step 2: Update Your Files

Replace the placeholder values in both `index.html` and `search.html` with your actual values:
- Replace `"your-api-key-here"` with your actual `apiKey`
- Replace `"your-sender-id"` with your actual `messagingSenderId`
- Replace `"your-app-id"` with your actual `appId`

## Step 3: Enable GitHub Pages

1. Go to your GitHub repository: https://github.com/Benjination/Cloud-Computing-Big-Data
2. Click **Settings** tab
3. Scroll down to **Pages** in the left sidebar
4. Under **Source**, select **Deploy from a branch**
5. Choose **main** branch and **/ (root)** folder
6. Click **Save**

Your site will be available at: `https://benjination.github.io/Cloud-Computing-Big-Data/`

## Step 4: Upload Your Data

1. Visit your live site
2. Click **"Upload CSV to Firebase"**
3. Select your `earthquakes.csv` file
4. Wait for upload to complete

## Step 5: Test Everything

Visit: `https://benjination.github.io/Cloud-Computing-Big-Data/search.html`

Test these searches:
- Magnitude > 5.0
- Near location: 34.0522, -118.2437 (Los Angeles)
- Magnitude range: 4.0 to 6.0

## Troubleshooting

If you get CORS errors:
1. In Firebase Console → Firestore Database
2. Go to **Rules** tab
3. Make sure rules allow read/write:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

## Next Steps

Your earthquake analysis site will be:
- ✅ Completely free forever
- ✅ Fast (static hosting + CDN)
- ✅ Scalable (Firebase handles traffic)
- ✅ Professional looking
- ✅ All original features preserved

Total setup time: ~10 minutes
Monthly cost: $0.00