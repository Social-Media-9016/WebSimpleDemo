import { useState, useEffect } from 'react';
import axios from 'axios';

/**
 * 自定义Hook用于检查后端API连接状态
 * @param {string} apiUrl - API URL，默认使用proxy配置
 * @param {number} checkInterval - 检查间隔，毫秒，默认10秒
 * @returns {object} 状态对象
 */
export const useApiStatus = (apiUrl = '', checkInterval = 10000) => {
  const [status, setStatus] = useState({
    isConnected: null,
    lastChecked: null,
    message: '正在检查API连接...',
    isChecking: true
  });

  const baseUrl = apiUrl || (process.env.REACT_APP_API_URL || '/api');

  useEffect(() => {
    let isMounted = true;
    let intervalId;
    
    const checkApiConnection = async () => {
      if (!isMounted) return;
      
      setStatus(prev => ({ ...prev, isChecking: true }));
      
      try {
        // 尝试访问API健康检查端点
        const response = await axios.get(`${baseUrl}`);
        
        if (isMounted) {
          setStatus({
            isConnected: true,
            lastChecked: new Date(),
            message: `已连接到API服务器 - ${response.data?.message || 'OK'}`,
            isChecking: false
          });
        }
      } catch (error) {
        if (isMounted) {
          const errorMessage = error.response 
            ? `API错误: ${error.response.status} ${error.response.statusText}`
            : `无法连接到API: ${error.message}`;
          
          setStatus({
            isConnected: false,
            lastChecked: new Date(),
            message: errorMessage,
            isChecking: false
          });
        }
      }
    };

    // 立即执行第一次检查
    checkApiConnection();
    
    // 设置周期性检查
    if (checkInterval > 0) {
      intervalId = setInterval(checkApiConnection, checkInterval);
    }
    
    // 清理函数
    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [baseUrl, checkInterval]);

  return status;
};

export default useApiStatus; 