// Firebase configuration
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js';
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    sendPasswordResetEmail
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc,
    collection,
    query,
    where,
    getDocs,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDVYNWr5f-rMo3Jp_nd8l65toBD3bye8IE",
  authDomain: "bencala-5bd3f.firebaseapp.com",
  projectId: "bencala-5bd3f",
  storageBucket: "bencala-5bd3f.firebasestorage.app",
  messagingSenderId: "666397941460",
  appId: "1:666397941460:web:2f3861a87a49d2e6936541",
  measurementId: "G-STX4RW1KGF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// DOM Elements
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const forgotPasswordForm = document.getElementById('forgotPasswordForm');
const googleSignInBtn = document.getElementById('googleSignInBtn');
const googleSignUpBtn = document.getElementById('googleSignUpBtn');
const signupLink = document.getElementById('signupLink');
const loginLink = document.getElementById('loginLink');
const forgotPasswordLink = document.getElementById('forgotPasswordLink');
const backToLoginLink = document.getElementById('backToLoginLink');

// Form switching functions
function showSignupForm(e) {
    e.preventDefault();
    loginForm.classList.add('hidden');
    signupForm.classList.remove('hidden');
    forgotPasswordForm.classList.add('hidden');
}

function showLoginForm(e) {
    e.preventDefault();
    loginForm.classList.remove('hidden');
    signupForm.classList.add('hidden');
    forgotPasswordForm.classList.add('hidden');
}

function showForgotPasswordForm(e) {
    e.preventDefault();
    loginForm.classList.add('hidden');
    signupForm.classList.add('hidden');
    forgotPasswordForm.classList.remove('hidden');
}

// Event listeners for form switching
signupLink.addEventListener('click', showSignupForm);
loginLink.addEventListener('click', showLoginForm);
forgotPasswordLink.addEventListener('click', showForgotPasswordForm);
backToLoginLink.addEventListener('click', showLoginForm);

// Sign In with Email/Password
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log('User signed in:', userCredential.user);
        showMessage('Successfully signed in!', 'success');
        // Redirect to game or dashboard
        // window.location.href = 'game.html';
    } catch (error) {
        console.error('Sign in error:', error);
        showMessage(getErrorMessage(error.code), 'error');
    }
});

// Sign Up with Email/Password
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (password !== confirmPassword) {
        showMessage('Passwords do not match', 'error');
        return;
    }
    
    if (password.length < 6) {
        showMessage('Password must be at least 6 characters', 'error');
        return;
    }
    
    try {
        // Create authentication account
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log('User created:', userCredential.user);
        
        // Prompt for username
        await promptForUsername(userCredential.user);
        
    } catch (error) {
        console.error('Sign up error:', error);
        showMessage(getErrorMessage(error.code), 'error');
    }
});

// Google Sign In
async function handleGoogleSignIn() {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        console.log('Google sign in successful:', result.user);
        
        // Check if user document exists in Firestore
        const userDoc = await getDoc(doc(db, 'users', result.user.uid));
        
        if (!userDoc.exists()) {
            // New user - prompt for username
            await promptForUsername(result.user);
        } else {
            showMessage('Successfully signed in with Google!', 'success');
            // Redirect to game or dashboard
            // window.location.href = 'game.html';
        }
    } catch (error) {
        console.error('Google sign in error:', error);
        showMessage(getErrorMessage(error.code), 'error');
    }
}

googleSignInBtn.addEventListener('click', handleGoogleSignIn);
googleSignUpBtn.addEventListener('click', handleGoogleSignIn);

// Forgot Password
forgotPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('resetEmail').value;
    
    try {
        await sendPasswordResetEmail(auth, email);
        showMessage('Password reset email sent! Check your inbox.', 'success');
        setTimeout(() => {
            showLoginForm(e);
        }, 2000);
    } catch (error) {
        console.error('Password reset error:', error);
        showMessage(getErrorMessage(error.code), 'error');
    }
});

// Helper function to display messages
function showMessage(message, type) {
    // Remove any existing messages
    const existingMessage = document.querySelector('.message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    const activeForm = document.querySelector('.auth-form:not(.hidden)');
    activeForm.insertBefore(messageDiv, activeForm.firstChild);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

// Helper function to get user-friendly error messages
function getErrorMessage(errorCode) {
    const errorMessages = {
        'auth/invalid-email': 'Invalid email address',
        'auth/user-disabled': 'This account has been disabled',
        'auth/user-not-found': 'No account found with this email',
        'auth/wrong-password': 'Incorrect password',
        'auth/email-already-in-use': 'An account with this email already exists',
        'auth/weak-password': 'Password is too weak',
        'auth/network-request-failed': 'Network error. Please check your connection',
        'auth/too-many-requests': 'Too many attempts. Please try again later',
        'auth/popup-closed-by-user': 'Sign in cancelled',
        'auth/cancelled-popup-request': 'Sign in cancelled'
    };
    
    return errorMessages[errorCode] || 'An error occurred. Please try again.';
}

// Prompt user for username and create Firestore document
async function promptForUsername(user) {
    const username = prompt('Choose a unique username (3-20 characters):');
    
    if (!username) {
        showMessage('Username is required', 'error');
        await auth.signOut();
        return;
    }
    
    if (username.length < 3 || username.length > 20) {
        showMessage('Username must be between 3 and 20 characters', 'error');
        await promptForUsername(user);
        return;
    }
    
    // Check if username is already taken
    const isAvailable = await checkUsernameAvailability(username);
    
    if (!isAvailable) {
        showMessage('Username is already taken. Please choose another.', 'error');
        await promptForUsername(user);
        return;
    }
    
    try {
        // Create user document in Firestore
        await createUserDocument(user.uid, username, user.email);
        showMessage('Account created successfully!', 'success');
        // Redirect to game or dashboard
        // window.location.href = 'game.html';
    } catch (error) {
        console.error('Error creating user document:', error);
        showMessage('Error setting up account. Please try again.', 'error');
        await auth.signOut();
    }
}

// Check if username is available
async function checkUsernameAvailability(username) {
    const usernameDoc = await getDoc(doc(db, 'usernames', username.toLowerCase()));
    return !usernameDoc.exists();
}

// Create user document in Firestore
async function createUserDocument(uid, username, email) {
    const userData = {
        uid: uid,
        username: username,
        email: email,
        groupId: null, // Not in a group yet
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp()
    };
    
    // Create user document
    await setDoc(doc(db, 'users', uid), userData);
    
    // Reserve username
    await setDoc(doc(db, 'usernames', username.toLowerCase()), {
        uid: uid,
        username: username
    });
    
    console.log('User document created successfully');
}

// Update last login timestamp
async function updateLastLogin(uid) {
    try {
        await setDoc(doc(db, 'users', uid), {
            lastLogin: serverTimestamp()
        }, { merge: true });
    } catch (error) {
        console.error('Error updating last login:', error);
    }
}

// Get user data from Firestore
async function getUserData(uid) {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
        return userDoc.data();
    }
    return null;
}

// Monitor auth state
auth.onAuthStateChanged(async (user) => {
    if (user) {
        console.log('User is signed in:', user);
        
        // Check if user has a Firestore document
        const userData = await getUserData(user.uid);
        
        if (userData) {
            // Update last login
            await updateLastLogin(user.uid);
            console.log('User data:', userData);
            // User is fully set up, redirect or show game
            // window.location.href = 'game.html';
        } else {
            // User exists in Auth but not in Firestore (shouldn't happen, but handle it)
            console.log('User missing Firestore document');
            await promptForUsername(user);
        }
    } else {
        console.log('No user signed in');
    }
});
