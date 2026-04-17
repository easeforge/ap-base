# 系統訊息代碼測試紀錄

## 2026-04-17 — 登入流程訊息代碼整合測試

### 已建立的 sys_message_code

| 代碼 | 環境 | zh-TW | zh-CN | en | 對應開發碼 |
|------|------|-------|-------|------|-----------|
| SYS000000 | production | 系統正常 | 系统正常 | System normal | - |
| ERR010001 | production | 帳號或密碼錯誤 | 帐号或密码错误 | Invalid account or password | ERR510001 |
| ERR010002 | production | 驗證碼錯誤或已過期 | 验证码错误或已过期 | Verification code is incorrect or expired | ERR510002 |
| ERR010003 | production | 帳號已停用 | 帐号已停用 | Account has been disabled | ERR510003 |
| ERR010004 | production | 登入已過期，請重新登入 | 登入已过期，请重新登入 | Session expired, please login again | ERR510004 |
| ERR010005 | production | 無法驗證認證資訊 | 无法验证认证信息 | Authentication failed | ERR510005 |
| ERR010006 | production | 系統錯誤，請稍後再試 | 系统错误，请稍后再试 | System error, please try again later | ERR510006 |

### 測試結果

#### ERR010001 — 帳號或密碼錯誤
- **觸發方式**：登入頁輸入錯誤密碼
- **測試結果**：✓ 通過
- **顯示訊息**：`系統訊息：(ERR010001)帳號或密碼錯誤`

#### ERR010002 — 驗證碼錯誤或已過期
- **觸發方式**：登入頁輸入錯誤驗證碼
- **測試結果**：✓ 通過
- **顯示訊息**：`系統訊息：(ERR010002)驗證碼錯誤或已過期`

#### ERR010003 — 帳號已停用
- **觸發方式**：登入時帳號 `is_active=false`
- **測試結果**：✓ 通過
- **顯示訊息**：`System Message：(ERR010003)Account has been disabled`（英文模式）

#### ERR010004 — 登入已過期
- **觸發方式**：手動刪除 Redis Session 後操作任何頁面
- **測試結果**：✓ 通過
- **顯示訊息**：`System Message：(ERR010004)Session expired, please login again`
- **附註**：發現原本 axios 攔截器 `window.location.href = '/login'` 全頁跳轉太快看不到訊息。
  修正：改帶代碼到 URL `?msg=ERR010004`，由 LoginPage 讀取後翻譯顯示。
  另發現載入時序問題：messageCodes 未載入時會顯示原始代碼，已用 `pendingMsgCode` state 解決。

#### ERR010005 — 無法驗證認證資訊
- **觸發方式**：DevTools Console 設無效 token：
  ```js
  localStorage.setItem('access_token','invalid'); location.href='/home';
  ```
- **測試結果**：✓ 通過
- **顯示訊息**：`系統訊息：(ERR010005)無法驗證認證資訊`

#### ERR010006 — 系統錯誤（Session 建立失敗）
- **觸發方式**：TDD 用 `unittest.mock.patch` 注入 `SessionService.create_session` 回傳 False
- **測試結果**：✓ 通過（3 個 sub-tests 全過）
  - Test 1：正常登入仍正常（baseline 200）
  - Test 2：auth.py 程式碼路徑使用 ERR010006，message-codes API 三語系都有
  - Test 3：Mock 注入失敗 → 後端正確回傳 `500 + ERR010006`
- **測試腳本**：[tools/test_err010006.py](test_err010006.py)
- **執行**：`venv/Scripts/python tools/test_err010006.py`

### 已修改的後端檔案

| 檔案 | 原內容 | 新內容 |
|------|--------|--------|
| `app/routes/auth.py` L59 | `detail="CAPTCHA_INVALID"` | `detail="ERR010002"` |
| `app/routes/auth.py` L68/75 | `detail="INVALID_CREDENTIALS"` | `detail="ERR010001"` |
| `app/routes/auth.py` L82 | `detail="ACCOUNT_DISABLED"` | `detail="ERR010003"` |
| `app/routes/auth.py` L175 | `detail="SESSION_CREATE_FAILED"` | `detail="ERR010006"` |
| `app/core/deps.py` L47 | `detail="AUTH_INVALID"` | `detail="ERR010005"` |
| `app/core/deps.py` L98 | `detail="SESSION_EXPIRED"` | `detail="ERR010004"` |

### 待處理（pending）

全部完成 ✅

（原列項目全部處理完畢：deps.py 清理、開發環境代碼、環境切換邏輯、全模組掃描）

---

## 2026-04-17 下半場 — 全模組訊息代碼轉換完成

### 資料表狀態

