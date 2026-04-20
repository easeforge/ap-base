/**
 * system_functions.func_type 前端對應常數（對應後端 app/core/func_type.py）
 *
 * **設計原則**
 *
 * CE（社群版）只定義兩種 func_type：
 *   NODE (1) 選單節點（資料夾）
 *   PAGE (2) 功能頁（有 UI）
 *
 * 商業化模組（EE）額外使用的類型（例如 API 服務、背景任務）
 * 由模組自身程式碼以整數 literal 直接判斷，不污染 CE 基底檔。
 */

export const FuncType = {
  NODE: 1,
  PAGE: 2,
} as const;

export type FuncTypeValue = typeof FuncType[keyof typeof FuncType];

interface FuncTypeMeta {
  name_zh_tw: string;
  shows_in_menu: boolean;
  is_leaf: boolean;
  edition: 'ce' | 'ee';
}

export const FUNC_TYPE_META: Record<number, FuncTypeMeta> = {
  [FuncType.NODE]: { name_zh_tw: '節點',   shows_in_menu: true, is_leaf: false, edition: 'ce' },
  [FuncType.PAGE]: { name_zh_tw: '功能頁', shows_in_menu: true, is_leaf: true,  edition: 'ce' },
};

export const isMenuType = (t: number): boolean =>
  FUNC_TYPE_META[t]?.shows_in_menu ?? false;

export const isLeafType = (t: number): boolean =>
  FUNC_TYPE_META[t]?.is_leaf ?? false;

export const isNodeType = (t: number): boolean =>
  t === FuncType.NODE;
