# system_codes 系統代碼設計規格

## 1. 概述

系統代碼（system_codes）為 Base AP 後臺管理基底平台的通用代碼管理機制，用於集中管理各種分類代碼、下拉選單選項、標準代碼對照等結構化資料。採用統一資料表搭配 `code_etype`（代碼類別）進行分類，支援階層式關聯與多語系。

## 2. 資料表結構

### 2.1 資料表定義 (system_codes)

| 欄位名稱 | 資料類型 | 必填 | 預設值 | 說明 |
|---------|---------|------|-------|------|
| id | SERIAL (PK) | Y | 自動遞增 | 資料編號 |
| code_etype | VARCHAR(100) | Y | - | 代碼類別英文名稱，用於程式識別 |
| code_ctype | VARCHAR(200) | Y | - | 代碼類別中文名稱，用於顯示 |
| code | VARCHAR(50) | Y | - | 代碼編號 |
| code_cname | VARCHAR(300) | Y | - | 代碼中文名稱 |
| code_ename | VARCHAR(300) | N | NULL | 代碼英文名稱 |
| order | INTEGER | Y | 0 | 顯示次序 |
| is_active | BOOLEAN | Y | TRUE | 啟用狀態 |
| note1 | VARCHAR(500) | N | NULL | 擴充欄位 1（用途依類別定義） |
| note2 | VARCHAR(500) | N | NULL | 擴充欄位 2（用途依類別定義） |
| note3 | VARCHAR(500) | N | NULL | 擴充欄位 3（用途依類別定義） |
| note4 | VARCHAR(500) | N | NULL | 擴充欄位 4（用途依類別定義） |
| note5 | VARCHAR(500) | N | NULL | 擴充欄位 5（用途依類別定義） |
| edit_by | INTEGER (FK) | Y | - | 編輯者（users.id） |
| created_at | TIMESTAMP | Y | CURRENT_TIMESTAMP | 建立時間 |
| updated_at | TIMESTAMP | Y | CURRENT_TIMESTAMP | 修改時間 |

### 2.2 索引

| 索引名稱 | 欄位 | 說明 |
|---------|------|------|
| idx_system_codes_type | (code_etype, code_ctype) | 代碼類別查詢 |
| idx_system_codes_code | (code) | 代碼編號查詢 |
| idx_system_codes_active | (is_active) | 啟用狀態篩選 |
| idx_system_codes_order | (order) | 排序 |

## 3. 欄位設計說明

### 3.1 代碼類別 (code_etype / code_ctype)

- `code_etype`：英文識別名稱，程式內部使用，命名規則為大駝峰或底線分隔（如 `Country_Codes_2`、`TWN_Area`）
- `code_ctype`：中文顯示名稱，給使用者閱讀（如「國家代碼-2位代碼」、「台灣行政區域」）
- 同一 `code_etype` 下的所有資料共用相同的 `code_ctype`

### 3.2 代碼編號 (code)

- 該類別下的唯一識別碼
- 長度與格式依類別而定（如國家代碼 2~3 碼、行政區碼 3~6 碼）
- 同一 `code_etype` 內不應重複

### 3.3 擴充欄位 (note1 ~ note5)

5 個通用擴充欄位，用途依代碼類別自行定義：

| 常見用途 | 說明 |
|---------|------|
| 上層代碼關聯 | 用 note1 存放父層代碼，實現階層結構 |
| 對照碼 | 如 Alpha-2 對應 Alpha-3 的交叉對照 |
| 補充資訊 | 郵遞區號、ISO 標準編號等 |

### 3.4 顯示次序 (order)

- 控制同類別內的排列順序
- 數值越小越前面
- 客製化規劃應採用兩碼數字碼（10, 20, 30...），以保留間距供日後插入
- 國際標準代碼（如 ISO 3166-1）依其標準排序（如按英文名稱 A-Z 連續編號 1, 2, 3...）
- 範例：自訂業務代碼使用 10, 20, 30；需在 20 和 30 之間插入時使用 25

## 4. 多語系處理

### 4.1 欄位角色定義

| 欄位 | 角色 | 語系用途 | 說明 |
|------|------|---------|------|
| `code_etype` | 程式識別 Key | **不參與語系切換** | 程式內部識別用，固定英文命名，不顯示給終端使用者 |
| `code_ctype` | 類別中文名稱 | zh-TW 顯示 | 代碼類別的中文顯示名稱 |
| `code` | 代碼編號 | **不隨語系變化** | 固定值，如 `TW`、`630` |
| `code_cname` | 代碼中文名稱 | zh-TW 顯示 | 代碼項目的中文名稱 |
| `code_ename` | 代碼英文名稱 | en 顯示 | 代碼項目的英文名稱（選填） |

