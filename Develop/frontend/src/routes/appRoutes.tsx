/**
 * 應用專案路由定義
 *
 * 在此檔案新增應用專案的路由，基底平台的 App.tsx 會自動載入。
 * 不需要修改 App.tsx。
 *
 * 使用方式：
 * 1. 建立頁面元件（如 src/pages/ApInvItemsPage.tsx）
 * 2. 在下方 import 並加入 Route
 *
 * 範例：
 * import ApInvItemsPage from '../pages/ApInvItemsPage';
 *
 * 然後在 appRoutes 陣列中新增：
 * { path: 'ap_inv_items', element: <ApInvItemsPage /> },
 */

import React from 'react';

interface AppRoute {
  path: string;
  element: React.ReactElement;
}

const appRoutes: AppRoute[] = [
  // ===== 應用專案路由（在此新增）=====

];

export default appRoutes;
