const express = require('express');
const cors = require('cors');
const path = require('path');
const postgresApi = require('./api/postgresApi');

// 创建Express应用
const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());

// API路由
app.use('/api/postgres', postgresApi);

// 静态文件服务 - React应用
app.use(express.static(path.join(__dirname, '../build')));

// 所有其他请求都返回React应用
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../build', 'index.html'));
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err.stack);
  res.status(500).json({
    error: '服务器内部错误',
    message: process.env.NODE_ENV === 'production' ? '发生错误' : err.message
  });
});

// 启动服务器，监听所有接口
app.listen(PORT, '0.0.0.0', () => {
  console.log(`服务器运行在 http://0.0.0.0:${PORT}`);
});

module.exports = app; 