| 分類 | 代碼範圍 | 筆數 | 用途 |
|------|---------|------|------|
| 系統狀態 | SYS000000 | 1 | 基準碼 |
| 認證/登入 | ERR010001~010006 | 6 | 正式登入錯誤 |
| 通用 CRUD | ERR020001~020007 | 7 | 跨模組通用錯誤 |
| 使用者/組織 | ERR100001~100004 | 4 | 使用者業務規則 |
| 系統管理 | ERR200001~200003 | 3 | 系統管理業務規則 |
| 開發環境（對應上述正式碼，分類 +50） | ERR510001~700003 | 20 | 含技術細節 |
| **總計** | | **41** | |

### 後端動態切換機制

- 新增 [app/core/message_codes.py](../app/core/message_codes.py)
- `to_env_code(prod_code)` — 依 ENVIRONMENT 換算正式↔開發代碼
- `raise_msg(status, code, **params)` — 統一 HTTPException wrapper，支援參數

API 回應格式：
- 不帶參數：`{"detail": "ERR010001"}`（純字串）
- 帶參數：`{"detail": {"code": "ERR510001", "params": {"account": "admin"}}}`（物件）

### 已清理的 routes 檔案

| 檔案 | 處理的情境數 |
|------|-------------|
| auth.py | 5 |
| deps.py | 4 |
| organization.py | 11 |
| user.py | 22 |
| syslanguage.py | 5 |
| sysprofile.py | 3 |
| system.py | 1 |
| systemcode.py | 6 |
| systemfunction.py | 7 |
| systemnotification.py | 12 |
| roleright.py | 3 |
| userrole.py | 6 |
| userlog.py | 1 |
| **總計** | **86 處** |

### 端對端測試結果（2026-04-17）

全部通過 ✅ 每個模組的「找不到」錯誤都正確使用通用代碼 `ERR520001`：

| 測試情境 | 代碼 | 參數 |
|---------|------|------|
| 找不到組織 (org_id=99999) | ERR520001 | entity=組織單位, id=99999 |
| 找不到使用者 (user_id=99999) | ERR520001 | entity=使用者, id=99999 |
| 找不到系統代碼 (id=99999) | ERR520001 | entity=系統代碼, id=99999 |
| 找不到使用者角色 (id=99999) | ERR520001 | entity=使用者角色, id=99999 |
| 找不到語系 (xx-YY) | ERR520001 | entity=語系, id=xx-YY |

### 前端變更

| 檔案 | 變更 |
|------|------|
| api/axios.ts | 401 攔截器支援物件 detail，參數序列化到 URL |
| contexts/SystemContext.tsx | `getMessageByCode(code, params?)` 支援參數替換 |
| pages/LoginPage.tsx | URL `?msg=代碼&p=JSON` 參數解析，pendingMsgCode 二段式渲染 |
| locales/*/translation.json | 加入 `common.systemMessage` key（三語系） |

### 前端顯示格式

統一：`{系統訊息}：(代碼){翻譯後說明}`

範例：
- zh-TW: `系統訊息：(ERR510001)密碼驗證失敗：bcrypt hash 比對不符（帳號=admin）`
- en: `System Message：(ERR010001)Invalid account or password`
- zh-CN: `系统讯息：(ERR020001)找不到组织单位`

### 工具腳本

| 腳本 | 用途 |
|------|------|
| tools/insert_message_code.py | 單筆新增/更新訊息代碼（命令列 + 程式呼叫） |
| tools/insert_dev_codes.py | 批次建立開發環境登入代碼 |
| tools/insert_generic_codes.py | 批次建立通用 CRUD + 模組代碼 |
| tools/test_err010006.py | ERR010006 完整 TDD 測試 |

### 工具

- [tools/insert_message_code.py](insert_message_code.py)：新增/更新訊息代碼（命令列 + 程式呼叫）
- [tools/test_err010006.py](test_err010006.py)：ERR010006 完整 TDD 測試

### 工作流程模板

```bash
# 1. 建代碼
venv/Scripts/python tools/insert_message_code.py \
  ERR010007 "繁中說明" "简中说明" "English description" \
  --pair ERR510007

# 2. 修改後端 detail 字串為新代碼
# (手動 edit 對應檔案)

# 3. 重啟後端
taskkill /PID <pid> /F
nohup venv/Scripts/python -m uvicorn app.main:app --host 0.0.0.0 --port 10181 > /tmp/backend.log 2>&1 &

# 4. 驗證 message-codes API
curl -s "http://localhost:10181/api/system/message-codes?lang=zh-TW"

# 5. 前端測試（強制重整 Ctrl+F5）
```

### 注意事項

1. **i18n key 同步**：`common.systemMessage` 必須在 `sys_languages.lang_data` 三個語系都有，否則前端顯示 fallback。後端啟動會把 DB 同步到靜態檔案，所以**只能改 DB 不能直接改靜態檔案**。
2. **前端載入時序**：登入頁從 URL 讀代碼時，messageCodes 可能還未載入。已用 `pendingMsgCode` state + 二次 useEffect 解決。
3. **轉址訊息保留**：401 全頁跳轉會清掉 console，必須把代碼帶到 URL 才能跨頁面顯示。
