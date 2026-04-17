# Base AP - 後臺管理基底平台

## 專案概述
後臺管理與租戶組織的基底系統平台，計畫產品化為 Community + Commercial 雙軌模式，支援多技術棧（Python/Java/.NET/PHP）。

## 技術架構
- Backend: Python FastAPI + SQLAlchemy + PostgreSQL (baseAP) + Redis
- Frontend: React + TypeScript + i18next + i18next-http-backend (動態語系載入)
- Port: Backend 10181, Frontend 10180
- DB: PostgreSQL (設定於 backend/.env)

## 目前開發狀態（2026-04-18）

### 已完成
- 基底平台從 P-PA6.4 提取並清理完成
- 資料庫 JSONB 多語系改造完成（5張表：system_codes, system_functions, sys_profiles, user_roles, system_notifications）
- 後端全部改造完成（models, schemas, routes, services）
- 語系管理後端完成（sys_languages 資料表, CRUD API, 語系檔同步, 補值機制）
- 系統啟動時自動同步語系檔
- ISO 3166-1 國家代碼（249國）+ 台灣行政區域（內政部行政區碼 390筆）已匯入
- **Phase 8**: 前端頁面 JSONB 多語系取值改造完成
  - 新增 I18nField 型別 + getI18nValue() 工具函式 (src/utils/i18nHelper.ts)
  - types/ services/ components/ hooks/ contexts/ pages/ 全面改造（30+ files）
  - 所有 cname/ename 雙欄改為 JSONB 單欄取值
  - 表單輸入改為每個語系一個 input
- **Phase 9**: 前端語系機制改造完成
  - i18n.ts 改用 i18next-http-backend 從 API 動態載入翻譯，保留靜態檔案 fallback
  - SystemContext 新增 availableLanguages / defaultLanguage 狀態
  - LanguageSwitcher 從 GET /api/system/languages 取得可用語系（1個不顯示，2個按鈕，3+下拉選單）
- **Phase 10**: 系統設定頁面語系設定完成
  - SysProfilePage 新增語系設定區塊（checkbox 勾選啟用語系）
  - sys_title / sys_copyright 依啟用語系��態顯示多語系輸入欄位
- **Phase 11**: init_db.sql 重建完成
  - 版本 2.0.0，11 張表（含 sys_languages）
  - 所有 JSONB 欄位、初始資料含 zh-TW/en 雙語系值
  - 新增隱藏功能（my_profile, change_password, logout）
  - Language 語系代碼 + sys_languages 初始資料
  - 翻譯資料(lang_data)不包含，需另行匯入
- **Phase 12**: 系統訊息代碼系統（sys_message_code）
  - 69 筆訊息代碼（21 SYS + 48 ERR），存於 system_codes 表
  - 編碼規則：{SYS|ERR|DAT}{2碼分類}{4碼流水} = 9 碼
  - 正式環境（分類 01~49）與開發環境（51~99，分類碼+50）雙軌
  - 後端 helper `app.core.message_codes.raise_msg(status, code, **params)` 依 ENVIRONMENT 自動切換
  - 支援參數替換：`{name}`、`{entity}`、`{id}` 等佔位符
  - 前端統一顯示格式：`系統訊息：(代碼)說明`
  - 公開端點 `GET /api/system/message-codes?lang=zh-TW`
  - 所有 routes 硬編碼 Chinese detail 字串已全部清除（86 處，13 個檔案）
  - 詳細規格：[系統設計/系統訊息分類設計.md](系統設計/系統訊息分類設計.md)
- **Phase 13**: Toast 通知系統
  - `MessageContext` + `useMessage()` hook
  - 方法：`showSuccess / showError / showWarning / showInfo / showApiError`
  - `showApiError(err)` 自動解析後端 detail（字串代碼 或 {code, params} 物件）
  - 替換所有 pages 的 `alert()`（94 處 → 0）
  - 使用 MUI Snackbar + Alert，頂端中央顯示，依 severity 自動關閉
