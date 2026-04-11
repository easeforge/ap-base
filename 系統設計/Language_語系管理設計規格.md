# Language 語系管理設計規格

## 1. 概述

語系管理功能提供系統管理者動態配置系統支援的語系，取代目前寫死在程式中的雙語切換。透過資料庫管理翻譯內容，並在設定儲存時產出實體 JSON 語系檔，供前端 i18n 框架直接讀取。

### 1.1 設計目標

- 語系選項可透過 system_codes 動態增減，不需改程式
- 翻譯內容存在資料庫中，可透過管理介面維護
- 系統設定檔（sys_profiles）控制目前啟用的語系
- 啟用語系變更時，自動產出對應的實體 JSON 語系檔
- 系統啟動時自動比對並同步語系檔
- 基底平台資料表的多語系欄位採 JSONB 方案，支援動態擴充語系

### 1.2 多語系資料儲存策略

本系統的多語系處理分為兩個層面：

| 層面 | 內容 | 儲存方式 |
|------|------|---------|
| **UI 固定文字** | 按鈕、標籤、提示訊息等 | `sys_languages.lang_data` (JSONB) → 產出 `translation.json` |
| **資料表動態資料** | 功能名稱、代碼名稱、通知標題等 | 資料表欄位採 JSONB 多語系格式 |

#### 資料表多語系欄位設計（JSONB 方案）

基底平台的系統管理表，將現有的 `cname` / `ename` 雙欄位改為 JSONB 多語系欄位：

```
改造前（寫死兩種語系）：
  code_cname  VARCHAR  →  "台灣"
  code_ename  VARCHAR  →  "Taiwan"

改造後（JSONB 支援任意語系）：
  code_name   JSONB    →  {"zh-TW": "台灣", "en": "Taiwan", "ja": "台湾"}
```

程式依據的欄位（`code_type`、`code`、`order` 等）維持原型別不變，**僅給人看的名稱欄位改為 JSONB**。

#### 適用範圍

| 資料類型 | 多語系需求 | 做法 |
|---------|----------|------|
| 基底平台系統管理表 | 需要（選單、代碼、通知等） | JSONB 多語系欄位 |
| 應用系統業務表 | 通常不需要（使用者以目標語系書寫） | 普通 VARCHAR，依應用需求決定 |

> **說明**：應用系統的業務資料通常由使用者以目標用戶的適用語系書寫，一筆資料只有一種語言內容，不需要多語系欄位。若未來有知識管理等特殊需求，可依應用系統服務類型另行設計。

#### 需改造的資料表

| 資料表 | 現有欄位 | 改造後欄位 |
|--------|---------|----------|
| system_codes | code_ctype / code_etype(Key) / code_cname / code_ename | code_type(Key) / code_type_name(JSONB) / code_name(JSONB) |
| system_functions | func_cname / func_ename | func_name(JSONB) |
| sys_profiles | sys_ctitle / sys_etitle / sys_ccopyright / sys_ecopyright | sys_title(JSONB) / sys_copyright(JSONB) |
| user_roles | role_cname / role_ename | role_name(JSONB) |
| system_notifications | notice_csubject / notice_esubject / notice_cdescription / notice_edescription | notice_subject(JSONB) / notice_description(JSONB) |

#### JSONB 查詢方式

```sql
-- 依語系取值（程式傳入語系變數）
SELECT code_name->>'zh-TW' AS name FROM system_codes;

-- 指定語系模糊搜尋
SELECT * FROM system_codes WHERE code_name->>'zh-TW' ILIKE '%台%';

-- 跨所有語系搜尋
SELECT * FROM system_codes 
WHERE EXISTS (
  SELECT 1 FROM jsonb_each_text(code_name) kv WHERE kv.value ILIKE '%台%'
);
```

基底平台的系統管理表資料量皆在千筆級以內，JSONB 查詢效能無顧慮。

#### JSONB 多語系資料管理原則

