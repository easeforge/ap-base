# Base AP - 後臺管理基底平台

## 專案概述
後臺管理與租戶組織的基底系統平台，計畫產品化為 Community + Commercial 雙軌模式，支援多技術棧（Python/Java/.NET/PHP）。

## 技術架構
- Backend: Python FastAPI + SQLAlchemy + PostgreSQL (baseAP) + Redis
- Frontend: React + TypeScript + i18next (zh-TW/en)
- Port: Backend 10181, Frontend 10180
- DB: 10.1.0.20:5433/baseAP (admin/DC1qaz2wsx)

## 目前開發狀態（2026-04-11）

### 已完成
- 基底平台從 P-PA6.4 提取並清理完成
- 資料庫 JSONB 多語系改造完成（5張表：system_codes, system_functions, sys_profiles, user_roles, system_notifications）
- 後端全部改造完成（models, schemas, routes, services）
- 語系管理後端完成（sys_languages 資料表, CRUD API, 語系檔同步, 補值機制）
- 系統啟動時自動同步語系檔
- ISO 3166-1 國家代碼（249國）+ 台灣行政區域（內政部行政區碼 390筆）已匯入

### 待完成（Phase 8-11）
請依序完成以下工作：

#### Phase 8: 前端頁面 - JSONB 取值改造
所有前端頁面需將舊的 cname/ename 欄位改為從 JSONB 依語系取值。

API 回傳格式變更對照：
```
舊: { func_cname: "系統管理", func_ename: "System Management" }
新: { func_name: {"zh-TW": "系統管理", "en": "System Management"} }

舊: { code_cname: "台灣", code_ename: "Taiwan", code_ctype: "國家代碼", code_etype: "Country_Codes_2" }
新: { code_name: {"zh-TW": "台灣", "en": "Taiwan"}, code_type_name: {"zh-TW": "國家代碼", "en": "Country Codes"}, code_type: "Country_Codes_2" }

舊: { role_cname: "管理員", role_ename: "Admin" }
新: { role_name: {"zh-TW": "管理員", "en": "Admin"} }

舊: { sys_ctitle: "後臺管理", sys_etitle: "Base AP", sys_ccopyright: "版權", sys_ecopyright: "Copyright" }
新: { sys_title: {"zh-TW": "後臺管理", "en": "Base AP"}, sys_copyright: {"zh-TW": "版權", "en": "Copyright"}, sys_languages: ["zh-TW", "en"] }

舊: { notice_csubject: "主旨", notice_esubject: "Subject" }
新: { notice_subject: {"zh-TW": "主旨", "en": "Subject"}, notice_description: {"zh-TW": "...", "en": "..."} }
```

需改的前端檔案：
- src/components/Sidebar.tsx (func_cname/func_ename → func_name)
- src/components/Breadcrumb.tsx
- src/components/MainLayout.tsx (sys_ctitle/sys_etitle → sys_title)
- src/contexts/SystemContext.tsx (sys_ctitle/sys_etitle → sys_title)
- src/hooks/useFunctionName.ts (func_cname/func_ename → func_name)
- src/pages/SystemCodesPage.tsx (code_cname/code_ename/code_ctype/code_etype → JSONB)
- src/pages/SystemFunctionsPage.tsx (func_cname/func_ename → func_name)
- src/pages/UserRolesPage.tsx (role_cname/role_ename → role_name)
- src/pages/RoleRightsPage.tsx (func_cname/func_ename, role_cname/role_ename → JSONB)
- src/pages/SystemNotificationsPage.tsx (notice_csubject etc → JSONB)
- src/pages/HomePage.tsx
- src/pages/DashboardPage.tsx
- src/services/*.ts (對應的 TypeScript interface)
- src/types/*.ts (SystemFunction, SystemCode 等型別定義)
- src/api/systemService.ts (profile 回傳格式)

取值方式：用 i18n.language 從 JSONB 取對應語系值
```typescript
// 範例：取功能名稱
const name = func.func_name[i18n.language] || func.func_name['zh-TW'] || '';
// 範例：取代碼名稱
const codeName = code.code_name[i18n.language] || code.code_name['zh-TW'] || '';
```

#### Phase 9: 前端語系機制改造
- src/i18n.ts: 改為動態載入（使用 i18next-http-backend 或動態 import）
- src/components/LanguageSwitcher.tsx: 從 GET /api/system/languages 取得可用語系，1個不顯示，2個以上顯示切換器
- src/contexts/SystemContext.tsx: 新增 availableLanguages, defaultLanguage, languageOptions state

#### Phase 10: 系統設定頁面語系設定
- src/pages/SysProfilePage.tsx: 新增語系設定區塊（checkbox 勾選啟用語系）
- sys_title, sys_copyright 改為多語系輸入（每個啟用語系一個 input）

#### Phase 11: init_db.sql 重建
重建 Develop/backend/init_db.sql，包含：
- 所有表結構（含 JSONB 欄位、sys_languages 表）
- 初始資料（admin 帳號、系統功能、系統設定含 sys_languages、Language 代碼）
- 翻譯資料不放 init_db.sql（太大），用獨立腳本匯入

## 關鍵設計決策
- 基底平台多語系欄位用 JSONB（資料量小，彈性高）
- 應用系統業務表不需多語系（使用者以目標語系書寫）
- 語系資料只增不刪，停用=不顯示
- JSONB 存所有已建立語系，不論是否啟用，顯示由 sys_profiles.sys_languages 控制
- 新增語系時以預設語系為模板自動補值
- 系統設定儲存時寫出語系檔 + 啟動時比對同步

## 規格文件
- 系統設計/system_codes_系統代碼設計規格.md
- 系統設計/TWN_Area_台灣行政區域設計規格.md
- 系統設計/Language_語系管理設計規格.md

## 啟動方式
```bash
# 後端
cd Develop/backend && venv/Scripts/python -m uvicorn app.main:app --host 0.0.0.0 --port 10181 --reload

# 前端
cd Develop/frontend && npm start
```