- **Phase 14**: 橫式版面支援
  - 新增 `sys_profiles.layout_mode` 欄位（vertical / horizontal）
  - 直式：左側 Sidebar（原行為）
  - 橫式：頂部 TopNav 導覽列 + hover 下拉子選單（支援巢狀）
  - 由 SysProfilePage 切換，儲存後重整生效
- **Phase 15**: 首頁 Dashboard
  - `GET /api/system/stats` 回傳 users/orgs/logins/notifications 統計 + 最近 10 筆活動
  - 頁面路由合併（刪除 DashboardPage，統一使用 HomePage 於 `/home`）
  - 麵包屑首頁指向 `/home`
- **Phase 16**: i18n 清理
  - 移除 34 個無人使用的 i18n key（三語系共 102 筆）
  - 訊息統一走 sys_message_code，靜態翻譯 key 只留下標籤與表單文字

## 資料庫表結構（11 張表）
| 表名 | 說明 | JSONB 多語系欄位 |
|------|------|-----------------|
| organizations | 組織單位 | - |
| users | 使用者 | user_role (角色ID陣列) |
| user_roles | 使用者角色 | role_name |
| system_functions | 系統功能 | func_name, module_item |
| sys_profiles | 系統設定(唯一) | sys_title, sys_copyright, sys_languages |
| role_rights | 角色權限 | - |
| system_codes | 系統代碼 | code_type_name, code_name |
| system_notifications | 系統通知 | notice_subject, notice_description |
| notification_closedates | 通知關閉記錄 | - |
| user_logs | 使���者日誌 | look_data, change_data |
| sys_languages | 語系管理 | lang_data (完整翻譯JSON) |

## 前端多語系取值方式
```typescript
import { getI18nValue } from '../utils/i18nHelper';
import { I18nField } from '../types';

// 從 JSONB 欄位取當前語系值，fallback 到 zh-TW
const name = getI18nValue(item.func_name, i18n.language);
const title = getI18nValue(profile?.sys_title, i18n.language, 'fallback');
```

## 關鍵設計決策
- 基底平台多語系欄位用 JSONB（資料量小，彈性高）
- 應用系統業務表不需多語系（使用者以目標語系書寫）
- 語系資料只增不刪，停用=不顯示
- JSONB 存所有已建立語系，不論是否啟用，顯示由 sys_profiles.sys_languages 控制
- 新增語系時以預設語系為模板自動補值
- 系統設定儲存時寫出語系檔 + 啟動時比對同步
- 前端語系載入：i18next-http-backend 從 API 動態載入 + 靜態檔案 fallback

## 規格文件
- 系統設計/system_codes_系統代碼設計規格.md
- 系統設計/TWN_Area_台灣行政區域設計規格.md
- 系統設計/Language_語系管理設計規格.md
- 系統設計/系統訊息分類設計.md  ← 訊息代碼系統規格
- 系統設計/Base_AP_應用系統建置指引.md  ← 新建應用模組的 SOP

## 新增應用模組時的訊息處理
- 不要在 routes 中寫 `raise HTTPException(detail="中文字串")`
- 改用 `raise_msg(status.HTTP_XXX, "ERR020001", entity="資料名稱", id=xxx)`
- 通用錯誤使用分類 02（`ERR020001~020007`），不需新建
- 模組特定業務規則才新建代碼（例如密碼政策、時區驗證等）
- 詳見「系統訊息分類設計.md」第 3 章代碼範例

## 前端頁面的訊息處理
- 成功：`showSuccess('SYS020001', { name: pageTitle })`
- 錯誤（API）：`catch (err) { showApiError(err); }`
- 表單驗證錯誤：`showError('ERR020006', { field, detail })`
- 不要用 `alert()`

## 啟動方式
```bash
# 後端
cd Develop/backend && venv/Scripts/python -m uvicorn app.main:app --host 0.0.0.0 --port 10181 --reload

# 前端
cd Develop/frontend && npm start
```
