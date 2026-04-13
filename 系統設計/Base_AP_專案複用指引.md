# Base AP 專案複用指引

**版本：** v1.0.0  
**更新日期：** 2026-04-13

如何將 Base AP 基底平台複用到多個應用專案，並保持基底更新可同步。

---

## 目錄

1. [架構概念](#1-架構概念)
2. [方案：Git Fork + Upstream 同步](#2-方案git-fork--upstream-同步)
3. [Step 1：準備基底 Repository](#3-step-1準備基底-repository)
4. [Step 2：建立應用專案（Fork）](#4-step-2建立應用專案fork)
5. [Step 3：應用專案開發](#5-step-3應用專案開發)
6. [Step 4：同步基底更新到應用專案](#6-step-4同步基底更新到應用專案)
7. [程式碼分層規範](#7-程式碼分層規範)
8. [降低合併衝突的設計原則](#8-降低合併衝突的設計原則)
9. [多技術棧擴展（Java / .NET）](#9-多技術棧擴展java--net)
10. [完整操作範例](#10-完整操作範例)

---

## 1. 架構概念

### 1.1 問題

```
Base AP（基底平台）不斷發展 → bug fix、新功能、安全修補
    ↓
多個應用專案各自使用 Base AP → 需要接收基底修正
    ↓
應用專案有自己的客製化 → 修改 UI、新增功能模組
    ↓
如何讓「基底更新」和「專案客製」不互相衝突？
```

### 1.2 解法：Fork + Upstream

```
ap.base（基底 repo）          ← 持續開發維護
    │
    ├── fork → ap.projectA    ← 應用專案 A（有自己的功能模組）
    ├── fork → ap.projectB    ← 應用專案 B
    └── fork → ap.projectC    ← 應用專案 C
         │
         └── git pull upstream  ← 定期從基底拉回更新
```

每個應用專案是基底的 **fork**，保有完整的 git 歷史，可以隨時從基底拉回更新（merge）。

### 1.3 優缺點

| 優點 | 說明 |
|------|------|
| ✅ 基底更新可同步 | `git merge upstream/main` 即可拉回基底修正 |
| ✅ 各專案獨立 | 每個專案有自己的 repo，互不影響 |
| ✅ 衝突可控 | 遵循分層規範，衝突集中在少數檔案 |
| ✅ 簡單直覺 | 標準 git 操作，不需額外工具 |

| 缺點 | 緩解方式 |
|------|---------|
| ⚠️ 合併可能有衝突 | 遵循 §7 分層規範，將客製化集中在應用層 |
| ⚠️ 每個專案要手動拉更新 | 可寫 CI 腳本自動偵測並提 PR |

---

## 2. 方案：Git Fork + Upstream 同步

### 2.1 Repository 關係

```
GitHub / GitLab:
  org/ap.base          ← 基底平台 (upstream)
  org/ap.projectA      ← 應用專案 A (fork)
  org/ap.projectB      ← 應用專案 B (fork)

本地開發環境:
  D:\_Develop\ap.base          ← 基底平台開發
  D:\_Develop\ap.projectA      ← 專案 A 開發
```

### 2.2 分支策略

**基底 repo（ap.base）：**

| 分支 | 用途 |
|------|------|
| `main` | 穩定發布版，應用專案 fork 來源 |
| `develop` | 開發中版本 |
| `release/vX.Y.Z` | 版本發布分支 |

**應用專案 repo（ap.projectA）：**

| 分支 | 用途 |
|------|------|
| `main` | 專案主線 |
| `develop` | 專案開發中 |
| `base-sync` | 專門用於同步基底更新（避免直接在 main 合併） |

---

## 3. Step 1：準備基底 Repository

### 3.1 在 GitHub/GitLab 建立基底 repo

```bash
# 將現有的 ap.base 推送到遠端
cd D:\_Develop\ap.base
git remote add origin https://github.com/your-org/ap.base.git
git push -u origin main
```

### 3.2 建立版本標籤

每次基底發布穩定版本時，打上 tag：

```bash
git tag -a v1.0.0 -m "Base AP v1.0.0 - 首次穩定版"
git push origin v1.0.0
```

### 3.3 確保 main 分支乾淨

`main` 分支只包含基底平台的程式碼，不包含任何專案特定的內容。

---

## 4. Step 2：建立應用專案（Fork）

### 4.1 方式 A：GitHub Fork（推薦）

1. 🖱️ 在 GitHub 上點擊 ap.base repo 的「**Fork**」按鈕
2. 📝 命名為專案名稱（如 `ap.projectA`）
3. 💻 Clone 到本地：

```bash
git clone https://github.com/your-org/ap.projectA.git
cd ap.projectA
```

4. 🔗 設定 upstream 指向基底：

```bash
git remote add upstream https://github.com/your-org/ap.base.git
git remote -v
# origin    https://github.com/your-org/ap.projectA.git (fetch)
# origin    https://github.com/your-org/ap.projectA.git (push)
# upstream  https://github.com/your-org/ap.base.git (fetch)
# upstream  https://github.com/your-org/ap.base.git (push)
```

### 4.2 方式 B：手動複製（無 GitHub 時）

```bash
# 複製 repo
git clone https://github.com/your-org/ap.base.git ap.projectA
cd ap.projectA

# 修改 origin 指向新的 repo
git remote set-url origin https://github.com/your-org/ap.projectA.git

# 設定 upstream 指向基底
git remote add upstream https://github.com/your-org/ap.base.git

# 推送到新 repo
git push -u origin main
```

### 4.3 初始客製化

Fork 完成後，立即做以下初始設定：

```bash
# 1. 修改系統設定（.env）
#    - DATABASE_URL → 專案資料庫
#    - REDIS_HOST → 專案 Redis
#    - SECRET_KEY → 專案密鑰

# 2. 修改 init_db.sql
#    - 系統設定（sys_profiles）的系統標題、版權
#    - 新增應用專案的 system_functions

# 3. 新增專案的 CLAUDE.md
#    - 記錄專案特定的開發指引

# 4. 提交初始客製化
git add .
git commit -m "chore: 初始化專案 ProjectA 客製設定"
```

---

## 5. Step 3：應用專案開發

### 5.1 新增應用功能模組

遵循「[應用系統建置指引](Base_AP_應用系統建置指引.md)」的 10 步驟流程：

```
1. 資料庫設計 → CREATE TABLE (專案業務表)
2. 後端 Model → app/models/xxx.py
3. 後端 Schema → app/schemas/xxx.py
4. 後端 Service → app/services/xxx_service.py
5. 後端 Route → app/routes/xxx.py
6. 註冊路由 → app/main.py
7. 註冊系統功能 → system_functions 資料表
8. 前端 Service → src/services/xxxService.ts
9. 前端頁面 → src/pages/XxxPage.tsx
10. 前端路由 → src/App.tsx
```

### 5.2 專案提交規範

建議在 commit message 中區分基底與應用：

```bash
# 應用專案的功能
git commit -m "feat(app): 新增公告管理模組"
git commit -m "fix(app): 公告列表分頁錯誤"

# 調整基底 UI/設定（這些在同步時可能衝突）
git commit -m "custom(base): 修改登入頁底圖和配色"
git commit -m "custom(base): 調整側邊欄寬度"
```

用 `(app)` 和 `(base)` 前綴可以在同步時快速辨識哪些 commit 可能衝突。

---

## 6. Step 4：同步基底更新到應用專案

### 6.1 標準同步流程

> 💡 **情境**：基底平台修正了一個 JSONB 搜尋的 bug，需要同步到應用專案。

```bash
cd ap.projectA

# 1. 拉取基底最新程式碼（不合併）
git fetch upstream

# 2. 建立同步分支
git checkout -b base-sync/v1.1.0 main

# 3. 合併基底更新
git merge upstream/main

# 4. 解決衝突（如果有）
#    → 衝突通常在：main.py（路由註冊）、App.tsx（前端路由）、init_db.sql（初始資料）
#    → 保留「雙方的新增內容」，不要丟棄任何一方的新增行

# 5. 測試驗證
#    → 啟動前後端，確認基底功能和應用功能都正常

# 6. 合併到 main
git checkout main
git merge base-sync/v1.1.0

# 7. 推送
git push origin main

# 8. 刪除同步分支
git branch -d base-sync/v1.1.0
```

### 6.2 衝突解決指引

| 衝突檔案 | 解決方式 |
|---------|---------|
| `app/main.py` | 保留雙方的 `include_router` 行（基底新路由 + 應用路由都保留） |
| `src/App.tsx` | 保留雙方的 `<Route>` 行 |
| `init_db.sql` | 保留雙方的 `INSERT` 行，注意 ID 不衝突 |
| `.env` | **永遠保留應用專案的版本**（專案特定設定） |
| CSS 檔案 | 如有衝突，比較差異決定保留哪些樣式修改 |
| `CLAUDE.md` | 保留應用專案版本，手動補入基底新增的資訊 |

### 6.3 同步特定版本（cherry-pick）

只想拉特定的 bug fix，不要全部更新：

```bash
# 查看基底最近的 commit
git log upstream/main --oneline -20

# 只挑選特定 commit
git cherry-pick <commit-hash>
```

### 6.4 查看基底有哪些新更新

```bash
# 比較差異
git fetch upstream
git log main..upstream/main --oneline

# 查看具體改了什麼
git diff main..upstream/main --stat
```

---

## 7. 程式碼分層規範

### 7.1 分層架構

為了降低合併衝突，程式碼分為三層：

```
┌─────────────────────────────────┐
│  應用層（Application Layer）     │ ← 應用專案自由修改，不會衝突
│  新增的業務模組                  │
├─────────────────────────────────┤
│  客製層（Customization Layer）   │ ← 可修改，但同步時可能需要手動合併
│  UI 調整、設定檔、初始資料       │
├─────────────────────────────────┤
│  基底層（Base Layer）            │ ← 盡量不改，讓同步順暢
│  核心認證、權限、日誌、多語系    │
└─────────────────────────────────┘
```

### 7.2 各層檔案對照

#### 🟢 應用層 — 自由新增，不衝突

| 後端 | 前端 |
|------|------|
| `app/models/bulletin.py`（新增） | `src/pages/BulletinsPage.tsx`（新增） |
| `app/schemas/bulletin.py`（新增） | `src/services/bulletinService.ts`（新增） |
| `app/routes/bulletin.py`（新增） | `src/types/bulletins.ts`（新增） |
| `app/services/bulletin_service.py`（新增） | |

> ✅ **新增的檔案不會與基底衝突**，這是最安全的開發方式。

#### 🟡 客製層 — 可修改，同步時注意

| 檔案 | 修改類型 | 衝突風險 |
|------|---------|---------|
| `app/main.py` | 新增 `include_router` 行 | 🟡 中（雙方都加行，容易解決） |
| `src/App.tsx` | 新增 `<Route>` 行 | 🟡 中（同上） |
| `init_db.sql` | 新增 `INSERT` 行 | 🟡 中（注意 ID 範圍不重疊） |
| `.env` | 專案特定設定 | 🟢 低（不進版控） |
| `src/styles/*.css` | 調整樣式 | 🟡 中 |
| `src/pages/LoginPage.tsx` | 調整登入頁 | 🔴 高（基底也可能改） |
| `系統設計/*.md` | 專案文件 | 🟢 低 |

#### 🔴 基底層 — 盡量不改

| 檔案 | 說明 |
|------|------|
| `app/core/*` | 認證、權限、Redis、資料庫核心 |
| `app/routes/auth.py` | 登入認證路由 |
| `app/routes/permissions.py` | 權限驗證路由 |
| `app/services/userlog_service.py` | 日誌服務 |
| `app/services/session_service.py` | Session 服務 |
| `src/api/axios.ts` | axios 攔截器 |
| `src/hooks/*` | 共用 Hook |
| `src/utils/*` | 工具函式 |
| `src/contexts/*` | Context Provider |

> ⚠️ 如果確實需要修改基底層，建議**回饋到基底 repo**，而非只在應用專案中改。這樣所有專案都能受益。

### 7.3 system_functions ID 規劃

為避免基底和應用專案的功能 ID 衝突：

| ID 範圍 | 用途 |
|--------|------|
| 1 ~ 99 | 🔒 基底平台保留（系統管理、租戶管理） |
| 100 ~ 199 | 應用專案 A 的功能 |
| 200 ~ 299 | 應用專案 B 的功能 |
| 1000+ | 通用應用功能（可跨專案共用） |

---

## 8. 降低合併衝突的設計原則

### 8.1 路由註冊：使用分區註解

在 `app/main.py` 中用註解分區：

```python
# ============================================
# 基底平台路由（請勿修改此區塊）
# ============================================
app.include_router(auth.router, prefix="/api/auth", tags=["認證"])
app.include_router(system.router, prefix="/api/system", tags=["系統"])
# ... 其他基底路由

# ============================================
# 應用專案路由（在此區塊新增）
# ============================================
from app.routes import bulletin
app.include_router(bulletin.router, prefix="/api/bulletins", tags=["公告管理"])
```

### 8.2 前端路由：使用分區註解

在 `src/App.tsx` 中：

```tsx
{/* ===== 基底平台路由（請勿修改）===== */}
<Route path="sys_profile" element={<SysProfilePage />} />
<Route path="system_functions" element={<SystemFunctionsPage />} />
{/* ... 其他基底路由 */}

{/* ===== 應用專案路由（在此新增）===== */}
<Route path="bulletins" element={<BulletinsPage />} />
```

### 8.3 init_db.sql：使用 ID 分區

```sql
-- ============================================
-- 基底平台初始資料（ID 1~99）
-- ============================================
INSERT INTO system_functions (id, ...) VALUES
(1, 'system_mana', ...),
(2, 'sys_profile', ...);
-- ... 基底功能

-- ============================================
-- 應用專案初始資料（ID 100+）
-- ============================================
INSERT INTO system_functions (id, ...) VALUES
(100, 'app_mana', ...),
(101, 'bulletins', ...);
```

### 8.4 CSS：使用 app-前綴

應用專案新增的樣式使用 `app-` 前綴，避免與基底樣式衝突：

```css
/* 基底樣式 */
.page-container { ... }
.data-table { ... }

/* 應用專案樣式 */
.app-bulletin-card { ... }
.app-report-chart { ... }
```

---

## 9. 多技術棧擴展（Java / .NET）

### 9.1 規劃

```
ap.base             ← Python FastAPI 版（目前）
ap.base-java        ← Java Spring Boot 版（未來）
ap.base-dotnet      ← .NET 版（未來）
```

### 9.2 跨技術棧共用部分

| 部分 | 共用性 | 說明 |
|------|:---:|------|
| 📄 init_db.sql | ✅ 完全共用 | 資料庫結構與初始資料跨技術棧一致 |
| 📂 前端 (React) | ✅ 完全共用 | 前端不依賴後端技術棧 |
| 📄 系統設計文件 | ✅ 完全共用 | 操作手冊、建置指引 |
| 📄 API 規格 | ✅ 介面共用 | 各技術棧實作同樣的 API 端點 |
| 🔧 後端程式碼 | ❌ 各自實作 | Python / Java / .NET 各自維護 |

### 9.3 建議的 Repo 結構

```
ap.base/
├── database/              # ← 共用：資料庫設計
│   └── init_db.sql
├── frontend/              # ← 共用：React 前端
│   └── src/
├── backend-python/        # ← Python 版後端
│   └── app/
├── docs/                  # ← 共用：系統設計文件
│   ├── Base_AP_操作手冊.md
│   └── Base_AP_應用系統建置指引.md
└── CLAUDE.md
```

或者保持獨立 repo，讓各技術棧分開管理：

```
ap.base          → Python 全端 (目前結構)
ap.base-java     → Java 後端 + 共用前端 (submodule)
ap.base-dotnet   → .NET 後端 + 共用前端 (submodule)
```

### 9.4 前端作為 Git Submodule

如果採用多 repo 策略，前端可以用 submodule 共用：

```bash
# 將前端獨立為 repo
# ap.base-frontend (React 前端)

# 各技術棧的後端 repo 中加入 submodule
cd ap.base-java
git submodule add https://github.com/your-org/ap.base-frontend.git frontend
```

---

## 10. 完整操作範例

### 範例：從基底建立「工程管理系統」

```bash
# ===== Step 1: Fork 基底 =====
git clone https://github.com/your-org/ap.base.git ap.engineering
cd ap.engineering
git remote set-url origin https://github.com/your-org/ap.engineering.git
git remote add upstream https://github.com/your-org/ap.base.git
git push -u origin main

# ===== Step 2: 初始客製化 =====
# 修改 .env（資料庫、Redis 等）
# 修改 init_db.sql（系統標題、新增功能）
git add .
git commit -m "chore: 初始化工程管理系統"

# ===== Step 3: 新增應用功能 =====
# 按照建置指引，新增「專案管理」「報告管理」等模組
# ... 正常開發 ...

# ===== Step 4: 半年後，基底修了重要 bug =====
git fetch upstream
git log main..upstream/main --oneline
# abc1234 fix: 修正 JSONB 欄位搜尋錯誤
# def5678 feat: 新增使用者日誌匯出功能

git checkout -b base-sync/v1.2.0 main
git merge upstream/main

# 如有衝突 → 解決衝突 → git add → git commit
# 測試驗證 → 確認基底和應用功能都正常

git checkout main
git merge base-sync/v1.2.0
git push origin main
git branch -d base-sync/v1.2.0
```

### 範例：將應用專案的 bug fix 回饋到基底

```bash
# 在應用專案中發現基底的 bug 並修正
cd ap.engineering
git commit -m "fix(base): UserUpdate schema 缺少 account 欄位"

# 回到基底 repo，cherry-pick 這個修正
cd ap.base
git remote add projectA https://github.com/your-org/ap.engineering.git
git fetch projectA
git cherry-pick <commit-hash>
git push origin main

# 通知其他應用專案同步
```

---

## 快速參考卡

```
┌─────────────────────────────────────────────────────┐
│  Base AP 專案複用 — 快速參考                          │
├─────────────────────────────────────────────────────┤
│                                                     │
│  建立新專案:                                         │
│    git clone ap.base ap.newProject                  │
│    git remote set-url origin <new-repo-url>         │
│    git remote add upstream <base-repo-url>          │
│                                                     │
│  同步基底更新:                                       │
│    git fetch upstream                               │
│    git checkout -b base-sync main                   │
│    git merge upstream/main                          │
│    (解決衝突 → 測試 → 合併回 main)                   │
│                                                     │
│  ID 規劃:                                           │
│    1~99    基底保留                                  │
│    100+    應用專案功能                               │
│                                                     │
│  分層原則:                                           │
│    🟢 新增檔案 → 不衝突                              │
│    🟡 修改共用檔案 → 用分區註解                       │
│    🔴 修改核心 → 回饋到基底 repo                     │
│                                                     │
└─────────────────────────────────────────────────────┘
```