- **資料面保持完整**：JSONB 欄位中存放所有已建立語系的值，不論該語系是否啟用
- **顯示面由設定控制**：前端依 `sys_profiles.sys_languages` 決定顯示哪些語系
- 僅啟用 1 種語系時，不顯示語系切換器
- 啟用 2 種以上語系時，顯示語系切換器

#### 新增語系補值機制

當在 `sys_languages` 資料表新增一個語系時，現有所有含 JSONB 多語系欄位的資料表中，尚未包含該語系 key 的資料需要補值。

**補值流程：**

```
1. 管理者在 sys_languages 建立新語系（如 ja 日文）
2. 後端觸發補值作業（自動或手動觸發）
3. 掃描所有含 JSONB 多語系欄位的資料表
4. 讀取 sys_profiles.sys_languages 陣列第一個元素作為模板語系
5. 遍歷每筆資料的每個 JSONB 多語系欄位：
   a. 若該欄位尚無新語系 key → 以模板語系的值填入
   b. 若該欄位已有新語系 key → 跳過不覆蓋
6. 記錄補值結果到日誌
```

**補值範例：**

```json
// 補值前（僅有 zh-TW 和 en）
code_name = {"zh-TW": "台灣", "en": "Taiwan"}

// 以預設語系 zh-TW 為模板，補上 ja
code_name = {"zh-TW": "台灣", "en": "Taiwan", "ja": "台灣"}

// 管理者後續進入管理介面修正翻譯
code_name = {"zh-TW": "台灣", "en": "Taiwan", "ja": "台湾"}
```

**需補值的資料表與欄位：**

| 資料表 | JSONB 多語系欄位 |
|--------|----------------|
| system_codes | code_type_name, code_name |
| system_functions | func_name |
| sys_profiles | sys_title, sys_copyright |
| user_roles | role_name |
| system_notifications | notice_subject, notice_description |

**補值 SQL 範例（以 system_codes.code_name 為例）：**

```sql
-- 將預設語系 zh-TW 的值複製到新語系 ja（僅補尚未存在的）
UPDATE system_codes
SET code_name = code_name || jsonb_build_object('ja', code_name->>'zh-TW')
WHERE NOT code_name ? 'ja';
```

**API 端點：**

```
POST /api/sys_languages/{lang_code}/backfill
```

- 觸發指定語系的補值作業
- 需系統管理員權限
- 回傳補值統計（各表補了幾筆）

### 1.3 架構總覽

```
┌─────────────────────┐
│    system_codes     │  ← 定義所有可用語系選項
│  (etype: Language)  │     如 zh-TW, en, ja, zh-CN
└─────────┬───────────┘
          │ 管理者在系統設定中勾選啟用
┌─────────▼───────────┐
│    sys_profiles     │  ← 記錄啟用的語系代碼
│   sys_languages     │     ["zh-TW", "ja"]
│   (JSONB array)     │     陣列第一個為系統預設語系
└─────────┬───────────┘
          │ 儲存時 / 啟動時比對
┌─────────▼───────────┐
│   sys_languages     │  ← 語系翻譯資料表
│     (資料表)         │     每語系一筆，含完整翻譯 JSONB
└─────────┬───────────┘
          │ 寫出實體檔案
┌─────────▼───────────┐
│  locales/*.json     │  ← 前端 i18n 直接讀取
│  (實體語系檔)        │     如 locales/zh-TW/translation.json
└─────────────────────┘
```

## 2. system_codes 語系代碼

### 2.1 代碼定義

在 system_codes 中建立 `Language` 類別，定義系統所有可選用的語系：

| 欄位 | 值 | 說明 |
|------|---|------|
| code_etype | `Language` | 代碼類別識別碼 |
| code_ctype | `語系` | 代碼類別中文名稱 |

### 2.2 資料範例