> **重要**：`code_etype` 是程式識別用的 Key（如 `Country_Codes_2`、`TWN_Area`），不是英文顯示名稱，語系切換時不應將其作為英文翻譯顯示。

### 4.2 前端語系切換規則

前端根據 `i18n.language` 決定顯示哪個欄位：

| 顯示項目 | 繁中 (zh-TW) | 英文 (en) | Fallback |
|---------|-------------|-----------|----------|
| 代碼類別 | `code_ctype` | `code_ctype` | 類別名稱不做語系切換，統一顯示中文（因 `code_etype` 為程式 Key，非英文翻譯） |
| 代碼名稱 | `code_cname` | `code_ename` → `code_cname` | 英文為空時回退到中文 |
| 代碼編號 | `code` | `code` | 固定值，不隨語系變化 |

**Fallback 機制**：`code_ename` 為選填欄位，當英文語系下 `code_ename` 為空時，應顯示 `code_cname` 作為替代，避免畫面出現空白。

### 4.3 前端實作範例

```typescript
// 取得代碼顯示名稱（依語系）
const getCodeDisplayName = (code: SystemCode, lang: string): string => {
  if (lang === 'en') {
    return code.code_ename || code.code_cname;  // 英文為空時 fallback 到中文
  }
  return code.code_cname;
};

// 取得代碼類別顯示名稱
// code_ctype 為中文類別名稱，不隨語系切換
// code_etype 為程式識別 Key，僅供管理頁面參考顯示
const getTypeDisplayName = (code: SystemCode): string => {
  return code.code_ctype;
};

// 下拉選單 option 渲染
const renderOption = (code: SystemCode) => {
  const name = getCodeDisplayName(code, i18n.language);
  return <option key={code.id} value={code.code}>{name}</option>;
};
```

### 4.4 管理頁面語系處理

系統代碼管理頁面（SystemCodesPage）為管理者使用，顯示規則如下：

| 頁面元素 | zh-TW 顯示 | en 顯示 | 說明 |
|---------|-----------|--------|------|
| 代碼類別欄 | `code_ctype` | `code_ctype` | 類別名稱不做語系切換 |
| 代碼類別識別碼 | `code_etype`（輔助顯示） | `code_etype` | 管理頁面可附帶顯示供開發者參考 |
| 代碼名稱欄 | `code_cname` | `code_ename`（空則顯示 `code_cname`） | 英文有 Fallback |
| 編輯表單 | 中英文欄位皆顯示，各自填寫 | 同左 | 新增/編輯時不受語系影響 |

### 4.5 新增代碼時的語系要求

| 欄位 | 必填 | 說明 |
|------|------|------|
| code_etype | Y | 程式識別 Key，固定英文命名（如 `TWN_Area`），不作為語系顯示用途 |
| code_ctype | Y | 代碼類別中文名稱，必須填寫 |
| code_cname | Y | 代碼中文名稱，必須填寫 |
| code_ename | N | 代碼英文名稱，建議填寫以支援英文語系下拉選單顯示 |

> **注意**：`code_ename` 雖為選填，但若系統需支援英文語系，建議所有代碼項目都填寫英文名稱，以確保語系切換時下拉選單及顯示欄位的完整性。

## 5. API 介面

### 4.1 端點一覽

| 方法 | 路徑 | 說明 | 權限 |
|------|------|------|------|
| GET | /api/system_codes/ | 查詢代碼列表（支援篩選與搜尋） | read |
| GET | /api/system_codes/{id} | 取得單筆代碼 | read |
| POST | /api/system_codes/ | 建立代碼 | create |
| PUT | /api/system_codes/{id} | 更新代碼 | update |
| DELETE | /api/system_codes/{id} | 刪除代碼 | delete |
| GET | /api/system_codes/type/{code_etype} | 依類別查詢代碼 | read |

### 4.2 查詢參數 (GET /api/system_codes/)

