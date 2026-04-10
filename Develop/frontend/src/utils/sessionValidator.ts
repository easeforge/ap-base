/**
 * Session 驗證工具
 * 用於在功能頁面初始化時驗證 session 有效性
 */

import { authService } from '../api/authService';

/**
 * 驗證 Session 有效性
 *
 * @param pageName 頁面名稱（用於 console log）
 * @returns Promise<boolean> - true 表示 session 有效，false 表示無效（已導向登入頁）
 */
export const validateSession = async (pageName: string): Promise<boolean> => {
  try {
    const sessionId = localStorage.getItem('session_id') || localStorage.getItem('access_token');

    if (!sessionId) {
      console.error(`[${pageName}] No token found, redirecting to login...`);
      authService.clearToken();
      window.location.href = '/login';
      return false;
    }

    const result = await authService.verifySession();

    if (!result.valid) {
      console.error(`[${pageName}] Session is invalid, redirecting to login...`);
      authService.clearToken();
      window.location.href = '/login';
      return false;
    }

    return true;
  } catch (error: any) {
    console.error(`[${pageName}] Session validation failed:`, error);
    authService.clearToken();
    window.location.href = '/login';
    return false;
  }
};