| code | code_cname | code_ename | order | note1 | note2 |
|------|-----------|-----------|-------|-------|-------|
| zh-TW | 繁體中文 | Traditional Chinese | 10 | 繁中 | i18next |
| en | 英文 | English | 20 | EN | i18next |
| zh-CN | 簡體中文 | Simplified Chinese | 30 | 简中 | i18next |
| ja | 日文 | Japanese | 40 | 日本語 | i18next |
| ko | 韓文 | Korean | 50 | 한국어 | i18next |

### 2.3 欄位用途

| 欄位 | 用途 |
|------|------|
| code | IETF 語言標籤，與 i18next language code 一致 |
| code_cname | 語系中文名稱（管理介面顯示） |
| code_ename | 語系英文名稱 |
| order | 顯示排序（兩碼間距：10, 20, 30...） |
| note1 | 語系簡稱（供語系切換按鈕顯示） |
| note2 | i18n 框架名稱（預留，目前統一為 i18next） |

## 3. sys_languages 語系翻譯資料表

### 3.1 資料表定義

新建 `sys_languages` 資料表，儲存每個語系的完整翻譯內容：

| 欄位名稱 | 資料類型 | 必填 | 預設值 | 說明 |
|---------|---------|------|-------|------|
| id | SERIAL (PK) | Y | 自動遞增 | 資料編號 |
| lang_code | VARCHAR(10) | Y | - | 語系代碼（IETF 標籤，如 zh-TW），UNIQUE |
| lang_cname | VARCHAR(100) | Y | - | 語系中文名稱 |
| lang_ename | VARCHAR(100) | Y | - | 語系英文名稱 |
| lang_data | JSONB | Y | '{}' | 完整翻譯 JSON 資料 |
| is_active | BOOLEAN | Y | TRUE | 啟用狀態 |
| edit_by | INTEGER (FK) | Y | - | 編輯者（users.id） |
| created_at | TIMESTAMP | Y | CURRENT_TIMESTAMP | 建立時間 |
| updated_at | TIMESTAMP | Y | CURRENT_TIMESTAMP | 修改時間 |

### 3.2 索引

| 索引名稱 | 欄位 | 類型 |
|---------|------|------|
| idx_sys_languages_code | (lang_code) | UNIQUE |
| idx_sys_languages_active | (is_active) | INDEX |

### 3.3 lang_data 結構

`lang_data` 欄位儲存的 JSON 結構與目前前端 `translation.json` 完全一致：

```json
{
  "common": {
    "save": "儲存",
    "cancel": "取消",
    ...
  },
  "auth": {
    "login": "使用者登入",
    ...
  },
  ...
}
```

### 3.4 初始資料

系統初始化時，將目前前端 `locales/zh-TW/translation.json` 和 `locales/en/translation.json` 的內容匯入為初始資料。

## 4. sys_profiles 擴充

### 4.1 新增欄位

在 sys_profiles 資料表新增一個欄位：

| 欄位名稱 | 資料類型 | 必填 | 預設值 | 說明 |
|---------|---------|------|-------|------|
| sys_languages | JSONB | Y | '["zh-TW"]' | 啟用的語系代碼陣列 |

### 4.2 欄位規則

- 陣列中的值必須存在於 sys_languages 資料表中
- 陣列不可為空，至少需保留一個語系
- **陣列第一個元素為系統預設語系**
- 範例值：
  - 單語系：`["zh-TW"]`
  - 雙語系：`["zh-TW", "en"]`
  - 三語系：`["zh-TW", "en", "ja"]`

## 5. 實體語系檔同步機制

### 5.1 語系檔位置

```
Develop/frontend/src/locales/
  ├── zh-TW/
  │   └── translation.json    ← 由 sys_languages.lang_data 寫出
  ├── en/
  │   └── translation.json
  └── ja/
      └── translation.json    ← 啟用新語系時自動建立
```

### 5.2 同步時機

#### 時機一：系統設定儲存時

當管理者在系統設定頁面修改 `sys_languages` 並儲存時：

```
1. 驗證所選語系皆存在於 sys_languages 資料表
2. 更新 sys_profiles.sys_languages
3. 遍歷啟用的語系代碼：
   a. 從 sys_languages 取得 lang_data
   b. 寫出到 locales/{lang_code}/translation.json
4. 刪除未啟用語系的 locales 目錄（可選）
5. 回傳更新結果
```

