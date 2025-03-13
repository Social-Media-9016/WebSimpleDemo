// src/config/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration - replace with your own config values
const firebaseConfig = {
    apiKey: "AIzaSyADLvSeHqoaUxGrOoYW1SgZ8C-U9SnxyNI",
    authDomain: "ece9016-social-network.firebaseapp.com",
    projectId: "ece9016-social-network",
    storageBucket: "ece9016-social-network.firebasestorage.app",
    messagingSenderId: "225967251911",
    appId: "1:225967251911:web:941fb1cd132fb58d0739e2",
    measurementId: "G-WWKBH34GPZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the services we'll use
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;