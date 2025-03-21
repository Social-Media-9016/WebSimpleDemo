require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

// 导入路由
const userRoutes = require('./routes/userRoutes');
// 其他路由在这里导入...

// 创建Express应用
const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(helmet()); // 设置多种安全相关的HTTP头
app.use(morgan('combined')); // 请求日志
app.use(cors()); // 允许跨域请求
app.use(express.json()); // 解析JSON请求体
app.use(express.urlencoded({ extended: true })); // 解析URL编码的请求体

// 根路由 - 健康检查
app.get('/', (req, res) => {
  res.json({ 
    status: 'online',
    message: 'Social Network API服务正在运行',
    timestamp: new Date().toISOString()
  });
});

// API路由
app.use('/api/users', userRoutes);
// 其他路由在这里注册...

// 404处理
app.use((req, res, next) => {
  res.status(404).json({
    status: 'error',
    message: `Not Found - ${req.originalUrl}`
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err.stack);
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || '服务器内部错误',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});

// 处理未捕获的异常和拒绝的Promise
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  // 在生产环境中，可能需要在这里优雅地终止进程
  // process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
});

// 处理关闭信号，清理资源
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

async function shutdown() {
  console.log('正在关闭应用...');
  
  try {
    // 清理数据库连接
    const dbService = require('./services/dbService');
    await dbService.closeConnectionPool();
    
    console.log('应用已优雅关闭');
    process.exit(0);
  } catch (error) {
    console.error('关闭时出错:', error);
    process.exit(1);
  }
} 