#### 時機二：系統啟動時

後端應用程式啟動時（lifespan 事件）：

```
1. 讀取 sys_profiles.sys_languages 取得啟用語系列表
2. 遍歷啟用的語系：
   a. 檢查 locales/{lang_code}/translation.json 是否存在
   b. 比對檔案內容與 sys_languages.lang_data 是否一致
      （可用 hash 或 updated_at 比對）
   c. 不一致 → 重新寫出
   d. 一致 → 跳過，不需調整
3. 記錄同步結果到日誌
```

### 5.3 比對策略

為避免每次啟動都做完整 JSON 比對，建議：

- sys_languages 資料表增加 `data_hash VARCHAR(64)` 欄位，存放 lang_data 的 SHA-256 hash
- 實體檔案同名目錄下增加 `.hash` 檔記錄目前檔案的 hash
- 啟動時只比對 hash，不同才重新寫出

## 6. 前端整合

### 6.1 i18n 初始化調整

目前 `i18n.ts` 靜態 import 翻譯檔，需改為動態載入：

```typescript
// 現行方式（靜態）
import zhTW from './locales/zh-TW/translation.json';
import en from './locales/en/translation.json';

// 改為動態方式
// 從 /api/system/profile 取得 sys_languages
// 根據啟用語系動態載入對應的 translation.json
```

可選方案：
- **方案 A**：使用 `i18next-http-backend` 從後端 `/locales/{lang}/translation.json` 動態載入
- **方案 B**：啟動時從 API 取得啟用語系列表和預設語系，再動態 import

### 6.2 語系切換器（LanguageSwitcher）調整

目前寫死兩個按鈕（繁中 / EN），需改為動態：

```
從 SystemContext 取得啟用語系列表
  ├── 只有 1 個語系 → 不顯示切換器
  ├── 2 個語系 → 顯示兩個按鈕
  └── 3 個以上 → 顯示下拉選單或按鈕組
```

按鈕文字使用 system_codes Language 的 `note1`（簡稱）。

### 6.3 SystemContext 擴充

SystemContext 需新增：

```typescript
interface SystemContextType {
  // 現有...
  systemProfile: SystemProfile | null;
  isService: boolean;

  // 新增
  availableLanguages: string[];     // 啟用的語系代碼 ["zh-TW", "en"]
  defaultLanguage: string;          // 預設語系（陣列第一個）
  languageOptions: LanguageOption[]; // 語系選項（含名稱、簡稱）
}

interface LanguageOption {
  code: string;       // zh-TW
  cname: string;      // 繁體中文
  ename: string;      // Traditional Chinese
  shortName: string;  // 繁中（來自 system_codes note1）
}
```

### 6.4 系統設定頁面（SysProfilePage）擴充

新增「語系設定」區塊：

```
┌─────────────────────────────────────────────────┐
│  語系設定                                        │
│                                                  │
│  可用語系：                                       │
│  ☑ 繁體中文 (zh-TW)   ← 預設語系（不可取消）      │
│  ☑ 英文 (en)                                     │
│  ☐ 簡體中文 (zh-CN)                              │
│  ☐ 日文 (ja)                                     │
│                                                  │
│  ※ 第一個勾選的語系為系統預設語系                   │
│  ※ 至少需啟用一個語系                              │
│  ※ 儲存後系統將自動產生對應的語系檔案               │
└─────────────────────────────────────────────────┘
```

語系選項從 `system_codes` 的 `Language` 類別動態取得。

## 7. API 介面

### 7.1 現有 API 擴充

#### GET /api/sys_profiles/
回應新增 `sys_languages` 欄位：

```json
{
  "id": 1,
  "is_service": true,
  "sys_languages": ["zh-TW", "en"],
  ...
}
```

