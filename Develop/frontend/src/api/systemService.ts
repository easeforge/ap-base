/**
 * 系統管理相關 API
 */

import axios from './axios';
import { SystemProfile, SystemCheckResponse, SystemFunction } from '../types';

export const systemService = {
  /**
   * 取得系統設定
   */
  getProfile: async (): Promise<SystemProfile> => {
    const response = await axios.get('/api/system/profile');
    return response.data;
  },

  /**
   * 系統健康檢查
   */
  checkSystem: async (): Promise<SystemCheckResponse> => {
    const response = await axios.get('/api/system/check');
    return response.data;
  },

  /**
   * 取得系統功能選單
   */
  getFunctions: async (): Promise<SystemFunction[]> => {
    const response = await axios.get('/api/system/functions');
    return response.data;
  },
};
