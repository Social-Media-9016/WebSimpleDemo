const express = require('express');
const { Client } = require('pg');
const router = express.Router();

// PostgreSQL数据库连接配置
const pgConfig = {
  host: process.env.PG_HOST || 'postgres-db-service',
  port: process.env.PG_PORT || 5432,
  database: process.env.PG_DATABASE || 'social_network',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'password'
};

/**
 * 将用户数据保存到PostgreSQL
 */
router.post('/save-user', async (req, res) => {
  const { userId, email } = req.body;
  
  if (!userId || !email) {
    return res.status(400).json({ error: '用户ID和邮箱是必须的' });
  }
  
  const client = new Client(pgConfig);
  
  try {
    // 连接数据库
    await client.connect();
    console.log('成功连接到PostgreSQL数据库');
    
    // 准备SQL查询
    const query = `
      INSERT INTO users (id, email) 
      VALUES ($1, $2) 
      ON CONFLICT (id) DO UPDATE 
      SET email = $2, updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    
    // 执行查询
    const result = await client.query(query, [userId, email]);
    console.log('用户数据已成功保存到PostgreSQL');
    
    return res.status(201).json({ 
      success: true, 
      message: '用户数据已保存到PostgreSQL',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('PostgreSQL操作失败:', error);
    res.status(500).json({ error: '数据库操作失败', details: error.message });
  } finally {
    // 关闭数据库连接
    try {
      await client.end();
      console.log('PostgreSQL数据库连接已关闭');
    } catch (err) {
      console.error('关闭数据库连接时出错:', err);
    }
  }
});

module.exports = router; 