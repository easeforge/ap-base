# Base AP - 後臺管理基底平台

## 專案概述
後臺管理與租戶組織的基底系統平台，計畫產品化為 Community + Commercial 雙軌模式，支援多技術棧（Python/Java/.NET/PHP）。

## 技術架構
- Backend: Python FastAPI + SQLAlchemy + PostgreSQL (baseAP) + Redis
- Frontend: React + TypeScript + i18next + i18next-http-backend (動態語系載入)
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

## 啟動方式
```bash
# 後端
cd Develop/backend && venv/Scripts/python -m uvicorn app.main:app --host 0.0.0.0 --port 10181 --reload

# 前端
cd Develop/frontend && npm start
```
