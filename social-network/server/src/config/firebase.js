const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// 尝试从环境变量或服务账号JSON文件初始化Firebase Admin
let firebaseConfig;

// 检查是否提供了服务账号文件路径
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
  try {
    // 从JSON文件读取服务账号配置
    const serviceAccount = require(serviceAccountPath);
    firebaseConfig = {
      credential: admin.credential.cert(serviceAccount)
    };
    console.log('使用服务账号文件初始化Firebase Admin');
  } catch (error) {
    console.error('读取Firebase服务账号文件出错:', error);
    throw error;
  }
} else {
  // 通过环境变量初始化
  console.log('使用环境变量初始化Firebase Admin');
  firebaseConfig = {
    projectId: process.env.FIREBASE_PROJECT_ID || 'ece9016-social-network',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'ece9016-social-network-dev'
  };

  // 如果在GCP内部环境运行，使用应用默认凭据
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GAE_APPLICATION) {
    firebaseConfig.credential = admin.credential.applicationDefault();
  } else if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    // 如果在开发环境中使用Firebase模拟器
    console.log('使用Firebase模拟器');
  } else {
    console.warn('没有找到Firebase凭据，将尝试使用应用默认凭据');
    firebaseConfig.credential = admin.credential.applicationDefault();
  }
}

// 添加数据库URL
if (process.env.FIREBASE_DATABASE_URL) {
  firebaseConfig.databaseURL = process.env.FIREBASE_DATABASE_URL;
} else {
  firebaseConfig.databaseURL = 'https://ece9016-social-network-default-rtdb.firebaseio.com';
}

// 初始化Firebase Admin
let app;
try {
  app = admin.initializeApp(firebaseConfig);
  console.log('Firebase Admin初始化成功');
} catch (error) {
  console.error('Firebase Admin初始化失败:', error);
  throw error;
}

// 导出服务
const auth = admin.auth();
const db = admin.firestore();
const rtdb = admin.database();
const storage = admin.storage();

// 使用数据库别名 (如果配置)
if (process.env.FIREBASE_FIRESTORE_DATABASE) {
  console.log(`使用Firestore数据库: ${process.env.FIREBASE_FIRESTORE_DATABASE}`);
  db._databaseId = { 
    projectId: process.env.FIREBASE_PROJECT_ID || 'ece9016-social-network',
    database: process.env.FIREBASE_FIRESTORE_DATABASE
  };
} else {
  console.log('使用默认Firestore数据库');
}

module.exports = {
  admin,
  app,
  auth,
  db,
  rtdb,
  storage
}; 