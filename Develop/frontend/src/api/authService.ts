/**
 * 認證相關 API
 */

import axios from './axios';
import { LoginRequest, TokenResponse, UserProfile } from '../types';

export const authService = {
  /**
   * 取得 CAPTCHA 驗證碼
   */
  getCaptcha: async (): Promise<{ captcha_key: string; captcha_svg: string }> => {
    const response = await axios.get('/api/auth/captcha');
    return response.data;
  },

  /**
   * 使用者登入
   */
  login: async (data: LoginRequest): Promise<TokenResponse> => {
    const response = await axios.post('/api/auth/login', data);
    return response.data;
  },

  /**
   * 驗證 Session 有效性
   */
  verifySession: async (): Promise<{ valid: boolean; session_id?: string; user_id?: number; username?: string; account?: string }> => {
    try {
      const response = await axios.get('/api/auth/verify-session');
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        return { valid: false };
      }
      throw error;
    }
  },

  /**
   * 取得當前使用者資訊
   */
  getCurrentUser: async (): Promise<UserProfile> => {
    const response = await axios.get('/api/auth/me');
    return response.data;
  },

  /**
   * 使用者登出
   */
  logout: async (): Promise<void> => {
    await axios.post('/api/auth/logout');
    localStorage.removeItem('access_token');
  },

  /**
   * 檢查是否已登入
   */
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('access_token');
  },

  /**
   * 儲存 Token
   */
  saveToken: (token: string): void => {
    localStorage.setItem('access_token', token);
  },

  /**
   * 清除 Token
   */
  clearToken: (): void => {
    localStorage.removeItem('access_token');
  },
};
