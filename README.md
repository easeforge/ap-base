# Base AP - 後臺管理基底平台

後臺管理與租戶組織的基底系統平台，提供通用的系統管理功能模組，可作為各類應用系統的基底架構。

## 功能模組

### 系統管理
- 系統設定 (sys_profile)
- 系統功能管理 (system_functions)
- 系統代碼管理 (system_codes)
- 系統通知管理 (system_notifications)
- 使用者日誌 (user_logs)

### 組織與使用者
- 組織管理 (organizations)
- 使用者管理 (users)
- 使用者角色設定 (user_roles)
- 角色權限設定 (role_rights)

### 租戶管理
- 租戶設定 (tenant_profile)
- 租戶使用者 (tenant_users)

### 認證與安全
- 登入/登出 (JWT + Redis Session)
- CAPTCHA 驗證碼
- 密碼變更 / 個人資料管理
- RBAC 角色權限控制

## 技術架構

- **Backend**: Python FastAPI + SQLAlchemy + PostgreSQL + Redis
- **Frontend**: React + TypeScript + i18n (中/英)
- **Database**: PostgreSQL (baseAP)
- **Cache/Session**: Redis

## 快速開始

### 資料庫初始化

```sql
CREATE DATABASE "baseAP" OWNER admin;
\c baseAP
\i Develop/backend/init_db.sql
```

### 啟動後端

```bash
cd Develop/backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 10181 --reload
```

### 啟動前端

```bash
cd Develop/frontend
npm install
npm start
```

### 預設管理員帳號

- 帳號: `admin`
- 密碼: `admin123`

## 目錄結構

```
ap.base/
  Develop/
    backend/                # FastAPI 後端
      app/
        core/               # 核心模組 (config, database, security, redis)
        models/             # SQLAlchemy 資料模型
        routes/             # API 路由
        schemas/            # Pydantic 驗證模型
        services/           # 業務邏輯服務
      init_db.sql           # 資料庫初始化腳本
      requirements.txt
    frontend/               # React 前端
      src/
        api/                # API 呼叫 (axios, authService)
        components/         # 共用元件 (MainLayout, Sidebar, etc.)
        contexts/           # React Context (Auth, System)
        hooks/              # Custom Hooks
        pages/              # 頁面元件
        services/           # 業務服務
        styles/             # CSS 樣式
        locales/            # 多語系翻譯 (zh-TW, en)
        types/              # TypeScript 型別定義
    docker-compose.yml
```