| 參數 | 類型 | 說明 |
|------|------|------|
| code_etype | string | 代碼類別英文名稱（模糊搜尋） |
| code_ctype | string | 代碼類別中文名稱（模糊搜尋） |
| code | string | 代碼編號（模糊搜尋） |
| code_cname | string | 代碼中文名稱（模糊搜尋） |
| code_ename | string | 代碼英文名稱（模糊搜尋） |
| is_active | boolean | 啟用狀態 |
| search | string | 關鍵字綜合搜尋（搜尋範圍含 code_etype、code_ctype、code、code_cname、code_ename、note1~note5） |

**搜尋邏輯**：
- 當 `search` 參數有值時，以 OR 邏輯搜尋 10 個欄位
- 當 `search` 為空時，各欄位參數以 AND 邏輯組合篩選
- 所有文字搜尋使用 ILIKE（不分大小寫模糊匹配）

### 4.3 依類別查詢 (GET /api/system_codes/type/{code_etype})

| 參數 | 類型 | 說明 |
|------|------|------|
| code_etype | string (path) | 代碼類別英文名稱（精確匹配） |
| code_ctype | string (query) | 代碼類別中文名稱（精確匹配，可選） |
| active_only | boolean (query) | 只查詢啟用的代碼（預設 true） |

### 4.4 排序規則

- 列表查詢：code_etype → code_ctype → order → code
- 類別查詢：order → code

## 6. 代碼類別命名規範

### 6.1 命名原則

- 使用英文，大駝峰或底線分隔
- 國際標準代碼以標準名稱為前綴（如 `Country_Codes_2`）
- 國家/地區相關代碼以 ISO 3166-1 Alpha-3 碼為前綴（如 `TWN_Area`）
- 業務代碼以模組或功能名稱為前綴

### 6.2 目前已定義的代碼類別

| code_etype | code_ctype | 筆數 | 來源標準 | note 欄位用途 |
|-----------|-----------|------|---------|-------------|
| Country_Codes_2 | 國家代碼-2位代碼 | 249 | ISO 3166-1 Alpha-2 | note1: 標準名稱, note2: 對應 Alpha-3 代碼 |
| Country_Codes_3 | 國家代碼-3位代碼 | 249 | ISO 3166-1 Alpha-3 | note1: 標準名稱, note2: 對應 Alpha-2 代碼 |
| TWN_Area | 台灣行政區域 | 390 | 內政部行政區碼 | note1: 上層縣市代碼（空=縣市層）, note2: 郵遞區號 |

## 7. 階層式代碼設計模式

system_codes 支援透過 note 欄位實現階層關聯，設計模式如下：

### 7.1 設計原則

- 同一 `code_etype` 內放置所有層級的資料
- 使用 `note1` 存放上層代碼（父節點的 code 值）
- `note1` 為空表示最上層（根節點）
- 代碼編號（code）本身體現層級結構（如 3 碼=縣市、6 碼=鄉鎮市區）

### 7.2 查詢方式

```
取得所有縣市（第一層）：
  GET /api/system_codes/type/TWN_Area  → 篩選 note1 = ''

取得某縣市的鄉鎮市區（第二層）：
  GET /api/system_codes/type/TWN_Area  → 篩選 note1 = '650' (新北市)
```

## 8. 前端整合

### 8.1 頁面功能

系統代碼管理頁面（SystemCodesPage）提供：
- 關鍵字搜尋（server-side，搜尋 10 個欄位）
- 下拉篩選（client-side，代碼類別 / 代碼編號 / 代碼名稱）
- 資料表顯示（分頁、排序）
- CRUD 操作（新增 / 檢視 / 編輯 / 刪除 / 啟停用）

### 8.2 下拉選單整合

其他頁面引用代碼時，使用 `getSystemCodesByType(code_etype)` 取得下拉選項：

```typescript
// 取得國家代碼 Alpha-2
const countries = await getSystemCodesByType('Country_Codes_2');

// 取得台灣縣市
const cities = (await getSystemCodesByType('TWN_Area'))
  .filter(c => !c.note1);  // note1 為空 = 縣市

// 取得某縣市的區
const districts = (await getSystemCodesByType('TWN_Area'))
  .filter(c => c.note1 === '650');  // 新北市
```

## 9. 擴充指引

新增代碼類別時：

1. 確定 `code_etype` 命名（參照 6.1 命名原則）
2. 定義 `code` 的格式與來源標準
3. 定義 note1~note5 各欄位用途（記錄於本文件 6.2 節）
4. 準備初始資料並透過管理介面或 SQL 匯入
5. 前端引用時使用 `getSystemCodesByType()` API
