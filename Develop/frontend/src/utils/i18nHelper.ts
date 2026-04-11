/**
 * 多語系 JSONB 欄位取值工具
 * 從 JSONB 欄位取得對應語系的值，fallback 到 en（基礎語系）
 */

import { I18nField } from '../types';

/** 基礎語系：所有 JSONB 多語系欄位的 fallback 語系 */
export const BASE_LANGUAGE = 'en';

/**
 * 從 JSONB 多語系欄位取得當前語系的值
 * @param field JSONB 欄位 { "zh-TW": "中文", "en": "English" }
 * @param lang 當前語系代碼（如 "zh-TW", "en"）
 * @param fallback 找不到時的預設值
 */
export const getI18nValue = (field: I18nField | undefined | null, lang: string, fallback: string = ''): string => {
  if (!field) return fallback;
  return field[lang] || field[BASE_LANGUAGE] || Object.values(field)[0] || fallback;
};
