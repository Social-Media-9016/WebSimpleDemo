// src/config/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration - replace with your own config values
const firebaseConfig = {
    apiKey: "AIzaSyADLvSeHqoaUxGrOoYW1SgZ8C-U9SnxyNI",
    authDomain: "ece9016-social-network.firebaseapp.com",
    projectId: "ece9016-social-network",
    storageBucket: "ece9016-social-network-dev.appspot.com",
    messagingSenderId: "225967251911",
    appId: "1:225967251911:web:941fb1cd132fb58d0739e2",
    measurementId: "G-WWKBH34GPZ",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the services we'll use
export const auth = getAuth(app);

// 初始化Firestore并连接到social-dev数据库
export const db = getFirestore(app);
// 使用数据库别名，正确格式是 "projects/PROJECT_ID/databases/DATABASE_NAME"
db._databaseId = { projectId: 'ece9016-social-network', database: 'social-dev' };

// 使用默认存储桶
export const storage = getStorage(app, "ece9016-social-network-dev.appspot.com"); 

export default app;