#### PUT /api/sys_profiles/
接受 `sys_languages` 欄位更新，儲存時觸發語系檔同步。

### 7.2 新增 API

#### GET /api/system/languages
取得目前啟用的語系資訊（公開端點，不需登入，供前端初始化用）：

```json
{
  "default_language": "zh-TW",
  "languages": [
    {
      "code": "zh-TW",
      "cname": "繁體中文",
      "ename": "Traditional Chinese",
      "short_name": "繁中"
    },
    {
      "code": "en",
      "cname": "英文",
      "ename": "English",
      "short_name": "EN"
    }
  ]
}
```

#### GET /api/sys_languages/
取得所有語系翻譯資料列表（需登入 + 權限）。

#### GET /api/sys_languages/{lang_code}
取得單一語系的翻譯資料（含完整 lang_data）。

#### PUT /api/sys_languages/{lang_code}
更新語系翻譯內容（lang_data）。

## 8. 資料流程

### 8.1 新增語系流程

```
1. 管理者在 system_codes 新增 Language 類別資料
   （如 code=ja, code_cname=日文）

2. 管理者在 sys_languages 資料表建立翻譯資料
   （lang_code=ja, lang_data={完整翻譯JSON}）

3. 管理者在系統設定頁面勾選啟用「日文」
   → sys_profiles.sys_languages = ["zh-TW", "en", "ja"]

4. 儲存時後端自動：
   a. 寫出 locales/ja/translation.json
   b. 前端重新載入語系設定
   c. 語系切換器出現「日本語」選項
```

### 8.2 停用語系流程

```
1. 管理者在系統設定頁面取消勾選「日文」
   → sys_profiles.sys_languages = ["zh-TW", "en"]

2. 儲存時後端自動：
   a. 移除 locales/ja/ 目錄（或保留不刪除）
   b. 前端重新載入語系設定
   c. 語系切換器不再顯示「日本語」
   d. 使用日文的使用者自動切回預設語系
```

## 9. 應用系統開發語系作業規範

### 9.1 概述

Base AP 作為基底平台，其翻譯內容會隨應用系統的功能開發而持續擴充。語系管理以**資料庫為主、檔案為輔**的原則運作 —— 資料庫是翻譯資料的唯一真實來源（Single Source of Truth），實體語系檔僅為供前端讀取的產出物。

### 9.2 開發階段作業流程

```
                開發環境                              正式環境
┌─────────────────────────────┐     ┌──────────────────────────┐
│ 1. 開發者編寫前端功能         │     │                          │
│    新增翻譯 key              │     │  sys_languages 資料表     │
│           ↓                 │     │  (lang_data JSONB)       │
│ 2. 更新 locales/*.json      │     │         ↓                │
│    (開發用本機檔案)           │     │  產出 locales/*.json      │
│           ↓                 │     │  (實體語系檔)             │
│ 3. 功能開發完成              │     │         ↓                │
│           ↓                 │     │  前端 i18n 讀取           │
│ 4. 將 JSON 匯入資料庫        │     └──────────────────────────┘
│    → sys_languages.lang_data │
│           ↓                 │
│ 5. 部署到正式環境            │
└─────────────────────────────┘
```

### 9.3 翻譯 Key 新增規範

開發者新增前端功能時，需同步維護所有已啟用語系的翻譯：

#### Step 1：確認翻譯 Key 命名

```
命名規則：{模組名稱}.{功能}.{項目}

範例：
  projects.title          → "專案管理"
  projects.fields.name    → "專案名稱"
  projects.messages.saved → "儲存成功"
```

#### Step 2：在開發環境更新本機語系檔

同步更新所有語系的 `translation.json`：

```json
// locales/zh-TW/translation.json
{
  "projects": {
    "title": "專案管理",
    "fields": {
      "name": "專案名稱"
    }
  }
}

// locales/en/translation.json
{
  "projects": {
    "title": "Project Management",
    "fields": {
      "name": "Project Name"
    }
  }
}
```

#### Step 3：功能開發完成後匯入資料庫

