// src/config/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

console.log("Initializing Firebase configuration...");

// 从环境变量加载Firebase配置
const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyADLvSeHqoaUxGrOoYW1SgZ8C-U9SnxyNI",
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "ece9016-social-network.firebaseapp.com",
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "ece9016-social-network",
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "ece9016-social-network-dev",
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "225967251911",
    appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:225967251911:web:941fb1cd132fb58d0739e2",
    measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-WWKBH34GPZ",
    databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL || "https://ece9016-social-network-default-rtdb.firebaseio.com"
};

// 导出存储桶名称供其他模块使用
export const STORAGE_BUCKET_NAME = firebaseConfig.storageBucket;
console.log("Firebase storage bucket configuration:", STORAGE_BUCKET_NAME);

// 初始化Firebase
const app = initializeApp(firebaseConfig);

// 导出我们将使用的服务
export const auth = getAuth(app);

// 监听认证状态变化
onAuthStateChanged(auth, (user) => {
  if (user) {
    // 用户已登录
    console.log('User logged in:', user.uid);
    console.log('Email verified:', user.emailVerified);
    console.log('Providers:', user.providerData.map(p => p.providerId).join(', '));
  } else {
    // 用户未登录
    console.log('Note: User not logged in, may cause permission issues');
  }
});

// 初始化Firestore
export const db = getFirestore(app);

// 使用环境变量来设置数据库名称
const firestoreDatabase = process.env.REACT_APP_FIREBASE_FIRESTORE_DATABASE || 'social-dev';
// 使用数据库别名，正确格式为 "projects/PROJECT_ID/databases/DATABASE_NAME"
db._databaseId = { 
  projectId: firebaseConfig.projectId, 
  database: firestoreDatabase 
};
console.log("Firestore database name:", db._databaseId);

// 使用配置中指定的存储桶
export const storage = getStorage(app);
console.log("Storage initialized, bucket:", STORAGE_BUCKET_NAME);

export default app;