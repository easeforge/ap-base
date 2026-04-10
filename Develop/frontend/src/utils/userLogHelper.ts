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
      // 確保 id 是數字類型
      const functionId = typeof func.id === 'string' ? parseInt(func.id, 10) : func.id;
      functionCodeToIdMap!.set(func.func_code, functionId);
    });
    console.log('[UserLogHelper] Function map loaded:', Array.from(functionCodeToIdMap.entries()));
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
 * @param funcCode 功能代碼 (例如: 'organizations', 'user_detail')
 * @param moduleItem 操作類型 (View, Read, Create, Update, Delete, Print, File, Login)
 * @param lookData 檢視資料
 * @param changeData 異動資料
 * @param errDetail 錯誤訊息
 */
export const logUserAction = async (
  funcCode: string,
  moduleItem: 'View' | 'Create' | 'Read' | 'Update' | 'Delete' | 'Print' | 'File' | 'Login',
  lookData?: Record<string, any>,
  changeData?: Record<string, any>,
  errDetail?: string | null
): Promise<void> => {
  console.log(`[UserLogHelper] logUserAction called: ${funcCode} - ${moduleItem}`);
  try {
    const functionId = await getFunctionId(funcCode);
    console.log(`[UserLogHelper] getFunctionId result for "${funcCode}": ${functionId} (type: ${typeof functionId})`);
    if (!functionId) {
      console.warn(`[UserLogHelper] Function code not found: ${funcCode}`);
      return;
    }

    // 自動提取 data_id（優先從 changeData，再從 lookData）
    let dataId: number | undefined;
    if (changeData?.id) {
      dataId = changeData.id;
    } else if (lookData?.id) {
      dataId = lookData.id;
    }

    console.log('[UserLogHelper] Data extraction:', {
      moduleItem,
      lookData_id: lookData?.id,
      changeData_id: changeData?.id,
      extracted_dataId: dataId
    });

    // 確保 functionId 是數字類型
    const numericFunctionId = typeof functionId === 'string' ? parseInt(functionId, 10) : functionId;

    if (isNaN(numericFunctionId)) {
      console.error(`[UserLogHelper] Invalid functionId: ${functionId} (type: ${typeof functionId})`);
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

    console.log('[UserLogHelper] Calling createUserLog API with log:', log);
    await createUserLog(log);
    console.log('[UserLogHelper] createUserLog API completed');
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
  await logUserAction(funcCode, 'View', { action: 'view_list', filters }, undefined, error);
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
 * look_data: 完整的舊資料
 * change_data: 完整的新資料
 * 前端顯示時會比較兩邊資料，用顏色標示不同的欄位
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
    console.error('[logUpdate] Error:', err);
    // 即使日誌記錄失敗，也不要拋出異常
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
