# 建立新應用專案 — 速查卡

> 從 Base AP 基底建立新的應用專案，全程約 5 分鐘。

---

## Step 1：GitLab 建立空 repo

1. 開啟 https://git.lab.taipei
2. 左上角 **「+」** → **New project** → **Create blank project**
3. 填入專案名稱（如 `P-Inventory`），Visibility 選 **Private**
4. **取消勾選** "Initialize repository with a README"
5. 點 **Create project**，記下 HTTPS clone URL

---

## Step 2：本地建立專案（複製貼上即可）

```bash
# ① 改這兩個變數就好
PROJECT_NAME="P-Inventory"
PROJECT_URL="https://git.lab.taipei/porsche/P-Inventory.git"

# ② 以下不用改，直接執行
cd D:\_Develop
git clone https://git.lab.taipei/porsche/ap-base.git $PROJECT_NAME
cd $PROJECT_NAME
git remote set-url origin $PROJECT_URL
git remote add upstream https://git.lab.taipei/porsche/ap-base.git
git fetch upstream
```

驗證：

```bash
git remote -v
# origin    → 你的專案 repo
# upstream  → ap-base 基底 repo
```

---

## Step 3：初始客製化

### 3a. 系統標題（init_db.sql）

搜尋 `後臺管理基底平台` 改成你的專案名稱：

```
檔案：Develop/backend/init_db.sql
搜尋：後臺管理基底平台
改為：你的系統名稱（如「庫存管理系統」）

搜尋：Base AP Management System
改為：英文系統名稱（如「P-Inventory System」）
```

### 3b. CLAUDE.md

把開頭改成專案說明：

```markdown
# P-Inventory - 庫存管理系統

## 專案概述
基於 Base AP 基底平台開發的庫存管理應用系統。

## 基底平台
- 來源: https://git.lab.taipei/porsche/ap-base.git (upstream)
- 基底版本: v1.0.0
- 同步方式: git fetch upstream && git merge upstream/main
```

### 3c. 提交並推送

```bash
git add CLAUDE.md Develop/backend/init_db.sql
git commit -m "chore: 初始化 {專案名稱} 客製設定"
git push -u origin main
```

---

## Step 4：開始開發

在程式碼的「應用專案路由」區塊新增你的功能：

- **後端**：`Develop/backend/app/main.py` → 搜尋「應用專案路由」
- **前端**：`Develop/frontend/src/App.tsx` → 搜尋「應用專案路由」
- **功能 ID**：從 100 開始（基底保留 1~99）

詳細開發流程見 `系統設計/Base_AP_應用系統建置指引.md`。

---

## 日常操作

### 同步基底更新

```bash
git fetch upstream
git log main..upstream/main --oneline        # 看有什麼新更新

# 有更新才需要執行以下
git checkout -b base-sync main
git merge upstream/main                      # 合併，解決衝突
# 測試OK後
git checkout main && git merge base-sync
git push origin main
git branch -d base-sync
```

### 查看基底版本

```bash
git tag -l                                   # 列出基底版本
git log upstream/main --oneline -5           # 基底最近更新
```

---

## 專案目錄結構

```
D:\_Develop\
├── ap.base\          ← 基底平台（不要在這裡開發應用功能）
├── P-Inventory\      ← 應用專案 A
├── P-NextProject\    ← 應用專案 B
└── ...
```
