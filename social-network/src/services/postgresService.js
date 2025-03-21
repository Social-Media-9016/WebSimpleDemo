/**
 * PostgreSQL用户数据操作服务
 */

/**
 * 将用户数据保存到PostgreSQL数据库
 * @param {string} userId - 用户ID
 * @param {string} email - 用户邮箱
 * @returns {Promise<boolean>} - 保存成功返回true
 */
export const saveUserToPostgres = async (userId, email) => {
  try {
    console.log(`保存用户到PostgreSQL: ID=${userId}, Email=${email}`);
    
    // 直接使用fetch API向内部PostgreSQL服务发送请求
    const response = await fetch('/api/postgres/save-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        email
      })
    });
    
    if (!response.ok) {
      console.error(`PostgreSQL保存失败: ${response.status}`);
      return false;
    }
    
    console.log('用户已成功保存到PostgreSQL');
    return true;
  } catch (error) {
    console.error('保存用户到PostgreSQL时出错:', error);
    // 不抛出错误，因为PostgreSQL只是辅助数据库
    // 即使PostgreSQL插入失败，主流程也应该继续
    return false;
  }
}; 