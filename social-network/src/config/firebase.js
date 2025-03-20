// src/config/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

console.log("Initializing Firebase configuration...");

// Firebase configuration - replace with your own config values
const firebaseConfig = {
    apiKey: "AIzaSyADLvSeHqoaUxGrOoYW1SgZ8C-U9SnxyNI",
    authDomain: "ece9016-social-network.firebaseapp.com",
    projectId: "ece9016-social-network",
    storageBucket: "ece9016-social-network-dev", // Development storage bucket
    messagingSenderId: "225967251911",
    appId: "1:225967251911:web:941fb1cd132fb58d0739e2",
    measurementId: "G-WWKBH34GPZ",
    databaseURL: "https://ece9016-social-network-default-rtdb.firebaseio.com"
};

// Export the storage bucket name for other modules to use
export const STORAGE_BUCKET_NAME = firebaseConfig.storageBucket;
console.log("Firebase storage bucket configuration:", STORAGE_BUCKET_NAME);

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the services we'll use
export const auth = getAuth(app);

// Listen for authentication state changes
onAuthStateChanged(auth, (user) => {
  if (user) {
    // User is logged in
    console.log('User logged in:', user.uid);
    console.log('Email verified:', user.emailVerified);
    console.log('Providers:', user.providerData.map(p => p.providerId).join(', '));
  } else {
    // User is not logged in
    console.log('Note: User not logged in, may cause permission issues');
  }
});

// Initialize Firestore
export const db = getFirestore(app);
// Use database alias, correct format is "projects/PROJECT_ID/databases/DATABASE_NAME"
db._databaseId = { projectId: 'ece9016-social-network', database: 'social-dev' };
console.log("Firestore database name:", db._databaseId);

// Use the storage bucket specified in the configuration
export const storage = getStorage(app);
console.log("Storage initialization complete, bucket:", STORAGE_BUCKET_NAME);

export default app;