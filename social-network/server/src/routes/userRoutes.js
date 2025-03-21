const express = require('express');
const router = express.Router();
const { auth } = require('../config/firebase');
const { 
  saveUserToPostgres, 
  getUserFromPostgres, 
  findUserByEmail 
} = require('../services/dbService');

// 获取用户信息
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 首先尝试从Firebase获取用户
    let userData;
    try {
      userData = await auth.getUser(id);
    } catch (firebaseError) {
      console.log('Firebase获取用户失败，尝试从PostgreSQL获取');
      
      // 然后尝试从PostgreSQL获取
      userData = await getUserFromPostgres(id);
      
      if (!userData) {
        return res.status(404).json({
          status: 'error',
          message: '未找到用户'
        });
      }
    }
    
    return res.json({
      status: 'success',
      data: userData
    });
  } catch (error) {
    console.error('获取用户信息时出错:', error);
    return res.status(500).json({
      status: 'error',
      message: '服务器内部错误',
      error: error.message
    });
  }
});

// 创建或更新用户
router.post('/', async (req, res) => {
  try {
    const { id, email } = req.body;
    
    if (!id || !email) {
      return res.status(400).json({
        status: 'error',
        message: '缺少必要参数'
      });
    }
    
    // 保存到PostgreSQL
    const success = await saveUserToPostgres(id, email);
    
    if (!success) {
      return res.status(500).json({
        status: 'error',
        message: '保存用户到PostgreSQL失败'
      });
    }
    
    return res.json({
      status: 'success',
      message: '用户已保存',
      data: { id, email }
    });
  } catch (error) {
    console.error('保存用户时出错:', error);
    return res.status(500).json({
      status: 'error',
      message: '服务器内部错误',
      error: error.message
    });
  }
});

// 通过邮箱查找用户
router.get('/email/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    // 首先尝试从Firebase获取用户
    let userData;
    try {
      userData = await auth.getUserByEmail(email);
    } catch (firebaseError) {
      console.log('Firebase通过邮箱获取用户失败，尝试从PostgreSQL获取');
      
      // 然后尝试从PostgreSQL获取
      userData = await findUserByEmail(email);
      
      if (!userData) {
        return res.status(404).json({
          status: 'error',
          message: '未找到用户'
        });
      }
    }
    
    return res.json({
      status: 'success',
      data: userData
    });
  } catch (error) {
    console.error('通过邮箱获取用户时出错:', error);
    return res.status(500).json({
      status: 'error',
      message: '服务器内部错误',
      error: error.message
    });
  }
});

module.exports = router; 