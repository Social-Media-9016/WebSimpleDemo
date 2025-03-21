import axios from 'axios';
import { auth } from '../config/firebase';

// 创建axios实例
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器 - 添加身份验证令牌
api.interceptors.request.use(
  async (config) => {
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const token = await currentUser.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('获取身份验证令牌时出错:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理错误
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response) {
      // 服务器返回了错误状态码
      console.error('API错误:', error.response.data);
      return Promise.reject(error.response.data);
    } else if (error.request) {
      // 请求已发送但没有收到响应
      console.error('没有收到API响应:', error.request);
      return Promise.reject({
        status: 'error',
        message: '服务器无响应，请检查网络连接'
      });
    } else {
      // 设置请求时发生了错误
      console.error('请求配置错误:', error.message);
      return Promise.reject({
        status: 'error',
        message: '请求配置错误'
      });
    }
  }
);

// 用户相关API
export const userApi = {
  /**
   * 获取用户信息
   * @param {string} userId - 用户ID
   */
  getUser: (userId) => api.get(`/users/${userId}`),

  /**
   * 创建或更新用户
   * @param {object} userData - 用户数据
   */
  saveUser: (userData) => api.post('/users', userData),

  /**
   * 通过邮箱查找用户
   * @param {string} email - 用户邮箱
   */
  findUserByEmail: (email) => api.get(`/users/email/${encodeURIComponent(email)}`),
};

// 其他API服务可以在这里添加...

export default api; 