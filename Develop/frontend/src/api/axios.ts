/**
 * Axios 配置
 */

import axios from 'axios';

// 開發環境使用 localhost,生產環境使用相對路徑(由 nginx 代理)
const API_BASE_URL = process.env.REACT_APP_API_URL === undefined
  ? 'http://localhost:10181'  // 開發環境 (沒有設定 .env)
  : process.env.REACT_APP_API_URL === ''
  ? ''  // 生產環境 - 使用相對路徑
  : process.env.REACT_APP_API_URL;  // 自訂 URL

// 建立 axios 實例
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 請求攔截器 - 自動加入 Token
axiosInstance.interceptors.request.use(
  (config) => {
    // 添加 Bearer Token (JWT / session_id)
    const token = localStorage.getItem('session_id') || localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 回應攔截器 - 處理錯誤
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    if (error.response) {
      // 401 未授權 - token 或 session 過期，導向登入頁
      if (error.response.status === 401) {
        localStorage.removeItem('session_id');
        localStorage.removeItem('access_token');
        window.location.href = '/login';
      }
      // 403 禁止存取
      else if (error.response.status === 403) {
        console.error('禁止存取:', error.response.data.detail);
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
