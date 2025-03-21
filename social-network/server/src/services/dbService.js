const { Pool } = require('pg');

// 从环境变量获取PostgreSQL连接配置
const pgConfig = {
  host: process.env.PG_HOST || 'postgres-db-service',
  port: parseInt(process.env.PG_PORT || '5432'),
  database: process.env.PG_DATABASE || 'social_network',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'password',
  // 额外连接设置
  max: 20, // 连接池中最大连接数
  idleTimeoutMillis: 30000, // 连接最大空闲时间
  connectionTimeoutMillis: 2000, // 连接超时
  statement_timeout: 5000, // 查询超时
};

// 创建连接池
let pool;
try {
  pool = new Pool(pgConfig);
  console.log('PostgreSQL连接池初始化成功');
} catch (error) {
  console.error('初始化PostgreSQL连接池失败:', error);
  // 如果初始化失败，创建一个空的mock池
  pool = {
    query: async () => { throw new Error('PostgreSQL连接不可用'); },
    on: () => {}
  };
}

// 初始化连接
pool.on('connect', () => {
  console.log('已连接到PostgreSQL数据库');
});

pool.on('error', (err) => {
  console.error('PostgreSQL连接错误:', err);
});

// 最大重试次数
const MAX_RETRIES = 3;

/**
 * 带重试功能的查询执行
 * @param {string} queryText - SQL查询
 * @param {Array} params - 查询参数
 * @param {number} retries - 当前重试次数
 * @returns {Promise<Object>} - 查询结果
 */
const executeQueryWithRetry = async (queryText, params, retries = 0) => {
  try {
    return await pool.query(queryText, params);
  } catch (error) {
    // 如果是连接错误且未达到最大重试次数
    if ((error.code === 'ECONNREFUSED' || error.code === '57P01' || error.code === '08006') && retries < MAX_RETRIES) {
      console.log(`重试PostgreSQL查询，尝试 ${retries + 1}/${MAX_RETRIES}`);
      
      // 延迟重试以避免服务器过载
      await new Promise(resolve => setTimeout(resolve, 1000 * (retries + 1)));
      
      return executeQueryWithRetry(queryText, params, retries + 1);
    }
    
    // 如果达到最大重试次数或是其他类型的错误，抛出
    throw error;
  }
};

/**
 * 将用户信息保存到PostgreSQL数据库
 * @param {string} id - 用户ID (来自Firebase Auth)
 * @param {string} email - 用户邮箱
 * @returns {Promise<boolean>} - 操作是否成功
 */
const saveUserToPostgres = async (id, email) => {
  if (!id || !email) {
    console.error('无效的用户数据用于PostgreSQL备份');
    return false;
  }

  try {
    console.log(`保存用户到PostgreSQL备份: ${id}`);
    
    // 检查用户是否已存在
    const checkQuery = 'SELECT id FROM users WHERE id = $1';
    const checkResult = await executeQueryWithRetry(checkQuery, [id]);
    
    if (checkResult.rowCount > 0) {
      // 用户存在，更新记录
      const updateQuery = 'UPDATE users SET email = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2';
      await executeQueryWithRetry(updateQuery, [email, id]);
      console.log(`用户在PostgreSQL备份中已更新: ${id}`);
    } else {
      // 创建新用户记录
      const insertQuery = 'INSERT INTO users (id, email) VALUES ($1, $2)';
      await executeQueryWithRetry(insertQuery, [id, email]);
      console.log(`用户在PostgreSQL备份中已创建: ${id}`);
    }
    
    return true;
  } catch (error) {
    console.error('保存用户到PostgreSQL时出错:', error);
    return false;
  }
};

/**
 * 从PostgreSQL获取用户信息
 * @param {string} id - 用户ID
 * @returns {Promise<Object|null>} - 用户数据或null
 */
const getUserFromPostgres = async (id) => {
  if (!id) {
    console.error('无效的用户ID用于PostgreSQL查询');
    return null;
  }
  
  try {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await executeQueryWithRetry(query, [id]);
    
    if (result.rowCount > 0) {
      return result.rows[0];
    }
    
    return null;
  } catch (error) {
    console.error('从PostgreSQL获取用户时出错:', error);
    return null;
  }
};

/**
 * 通过邮箱查找用户
 * @param {string} email - 用户邮箱
 * @returns {Promise<Object|null>} - 用户数据或null
 */
const findUserByEmail = async (email) => {
  if (!email) {
    console.error('无效的邮箱用于PostgreSQL查询');
    return null;
  }
  
  try {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await executeQueryWithRetry(query, [email]);
    
    if (result.rowCount > 0) {
      return result.rows[0];
    }
    
    return null;
  } catch (error) {
    console.error('通过邮箱在PostgreSQL中查找用户时出错:', error);
    return null;
  }
};

/**
 * 检查数据库连接状态
 * @returns {Promise<boolean>} 连接是否健康
 */
const checkDatabaseConnection = async () => {
  try {
    await executeQueryWithRetry('SELECT NOW()', []);
    return true;
  } catch (error) {
    console.error('PostgreSQL连接检查失败:', error);
    return false;
  }
};

/**
 * 清理连接池
 * 在应用退出前调用以正确关闭所有连接
 */
const closeConnectionPool = async () => {
  try {
    console.log('关闭PostgreSQL连接池');
    await pool.end();
    console.log('PostgreSQL连接池成功关闭');
    return true;
  } catch (error) {
    console.error('关闭PostgreSQL连接池时出错:', error);
    return false;
  }
};

/**
 * 批量保存用户
 * @param {Array<Object>} users - 用户对象数组 
 * @returns {Promise<boolean>} - 操作是否成功
 */
const bulkSaveUsers = async (users) => {
  if (!Array.isArray(users) || users.length === 0) {
    console.error('无效的用户数组用于批量保存');
    return false;
  }

  try {
    console.log(`批量保存${users.length}个用户到PostgreSQL`);
    
    // 启动事务
    await executeQueryWithRetry('BEGIN', []);
    
    for (const user of users) {
      if (!user.id || !user.email) continue;
      
      // 使用UPSERT模式
      const upsertQuery = `
        INSERT INTO users (id, email) 
        VALUES ($1, $2)
        ON CONFLICT (id) 
        DO UPDATE SET email = $2, updated_at = CURRENT_TIMESTAMP
      `;
      
      await executeQueryWithRetry(upsertQuery, [user.id, user.email]);
    }
    
    // 提交事务
    await executeQueryWithRetry('COMMIT', []);
    console.log('批量用户保存成功');
    return true;
  } catch (error) {
    // 回滚事务
    try {
      await executeQueryWithRetry('ROLLBACK', []);
    } catch (rollbackError) {
      console.error('回滚事务时出错:', rollbackError);
    }
    
    console.error('批量保存用户到PostgreSQL时出错:', error);
    return false;
  }
};

module.exports = {
  pool,
  saveUserToPostgres,
  getUserFromPostgres,
  findUserByEmail,
  checkDatabaseConnection,
  closeConnectionPool,
  bulkSaveUsers
}; 