#!/usr/bin/env node
require('dotenv').config({ path: '../server/.env' });
const { Pool } = require('pg');
const fetch = require('node-fetch');
const readline = require('readline');

// 创建命令行界面
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// PostgreSQL 连接配置
const pgConfig = {
  host: process.env.PG_HOST || 'postgres-db-service',
  port: parseInt(process.env.PG_PORT || '5432'),
  database: process.env.PG_DATABASE || 'social_network',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'password',
};

// 创建数据库连接
const pool = new Pool(pgConfig);

// API端点 (默认为本地API)
const API_URL = process.env.API_URL || 'http://localhost:3001';

// 测试数据库连接
async function testConnection() {
  try {
    console.log('测试 PostgreSQL 连接...');
    console.log(`连接参数: ${JSON.stringify({
      host: pgConfig.host,
      port: pgConfig.port,
      database: pgConfig.database,
      user: pgConfig.user
    })}`);
    
    const result = await pool.query('SELECT NOW() as time');
    console.log('✅ 连接成功!');
    console.log(`服务器时间: ${result.rows[0].time}`);
    return true;
  } catch (error) {
    console.error('❌ 连接失败:', error.message);
    return false;
  }
}

// 查询当前用户数
async function countUsers() {
  try {
    console.log('查询现有用户...');
    const result = await pool.query('SELECT COUNT(*) FROM users');
    console.log(`数据库中共有 ${result.rows[0].count} 个用户`);
    return parseInt(result.rows[0].count);
  } catch (error) {
    console.error('查询失败:', error.message);
    return 0;
  }
}

// 通过API创建测试用户
async function createTestUser(id, email) {
  try {
    console.log(`尝试创建测试用户: ${id}, ${email}`);
    
    const response = await fetch(`${API_URL}/api/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ id, email })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ 用户创建成功:', data);
      return true;
    } else {
      console.error('❌ 用户创建失败:', data);
      return false;
    }
  } catch (error) {
    console.error('请求错误:', error.message);
    return false;
  }
}

// 直接向数据库插入测试用户
async function insertUserDirectly(id, email) {
  try {
    console.log(`直接向PostgreSQL插入用户: ${id}, ${email}`);
    
    const result = await pool.query(
      'INSERT INTO users (id, email) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET email = $2 RETURNING *',
      [id, email]
    );
    
    console.log('✅ 插入成功:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('❌ 插入失败:', error.message);
    return false;
  }
}

// 展示用户表中所有用户
async function listAllUsers() {
  try {
    console.log('获取所有用户...');
    const result = await pool.query('SELECT * FROM users');
    
    if (result.rows.length === 0) {
      console.log('没有找到用户');
    } else {
      console.log('用户列表:');
      result.rows.forEach(user => {
        console.log(`ID: ${user.id}, Email: ${user.email}, 创建时间: ${user.created_at}`);
      });
    }
    
    return result.rows;
  } catch (error) {
    console.error('查询失败:', error.message);
    return [];
  }
}

// 主菜单
async function showMenu() {
  console.log('\n===== PostgreSQL 用户同步测试工具 =====');
  console.log('1. 测试数据库连接');
  console.log('2. 查询用户数量');
  console.log('3. 通过API创建测试用户');
  console.log('4. 直接向数据库插入用户');
  console.log('5. 列出所有用户');
  console.log('0. 退出');
  
  rl.question('请选择操作 [0-5]: ', async (answer) => {
    switch (answer) {
      case '1':
        await testConnection();
        return showMenu();
      
      case '2':
        await countUsers();
        return showMenu();
      
      case '3':
        rl.question('输入用户ID: ', (id) => {
          rl.question('输入用户Email: ', async (email) => {
            await createTestUser(id, email);
            return showMenu();
          });
        });
        break;
      
      case '4':
        rl.question('输入用户ID: ', (id) => {
          rl.question('输入用户Email: ', async (email) => {
            await insertUserDirectly(id, email);
            return showMenu();
          });
        });
        break;
      
      case '5':
        await listAllUsers();
        return showMenu();
      
      case '0':
        console.log('退出程序');
        rl.close();
        await pool.end();
        process.exit(0);
        break;
      
      default:
        console.log('无效的选择，请重试');
        return showMenu();
    }
  });
}

// 启动脚本
(async () => {
  console.log('===== PostgreSQL 用户同步测试工具 =====');
  await testConnection();
  showMenu();
})(); 