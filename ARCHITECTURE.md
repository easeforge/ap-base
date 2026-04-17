# Base AP 架構文件

## Community Edition (CE) vs Enterprise Edition (EE)

Base AP 採雙軌發行：

| | Community Edition | Enterprise Edition |
|---|---|---|
| Repo | `ap-base`（git.lab.taipei/porsche/ap-base） | `ap-base-ee`（private） |
| 授權 | MIT（自由使用、商用、修改）| 商用授權契約 |
| 發布方式 | 原始碼 + release | 原始碼僅供授權客戶 + license.key |
| 功能範圍 | 完整的基底後臺平台（使用者/組織/角色/系統功能/訊息/多語系/橫式版面等）| CE + 進階商用功能（排程、AI、SSO 等） |
| 啟用方式 | 無需設定 | 放入有效的 `license.key` 後自動啟用 |

**CE 能完整運作**，使用者若不需要商用功能可永久使用 CE。商用功能是 **選配加值**。

---

## License Key 機制

### 設計目標

1. **CE 程式碼完全公開**（MIT），包含 license 驗證邏輯與公鑰
2. **商用功能程式碼不在 CE**（即使有偽造 license 也啟用不了功能）
3. **使用 Ed25519 數位簽章**（公鑰嵌入 CE，私鑰僅商用版團隊持有）
4. **離線驗證**（license.key 一次簽發，後續驗證不需連外）

### 雙重保護模型

```
           無 license.key ──┬─ CE 正常運作（所有 EE 功能關閉）
                            │
擁有 CE 原始碼 + license ──┬┴─ 仍然只有 CE 功能（商用功能程式不存在於 CE）
                            │
擁有 EE 原始碼 + license ──┴─ 簽章有效 → EE 功能啟用
                            │
擁有 EE 原始碼 + 偽造 license ─ 簽章驗證失敗 → EE 功能關閉
```

想啟用 EE 功能需**同時擁有**：
- EE 原始碼（`app/ee/` 目錄下的模組程式）
- 由商用版團隊簽發的有效 `license.key`

### Ed25519 Keypair

**Private Key（簽發端）**
- 持有人：商用版發布團隊
- 存放：HSM / 離線環境 / 加密備份
- 用途：用 `tools/sign_license.py` 簽發 license.key 給客戶
- **絕對不可外流**

**Public Key（驗證端）**
- 嵌入：[app/core/license.py](Develop/backend/app/core/license.py) 的 `LICENSE_PUBLIC_KEY_HEX` 常數
- 公開：任何人可以看（CE 是 MIT 開源）
- 用途：驗證 license.key 簽章是否由商用團隊簽發

### License Key 結構

```json
{
  "header": {"alg": "ed25519", "typ": "base-ap-license", "ver": 1},
  "payload": {
    "customer_id": "cust-001",
    "customer_name": "Example Corp",
    "features": ["scheduler", "ai", "sso"],
    "issued_at": "2026-04-18T00:00:00+00:00",
    "expires_at": "2027-04-18T00:00:00+00:00",
    "max_users": 100,
    "max_organizations": 10
  },
  "signature": "base64url-encoded Ed25519 signature of canonical JSON payload"
}
```

### 驗證流程（CE 執行）

1. 啟動時 `LicenseManager.load_from_file('./license.key')`
2. 檢查檔案存在 → 不存在則維持 Community 狀態
3. 解析 JSON → 格式錯誤拒絕
4. 用嵌入的公鑰驗證 `signature` 對 `payload` 是否合法 → 失敗則拒絕
5. 檢查 `expires_at` > 當下時間 → 過期則拒絕
6. 全部通過 → 設定 `edition='enterprise'`，`features=payload.features`

---

## Plugin 機制（CE 為 EE 預留的掛入點）

### 整體概念

CE **不知道** EE 有哪些功能（解耦）。EE 模組在被匯入時自己呼叫 `register_*` 註冊進 CE。

```
┌─────────────────────┐       ┌─────────────────────┐
│  CE (ap-base)       │       │  EE (ap-base-ee)    │
│  ━━━━━━━━━━━━━━━━━  │       │  ━━━━━━━━━━━━━━━━━  │
│                     │       │                     │
│  app/core/          │       │  app/ee/            │
│  ├── license.py ────┼───────┤  ├── scheduler/     │
│  ├── plugin.py ─────┼───────┤  │   ├── routes.py  │
│  │                  │       │  │   └── __init__.py│ ← 啟動時
│  main.py            │       │  │       │          │   註冊 router
│  ├── 啟動流程       │       │  │       │          │   + startup hook
│  │   load_ee... ────┼───────┤  └── ai/            │
│  │   hooks/routes   │       │      └── ...        │
└─────────────────────┘       └─────────────────────┘
```

### 主要 API（`app/core/plugin.py`）

```python
# EE 模組典型寫法
from app.core.license import LicenseManager
from app.core.plugin import register_router, register_startup

# 1. 檢查授權
if LicenseManager.has('scheduler'):
    # 2. 匯入路由
    from .routes import router
    # 3. 註冊
    register_router(router, prefix='/api/ee/scheduler', tags=['EE-排程'])
    # 4. 註冊啟動鉤子
    register_startup(start_scheduler)
```

