/**
 * system_functions.func_type 集中控制元件（前端對應後端 app/core/func_type.py）
 *
 * 新增類型時：同時更新後端 Python 模組與本檔案。
 *
 * 類型說明：
 *   NODE        1  選單節點（資料夾）
 *   PAGE        2  功能頁（有 UI）
 *   API_SERVICE 3  API 服務（EE Phase 4，API Key 認證）
 *   TASK        4  背景任務（EE Phase 3，Scheduler 呼叫）
 */

export const FuncType = {
  NODE: 1,
  PAGE: 2,
  API_SERVICE: 3,
  TASK: 4,
} as const;

export type FuncTypeValue = typeof FuncType[keyof typeof FuncType];

interface FuncTypeMeta {
  name_zh_tw: string;
  shows_in_menu: boolean;
  is_leaf: boolean;
  edition: 'ce' | 'ee';
}

export const FUNC_TYPE_META: Record<number, FuncTypeMeta> = {
  [FuncType.NODE]:        { name_zh_tw: '節點',     shows_in_menu: true,  is_leaf: false, edition: 'ce' },
  [FuncType.PAGE]:        { name_zh_tw: '功能頁',   shows_in_menu: true,  is_leaf: true,  edition: 'ce' },
  [FuncType.API_SERVICE]: { name_zh_tw: 'API 服務', shows_in_menu: false, is_leaf: true,  edition: 'ee' },
  [FuncType.TASK]:        { name_zh_tw: '背景任務', shows_in_menu: false, is_leaf: true,  edition: 'ee' },
};

export const isMenuType = (t: number): boolean =>
  FUNC_TYPE_META[t]?.shows_in_menu ?? false;

export const isLeafType = (t: number): boolean =>
  FUNC_TYPE_META[t]?.is_leaf ?? false;

export const isNodeType = (t: number): boolean =>
  t === FuncType.NODE;
