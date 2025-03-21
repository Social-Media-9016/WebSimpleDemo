#!/usr/bin/env node
require('dotenv').config();
const { admin } = require('../config/firebase');
const { saveUserToPostgres, bulkSaveUsers } = require('../services/dbService');

const BATCH_SIZE = parseInt(process.env.SYNC_BATCH_SIZE || '100');

console.log('开始同步Firebase用户到PostgreSQL...');
console.log(`批处理大小: ${BATCH_SIZE}个用户`);

// 获取Firebase用户并同步到PostgreSQL
async function syncUsersToPostgres() {
  let nextPageToken;
  let totalUsers = 0;
  let successCount = 0;
  let errorCount = 0;
  let startTime = Date.now();
  
  try {
    console.log('开始获取Firebase用户列表...');
    
    do {
      // 获取用户批次
      const listUsersResult = await admin.auth().listUsers(BATCH_SIZE, nextPageToken);
      nextPageToken = listUsersResult.pageToken;
      
      console.log(`获取到${listUsersResult.users.length}个用户`);
      totalUsers += listUsersResult.users.length;
      
      // 转换为简单对象用于批量插入
      const usersToSync = listUsersResult.users
        .filter(user => user.email) // 确保用户有邮箱
        .map(user => ({
          id: user.uid,
          email: user.email
        }));
      
      if (usersToSync.length > 0) {
        // 使用批量保存功能
        const batchSuccess = await bulkSaveUsers(usersToSync);
        
        if (batchSuccess) {
          successCount += usersToSync.length;
          console.log(`批量同步成功: ${usersToSync.length}个用户`);
        } else {
          // 如果批量保存失败，尝试单个保存
          console.log('批量保存失败，尝试单个保存用户...');
          
          for (const user of usersToSync) {
            try {
              const success = await saveUserToPostgres(user.id, user.email);
              if (success) {
                successCount++;
              } else {
                errorCount++;
                console.error(`无法保存用户: ${user.id}`);
              }
            } catch (userError) {
              errorCount++;
              console.error(`保存用户时出错: ${user.id}`, userError);
            }
          }
        }
      }
      
      // 继续处理下一批，直到没有更多用户
    } while (nextPageToken);
    
    const duration = (Date.now() - startTime) / 1000;
    
    console.log('=== 同步完成 ===');
    console.log(`总用户数: ${totalUsers}`);
    console.log(`成功同步: ${successCount}`);
    console.log(`失败数量: ${errorCount}`);
    console.log(`耗时: ${duration.toFixed(2)}秒`);
    
    return {
      totalUsers,
      successCount,
      errorCount,
      duration
    };
    
  } catch (error) {
    console.error('同步过程中发生错误:', error);
    process.exit(1);
  }
}

// 执行同步并在完成后退出
syncUsersToPostgres()
  .then(() => {
    console.log('同步脚本执行完成');
    process.exit(0);
  })
  .catch(error => {
    console.error('同步脚本执行失败:', error);
    process.exit(1);
  }); 