**CE 的 `main.py` 啟動流程**

1. 建立 DB / Redis 連線
2. 同步 i18n 檔案
3. **載入 License** (`LicenseManager.load_from_file`)
4. **匯入 app.ee**（`load_ee_if_present`，CE 環境下找不到就算了）
5. **跑 EE 註冊的 startup hooks**（`run_startup_hooks`）
6. **掛載 EE 註冊的 routes**（`get_registered_routers`）
7. 開始提供服務

---

## 目錄結構對照

### CE Repo（ap-base）

```
ap-base/
├── LICENSE                              ← MIT
├── ARCHITECTURE.md                      ← 本文件
├── Develop/
│   ├── backend/
│   │   ├── app/
│   │   │   ├── core/
│   │   │   │   ├── license.py           ← License 驗證（公開）
│   │   │   │   ├── plugin.py            ← Plugin hook 機制（公開）
│   │   │   │   └── ...
│   │   │   ├── routes/                  ← CE 路由
│   │   │   ├── models/
│   │   │   └── main.py
│   │   └── tools/
│   │       ├── generate_license_keypair.py  ← 商用團隊用（產金鑰）
│   │       └── sign_license.py              ← 商用團隊用（簽 license）
│   └── frontend/
│       └── src/
│           ├── contexts/SystemContext.tsx   ← 提供 hasFeature() hook
│           └── ...
└── .gitignore                           ← 已排除 license.key / *.pem
```

### EE Repo（ap-base-ee）— 尚未建立

```
ap-base-ee/
├── (繼承 CE 所有檔案作為 upstream)
├── Develop/
│   └── backend/
│       ├── app/
│       │   └── ee/                     ← EE 專屬模組
│       │       ├── __init__.py         ← 匯入各子模組觸發註冊
│       │       ├── scheduler/
│       │       │   ├── __init__.py     ← check license + register_router
│       │       │   ├── routes.py
│       │       │   ├── services.py
│       │       │   └── models.py
│       │       ├── ai/
│       │       ├── sso/
│       │       └── audit_report/
│       └── license.key                 ← 開發用 license（.gitignore）
└── .gitignore                          ← 額外排除 license key 產出物
```

---

## 商用版發布流程

### 首次設定（僅執行一次）

```bash
# 1. 產生簽發用金鑰對
cd Develop/backend
venv/Scripts/python tools/generate_license_keypair.py
# → license_keys/private_key.pem  （保存好）
# → license_keys/public_key.hex   （複製 hex 字串）

# 2. 把公鑰嵌入 CE
# 編輯 app/core/license.py
# LICENSE_PUBLIC_KEY_HEX = "abc123...上一步產生的 hex"

# 3. 保存私鑰到安全位置（HSM / 加密 USB / 保險箱）
# 4. 刪除本機的 private_key.pem
# 5. Commit 並發布 CE（含公鑰）

# 6. 建立 ap-base-ee repo，fork 自 CE
```

### 簽發 license 給客戶

```bash
# 在有私鑰的環境執行
venv/Scripts/python tools/sign_license.py \
    --private-key /path/to/private_key.pem \
    --customer-id cust-001 \
    --customer-name "Example Corp" \
    --features scheduler ai \
    --expires-days 365 \
    --max-users 100 \
    --output license.key

# license.key 交付給客戶
```

### 客戶啟用 EE

1. 購買 EE 後收到 `license.key`
2. 放到 `Develop/backend/license.key`
3. 重啟後端 → log 顯示 `License: edition=enterprise, features=[...]`
4. EE 路由 `/api/ee/*` 開始可用
5. 前端 `hasFeature('scheduler')` 回 `true`，EE 選單顯示

---

## 前端 Feature Gating

```typescript
// 頁面中判斷是否啟用 EE 功能
const { license, hasFeature } = useSystem();

if (hasFeature('scheduler')) {
  // 顯示排程管理選單
}

// 整個頁面可能根據 edition 條件渲染
{license?.edition === 'enterprise' && <EEMenuItem />}
```

---

## FAQ

**Q1：如果我刪掉 `LICENSE_PUBLIC_KEY_HEX` 把它設成自己的公鑰呢？**
A：CE 是 MIT，你當然可以改。但這樣你就是在分叉出自己的版本，與原廠商用版不相容（原廠的 license.key 對你的版本無效，反之亦然）。

**Q2：我能不能把 EE 原始碼洩漏出去？**
A：EE 原始碼由商業契約保護。即使洩漏，沒有 license.key 也跑不起來（驗證會失敗）。但契約違約後果請參考購買合約。

**Q3：為什麼不把 license 驗證也藏起來？**
A：這違反 MIT 的精神，也沒有安全意義。安全性來自**私鑰**而非**演算法**。驗證邏輯公開反而有助於建立信任，客戶可以自行檢查驗證過程沒有後門。

**Q4：我能買 EE 但 fork 成自己版本嗎？**
A：EE 的使用依商業契約，通常會限制再發布。CE（MIT）可以自由 fork 任何內容。
