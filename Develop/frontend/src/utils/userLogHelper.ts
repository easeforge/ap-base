/**
 * 使用者日誌記錄輔助函數
 */

import { createUserLog, UserLogCreate } from '../services/userLogService';
import { getSysFunctions } from '../services/sysFunctionService';

// 快取 function_code 到 function_id 的對應
let functionCodeToIdMap: Map<string, number> | null = null;

/**
 * 載入並快取功能代碼對應表
 */
const loadFunctionMap = async (): Promise<Map<string, number>> => {
  if (functionCodeToIdMap) {
    return functionCodeToIdMap;
  }

  try {
    const functions = await getSysFunctions({});
    functionCodeToIdMap = new Map();
    functions.forEach((func: any) => {
      const functionId = typeof func.id === 'string' ? parseInt(func.id, 10) : func.id;
      functionCodeToIdMap!.set(func.func_code, functionId);
    });
    return functionCodeToIdMap;
  } catch (error) {
    console.error('[UserLogHelper] Failed to load function map:', error);
    return new Map();
  }
};

/**
 * 根據 function_code 取得 function_id
 */
const getFunctionId = async (funcCode: string): Promise<number | null> => {
  const map = await loadFunctionMap();
  return map.get(funcCode) || null;
};

/**
 * 記錄使用者日誌
 */
export const logUserAction = async (
  funcCode: string,
  moduleItem: 'Create' | 'Read' | 'Update' | 'Delete' | 'Print' | 'File' | 'Login',
  lookData?: Record<string, any>,
  changeData?: Record<string, any>,
  errDetail?: string | null
): Promise<void> => {
  try {
    const functionId = await getFunctionId(funcCode);
    if (!functionId) {
      return; // 功能代碼不存在，靜默跳過
    }

    // 自動提取 data_id（優先從 changeData，再從 lookData）
    let dataId: number | undefined;
    if (changeData?.id) {
      dataId = changeData.id;
    } else if (lookData?.id) {
      dataId = lookData.id;
    }

    const numericFunctionId = typeof functionId === 'string' ? parseInt(functionId, 10) : functionId;
    if (isNaN(numericFunctionId)) {
      return;
    }

    const log: UserLogCreate = {
      system_function_id: numericFunctionId,
      module_item: moduleItem,
      data_id: dataId,
      look_data: lookData,
      change_data: changeData,
      err_detail: errDetail
    };

    await createUserLog(log);
  } catch (error) {
    // 日誌記錄失敗不應該影響主要功能
    console.error('[UserLogHelper] Failed to create user log:', error);
  }
};

/**
 * 記錄頁面瀏覽 (View)
 */
export const logView = async (
  funcCode: string,
  filters?: Record<string, any>,
  error?: string | null
): Promise<void> => {
  await logUserAction(funcCode, 'Read', { action: 'view_list', filters }, undefined, error);
};

/**
 * 記錄資料查看 (Read)
 */
export const logRead = async (
  funcCode: string,
  data: Record<string, any>,
  error?: string | null
): Promise<void> => {
  await logUserAction(funcCode, 'Read', data, undefined, error);
};

/**
 * 記錄資料新增 (Create)
 */
export const logCreate = async (
  funcCode: string,
  data: Record<string, any>,
  error?: string | null
): Promise<void> => {
  await logUserAction(funcCode, 'Create', {}, data, error);
};

/**
 * 記錄資料修改 (Update)
 */
export const logUpdate = async (
  funcCode: string,
  oldData: Record<string, any>,
  newData: Record<string, any>,
  error?: string | null
): Promise<void> => {
  try {
    await logUserAction(funcCode, 'Update', oldData, newData, error);
  } catch (err) {
    // 日誌記錄失敗不影響主要功能
  }
};

/**
 * 記錄資料刪除 (Delete)
 */
export const logDelete = async (
  funcCode: string,
  data: Record<string, any>,
  error?: string | null
): Promise<void> => {
  await logUserAction(funcCode, 'Delete', data, {}, error);
};