將本機語系檔內容更新到 `sys_languages` 資料表：

```python
# 匯入腳本範例
import json
from app.models.syslanguage import SysLanguage

# 讀取本機語系檔
with open('locales/zh-TW/translation.json', 'r', encoding='utf-8') as f:
    zh_data = json.load(f)

# 更新資料庫
lang = db.query(SysLanguage).filter(SysLanguage.lang_code == 'zh-TW').first()
lang.lang_data = zh_data
db.commit()
```

### 9.4 翻譯資料合併策略

當多位開發者同時開發不同模組時，需注意翻譯 Key 的合併：

```
開發者 A 新增 projects 模組翻譯
開發者 B 新增 reports 模組翻譯
               ↓
合併時：以 JSON key 為單位做 deep merge
       不同模組的 key 不會衝突
       同一模組的 key 由最後更新者為準
```

**建議做法**：
- 每個模組的翻譯放在獨立的頂層 key 下（如 `projects`、`reports`）
- 避免修改其他模組的翻譯 key
- 合併衝突時以功能分支的版本為準

### 9.5 版本部署流程

應用系統版本部署時的語系處理：

```
1. 開發完成，所有語系翻譯已更新到本機 JSON
2. 執行匯入腳本，將所有語系 JSON 寫入 sys_languages.lang_data
3. 部署應用程式到正式環境
4. 系統啟動時自動比對：
   a. sys_languages.lang_data (資料庫) vs locales/*.json (實體檔案)
   b. 不一致 → 重新從資料庫產出實體檔案
   c. 一致 → 不做處理
5. 前端載入最新語系檔
```

### 9.6 注意事項

| 項目 | 說明 |
|------|------|
| 翻譯完整性 | 新增 key 時必須同步更新所有已啟用語系，缺漏的 key 會導致前端顯示 key 名稱 |
| 開發環境 | 開發時可直接修改本機 locales/*.json，不需每次都走資料庫 |
| 正式環境 | 正式環境以資料庫為準，禁止直接修改實體語系檔（會被系統覆蓋） |
| 新增語系 | 新增一個語系時，需翻譯所有現有 key，建議以預設語系的 JSON 為模板 |
| Key 刪除 | 移除功能時應同步清理對應的翻譯 key，避免資料庫中累積無用資料 |

## 10. 異動影響範圍

### 10.1 資料庫

| 項目 | 異動 |
|------|------|
| system_codes | 新增 Language 類別資料（DML） |
| sys_profiles | 新增 sys_languages JSONB 欄位（DDL） |
| sys_languages | 新建資料表（DDL） |

### 10.2 後端

| 檔案 | 異動 |
|------|------|
| app/models/sysprofile.py | 新增 sys_languages 欄位 |
| app/models/syslanguage.py | **新增**：SysLanguage model |
| app/schemas/sysprofile.py | 新增 sys_languages 欄位 |
| app/schemas/syslanguage.py | **新增**：SysLanguage schemas |
| app/routes/sysprofile.py | PUT 時觸發語系檔同步 |
| app/routes/system.py | 新增 GET /api/system/languages 端點 |
| app/routes/syslanguage.py | **新增**：語系翻譯 CRUD 路由 |
| app/services/language_service.py | **新增**：語系檔同步服務 |
| app/main.py | lifespan 中加入語系檔啟動同步 |
| app/models/__init__.py | 註冊 SysLanguage model |
| init_db.sql | 新增 sys_languages 表、sys_profiles 欄位、Language 代碼 |

### 10.3 前端

| 檔案 | 異動 |
|------|------|
| src/i18n.ts | 改為動態載入語系檔 |
| src/components/LanguageSwitcher.tsx | 改為動態語系按鈕 |
| src/contexts/SystemContext.tsx | 新增語系相關 state |
| src/pages/SysProfilePage.tsx | 新增語系設定區塊 |
| src/types/index.ts | 新增語系相關型別 |
| src/api/systemService.ts | 新增語系 API 呼叫 |
