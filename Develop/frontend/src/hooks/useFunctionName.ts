/**
 * 使用功能名稱 Hook
 * 根據 func_code 和當前語系取得功能名稱（從 JSONB func_name 欄位）
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getSysFunctions, SysFunction } from '../services/sysFunctionService';
import { getI18nValue } from '../utils/i18nHelper';

// 快取功能列表，避免重複請求
let cachedFunctions: SysFunction[] | null = null;
let cachePromise: Promise<SysFunction[]> | null = null;

/**
 * 載入並快取功能列表
 */
const loadFunctions = async (): Promise<SysFunction[]> => {
  if (cachedFunctions) {
    return cachedFunctions;
  }

  if (cachePromise) {
    return cachePromise;
  }

  cachePromise = getSysFunctions({})
    .then((functions) => {
      cachedFunctions = functions;
      cachePromise = null;
      return functions;
    })
    .catch((error) => {
      console.error('[useFunctionName] Failed to load functions:', error);
      cachePromise = null;
      return [];
    });

  return cachePromise;
};

/**
 * 根據 func_code 取得功能名稱
 * @param funcCode 功能代碼
 * @returns 功能名稱（根據當前語系從 JSONB func_name 取值）
 */
export const useFunctionName = (funcCode: string): string => {
  const { i18n } = useTranslation();
  const [functionData, setFunctionData] = useState<SysFunction | null>(null);

  // 第一個 effect: 載入功能資料（只在 funcCode 變更時執行）
  useEffect(() => {
    let isMounted = true;

    const fetchFunctionData = async () => {
      try {
        const functions = await loadFunctions();
        const func = functions.find((f) => f.func_code === funcCode);

        if (isMounted) {
          if (func) {
            setFunctionData(func);
          } else {
            console.warn(`[useFunctionName] Function code not found: ${funcCode}`);
            setFunctionData(null);
          }
        }
      } catch (error) {
        console.error('[useFunctionName] Error fetching function data:', error);
        if (isMounted) {
          setFunctionData(null);
        }
      }
    };

    fetchFunctionData();

    return () => {
      isMounted = false;
    };
  }, [funcCode]);

  // 根據語系從 JSONB 取值
  if (!functionData) {
    return funcCode; // 資料未載入或找不到時，顯示 func_code
  }

  return getI18nValue(functionData.func_name, i18n.language, funcCode);
};

/**
 * 根據 func_code 取得功能資訊（包含名稱和描述）
 * @param funcCode 功能代碼
 * @returns 功能名稱和描述
 */
export const useFunctionInfo = (funcCode: string): { name: string; description: string } => {
  const { i18n } = useTranslation();
  const [functionData, setFunctionData] = useState<SysFunction | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchFunctionData = async () => {
      try {
        const functions = await loadFunctions();
        const func = functions.find((f) => f.func_code === funcCode);

        if (isMounted) {
          if (func) {
            setFunctionData(func);
          } else {
            console.warn(`[useFunctionInfo] Function code not found: ${funcCode}`);
            setFunctionData(null);
          }
        }
      } catch (error) {
        console.error('[useFunctionInfo] Error fetching function data:', error);
        if (isMounted) {
          setFunctionData(null);
        }
      }
    };

    fetchFunctionData();

    return () => {
      isMounted = false;
    };
  }, [funcCode]);

  if (!functionData) {
    return { name: funcCode, description: '' };
  }

  return {
    name: getI18nValue(functionData.func_name, i18n.language, funcCode),
    description: functionData.description || ''
  };
};

/**
 * 清除快取（用於測試或需要重新載入功能列表時）
 */
export const clearFunctionCache = (): void => {
  cachedFunctions = null;
  cachePromise = null;
};
