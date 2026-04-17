# Base AP 應用系統建置指引

**版本：** v2.2.0
**更新日期：** 2026-04-13

本文件提供開發者在 Base AP 基底平台上建置應用系統服務的完整指引，涵蓋後端 API、前端頁面、資料庫、權限與日誌整合的標準開發流程。

---

## 目錄

1. [架構總覽](#1-架構總覽)
   - [1.4 基底平台與應用專案分區原則](#14-基底平台與應用專案分區原則)
2. [開發環境準備](#2-開發環境準備)
3. [建置流程概覽](#3-建置流程概覽)
4. [Step 1：資料庫設計](#4-step-1資料庫設計)
5. [Step 2：後端 Model](#5-step-2後端-model)
6. [Step 3：後端 Schema](#6-step-3後端-schema)
7. [Step 4：後端 Service（選用）](#7-step-4後端-service選用)
8. [Step 5：後端 Route](#8-step-5後端-route)
9. [Step 6：註冊路由](#9-step-6註冊路由)
10. [Step 7：註冊系統功能](#10-step-7註冊系統功能)
11. [Step 8：前端 Service](#11-step-8前端-service)
12. [Step 9：前端頁面](#12-step-9前端頁面)
13. [Step 10：前端路由註冊](#13-step-10前端路由註冊)
14. [命名規則](#14-命名規則)
15. [權限系統整合](#15-權限系統整合)
16. [Transaction Token 機制](#16-transaction-token-機制)
17. [Session 驗證機制](#17-session-驗證機制)
18. [操作日誌整合](#18-操作日誌整合)
19. [多語系整合](#19-多語系整合)
20. [I18N 翻譯檔案規範](#20-i18n-翻譯檔案規範)
21. [系統訊息代碼整合](#21-系統訊息代碼整合)
22. [完整範例：公告管理模組](#22-完整範例公告管理模組)
23. [進階檢核清單](#23-進階檢核清單)
24. [常見問題 FAQ](#24-常見問題-faq)
25. [附錄 A：實戰參考 — system_functions 系統功能管理](#附錄-a實戰參考--system_functions-系統功能管理)

---

## 1. 架構總覽

### 1.1 目錄結構

```
Develop/
├── backend/
│   ├── app/
│   │   ├── core/           # 核心元件（資料庫、認證、權限、設定）
│   │   ├── models/         # SQLAlchemy ORM 模型
│   │   ├── schemas/        # Pydantic 請求/回應驗證
│   │   ├── routes/         # FastAPI 路由（API 端點）
│   │   ├── services/       # 業務邏輯層（選用）
│   │   └── main.py         # 應用程式進入點
│   ├── .env                # 環境設定
│   └── init_db.sql         # 資料庫初始化腳本
│
└── frontend/
    └── src/
        ├── api/            # axios 設定與系統 API
        ├── components/     # 共用元件
        ├── contexts/       # React Context（全域狀態）
        ├── hooks/          # 自訂 Hooks
        ├── pages/          # 頁面元件
        ├── services/       # API 服務層
        ├── styles/         # CSS 樣式
        ├── types/          # TypeScript 型別定義
        ├── utils/          # 工具函式
        ├── App.tsx         # 路由定義
        └── i18n.ts         # 國際化設定
```

### 1.2 請求流程

```
瀏覽器 → React Page → Service (axios) → FastAPI Route → Service → Model → PostgreSQL
                                             ↓
                                     Permission Check (Redis + DB)
                                             ↓
                                     User Log (自動記錄)
```

### 1.3 核心元件說明

| 元件       | 檔案                     | 說明                                  |
| ---------- | ------------------------ | ------------------------------------- |
| 資料庫連線 | `core/database.py`     | SQLAlchemy engine、Session 管理       |
| 認證       | `core/deps.py`         | JWT Bearer Token 驗證、取得當前使用者 |
| 權限       | `core/permissions.py`  | 二階段驗證（Redis 快取 + DB 查詢）    |
| 設定       | `core/config.py`       | 環境變數管理                          |
| Redis      | `core/redis_client.py` | Session 快取、權限快取                |

### 1.4 基底平台與應用專案分區原則

Base AP 採用**同目錄共存 + 命名規則分區**的策略，基底平台與應用專案的程式碼放在同一個目錄結構中，透過以下機制區分歸屬。

#### 分區總覽

| 區分機制 | 基底平台 (Base AP) | 應用專案 |
|---------|-------------------|---------|
| **func_code** | 無前綴（如 `users`、`system_codes`） | `ap_` 前綴（如 `ap_inv_items`） |
| **system_functions ID** | 1 ~ 99 | 100+ |
| **func_order 節點** | 10, 20（系統管理、租戶管理） | 30, 40, 50...（應用功能群組） |
| **func_order 功能** | 10xx, 20xx | 30xx, 40xx, 50xx... |
| **路由註冊** | `main.py` / `App.tsx` 的「基底平台路由」區塊 | 「應用專案路由」區塊 |

#### func_code 命名規則

```
基底平台：{功能名稱}
  例：users, system_codes, role_rights, organizations

應用專案：ap_{模組縮寫}_{功能名稱}
  例：ap_inv_items, ap_inv_stock, ap_inv_warehouse
```

- `ap_` 前綴代表 Application Project，一眼區分歸屬
- `{模組縮寫}` 建議 2~4 個字母，同模組統一（如庫存模組用 `inv`）
- `module_code` 與 `func_code` 保持一致

#### 檔案命名對照

| func_code | 後端 Model | 後端 Route | 前端 Page | 前端 Service |
|-----------|-----------|-----------|----------|-------------|
| `ap_inv_items` | `apinvitem.py` | `apinvitem.py` | `ApInvItemsPage.tsx` | `apInvItemsService.ts` |
| `ap_inv_stock` | `apinvstock.py` | `apinvstock.py` | `ApInvStockPage.tsx` | `apInvStockService.ts` |

> 後端檔案依 14.3 規則：去除底線 + 全小寫。前端檔案依 14.4 規則：camelCase / PascalCase。

#### 資料庫分區

```sql
-- 基底平台資料表（init_db.sql 提供，不修改）
-- organizations, users, user_roles, system_functions, ...

-- 應用專案資料表（獨立 migration 或 init 腳本）
CREATE TABLE ap_inv_items ( ... );
CREATE TABLE ap_inv_stock ( ... );
```

- 基底資料表：無前綴，由 upstream init_db.sql 管理
- 應用資料表：建議加 `ap_` 或模組前綴，避免與基底未來新增表衝突

#### system_functions 註冊範例

```sql
INSERT INTO system_functions
  (id, func_code, upper_func_id, func_name, func_type, func_order, func_icon, module_code, module_item, description, is_mana, is_active, edit_by)
VALUES
  -- 應用專案節點（id 100+, func_order 30）
  (100, 'ap_inventory_mana', 0,
   '{"zh-TW":"庫存管理","en":"Inventory Management"}',
   1, 30, '📦', NULL, '[]', '庫存管理節點', FALSE, TRUE, 1),
  -- 應用專案功能（id 101+, func_order 30xx）
  (101, 'ap_inv_items', 100,
   '{"zh-TW":"品項管理","en":"Inventory Items"}',
   2, 3010, '🏷️', 'ap_inv_items',
   '["Create","Read","Update","Delete","Print","File"]',
   '品項管理功能', FALSE, TRUE, 1),
  (102, 'ap_inv_stock', 100,
   '{"zh-TW":"庫存異動","en":"Stock Movement"}',
   2, 3020, '🏷️', 'ap_inv_stock',
   '["Create","Read","Update","Delete","Print","File"]',
   '庫存異動功能', FALSE, TRUE, 1);
```

#### 路由註冊分區

**後端 `main.py`**：
```python
# ============================================
# 基底平台路由（Base AP — 請勿修改此區塊）
# ============================================
app.include_router(user.router, prefix="/api/users", tags=["使用者管理"])
# ...（基底路由）

# ============================================
# 應用專案路由（在此區塊新增應用功能路由）
# ============================================
from app.routes import apinvitem, apinvstock
app.include_router(apinvitem.router, prefix="/api/ap_inv_items", tags=["品項管理"])
app.include_router(apinvstock.router, prefix="/api/ap_inv_stock", tags=["庫存異動"])
```

**前端 `App.tsx`**：
```tsx
{/* ===== 基底平台路由（Base AP — 請勿修改此區塊）===== */}
<Route path="users" element={<UsersPage />} />
{/* ...（基底路由） */}

{/* ===== 應用專案路由（在此區塊新增應用功能路由）===== */}
<Route path="ap_inv_items" element={<ApInvItemsPage />} />
<Route path="ap_inv_stock" element={<ApInvStockPage />} />
```

#### upstream 同步安全原則

| 操作 | 說明 |
|------|------|
| `git merge upstream/main` | 基底平台更新。只要不動基底區塊的程式碼，合併不會衝突 |
| 修改基底檔案 | 應提交到 upstream，再 merge 回應用專案 |
| 衝突檔案 | 通常只有 `main.py`、`App.tsx`、`init_db.sql` 三個註冊入口 |
| 應用專案檔案 | `ap_` 開頭的檔案永遠不會與 upstream 衝突 |

---

## 2. 開發環境準備

### 2.1 後端

```bash
cd Develop/backend
# 建立虛擬環境
python -m venv venv
# 啟動虛擬環境
venv/Scripts/activate        # Windows
source venv/bin/activate      # Linux/Mac
# 安裝套件
pip install -r requirements.txt
# 啟動開發伺服器
python -m uvicorn app.main:app --host 0.0.0.0 --port 10181 --reload
```

### 2.2 前端

```bash
cd Develop/frontend
npm install
npm start    # 預設 port 10180
```

### 2.3 環境設定 (.env)

```env
ENVIRONMENT=development
DATABASE_URL=postgresql://user:password@localhost:5432/baseAP
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=1
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
ALLOWED_ORIGINS=["http://localhost:10180"]
```

---

## 3. 建置流程概覽

新增一個應用功能模組的標準步驟：

```
1. 資料庫設計 → CREATE TABLE
2. 後端 Model → app/models/xxx.py
3. 後端 Schema → app/schemas/xxx.py
4. 後端 Service → app/services/xxx_service.py（選用）
5. 後端 Route → app/routes/xxx.py
6. 註冊路由 → app/main.py
7. 註冊系統功能 → system_functions 資料表
8. 前端 Service → src/services/xxxService.ts
9. 前端頁面 → src/pages/XxxPage.tsx
10. 前端路由 → src/App.tsx
```

> 以下以建立一個「公告管理 (bulletins)」模組為範例說明。

---

## 4. Step 1：資料庫設計

### 4.1 建立資料表

```sql
CREATE TABLE IF NOT EXISTS bulletins (
    id SERIAL PRIMARY KEY,
    title JSONB NOT NULL DEFAULT '{}',        -- 多語系標題
    content TEXT NOT NULL DEFAULT '',          -- 內容
    category VARCHAR(50),                      -- 分類
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    edit_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE INDEX idx_bulletins_active ON bulletins(is_active);

COMMENT ON TABLE bulletins IS '公告管理';
COMMENT ON COLUMN bulletins.title IS '公告標題（JSONB 多語系）';
```

### 4.2 欄位設計規範

| 規範       | 說明                                                         |
| ---------- | ------------------------------------------------------------ |
| 主鍵       | 使用 `SERIAL` 或 `INTEGER` 自增                          |
| 多語系欄位 | 使用 `JSONB`，儲存格式 `{"zh-TW":"中文","en":"English"}` |
| 系統欄位   | 必須包含 `edit_by`、`created_at`、`updated_at`         |
| 外鍵       | 使用 `REFERENCES` 建立關聯                                 |
| 索引       | 常用查詢欄位建立索引                                         |
| 布林欄位   | 使用 `is_` 前綴（如 `is_active`）                        |

---

## 5. Step 2：後端 Model

**檔案：** `app/models/bulletin.py`

```python
"""
Bulletin Model
公告管理
"""

from sqlalchemy import Column, Integer, String, Text, Boolean, TIMESTAMP, ForeignKey, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Bulletin(Base):
    """公告管理"""

    __tablename__ = "bulletins"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(JSONB, nullable=False, default=dict, comment="公告標題（多語系）")
    content = Column(Text, nullable=False, default='')
    category = Column(String(50), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)

    # 系統欄位
    edit_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.current_timestamp())
    updated_at = Column(TIMESTAMP)

    # 索引
    __table_args__ = (
        Index("idx_bulletins_active", "is_active"),
    )

    # 關聯
    editor = relationship("User", foreign_keys=[edit_by])
```

### Model 設計規範

- 繼承 `Base`（來自 `app.core.database`）
- JSONB 多語系欄位設定 `default=dict`
- `created_at` 使用 `server_default=func.current_timestamp()`
- `updated_at` 不設預設值，由程式在更新時設定
- `edit_by` 外鍵關聯 `users.id`

---

## 6. Step 3：後端 Schema

**檔案：** `app/schemas/bulletin.py`

```python
"""
Bulletin Schemas
公告管理 API Schema
"""

from typing import Optional, Dict
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class BulletinResponse(BaseModel):
    """公告回應"""
    id: int
    title: Dict[str, str] = Field(default_factory=dict, description="公告標題（多語系）")
    content: str = ''
    category: Optional[str] = None
    is_active: bool = True
    edit_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class BulletinCreate(BaseModel):
    """建立公告"""
    title: Dict[str, str] = Field(default_factory=dict, description="公告標題（多語系）")
    content: str = ''
    category: Optional[str] = None
    is_active: bool = True


class BulletinUpdate(BaseModel):
    """更新公告"""
    title: Optional[Dict[str, str]] = Field(None, description="公告標題（多語系）")
    content: Optional[str] = None
    category: Optional[str] = None
    is_active: Optional[bool] = None
```

### Schema 設計規範

| Schema       | 用途     | 重點                                                                            |
| ------------ | -------- | ------------------------------------------------------------------------------- |
| `Response` | API 回應 | 包含 `id`、系統欄位，設定 `model_config = ConfigDict(from_attributes=True)` |
| `Create`   | 新增請求 | 不含 `id`、`edit_by`、時間戳（由後端自動填入）                              |
| `Update`   | 更新請求 | 所有欄位皆 `Optional`，支援部分更新                                           |

---

## 7. Step 4：後端 Service（選用）

**檔案：** `app/services/bulletin_service.py`

當業務邏輯較複雜時，建議將邏輯抽離至 Service 層：

```python
"""
Bulletin Service
公告管理業務邏輯
"""

import logging
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy.sql import func

from app.models.bulletin import Bulletin
from app.schemas.bulletin import BulletinCreate, BulletinUpdate

logger = logging.getLogger(__name__)


class BulletinService:

    @staticmethod
    def get_all(db: Session, is_active: Optional[bool] = None) -> List[Bulletin]:
        query = db.query(Bulletin)
        if is_active is not None:
            query = query.filter(Bulletin.is_active == is_active)
        return query.order_by(Bulletin.id.desc()).all()

    @staticmethod
    def get_by_id(db: Session, bulletin_id: int) -> Optional[Bulletin]:
        return db.query(Bulletin).filter(Bulletin.id == bulletin_id).first()

    @staticmethod
    def create(db: Session, data: BulletinCreate, user_id: int) -> Bulletin:
        item = Bulletin(**data.model_dump(), edit_by=user_id)
        db.add(item)
        db.commit()
        db.refresh(item)
        return item

    @staticmethod
    def update(db: Session, bulletin_id: int, data: BulletinUpdate, user_id: int) -> Optional[Bulletin]:
        item = db.query(Bulletin).filter(Bulletin.id == bulletin_id).first()
        if not item:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(item, field, value)

        item.edit_by = user_id
        item.updated_at = func.now()
        db.commit()
        db.refresh(item)
        return item

    @staticmethod
    def delete(db: Session, bulletin_id: int) -> bool:
        item = db.query(Bulletin).filter(Bulletin.id == bulletin_id).first()
        if not item:
            return False
        db.delete(item)
        db.commit()
        return True
```

> **何時需要 Service 層？** 當路由中的邏輯超過 10 行、需要跨表操作、或邏輯可能被多處呼叫時。簡單 CRUD 可直接寫在 Route 中。

---

## 8. Step 5：後端 Route

**檔案：** `app/routes/bulletin.py`

```python
"""
Bulletin Routes
公告管理路由
"""

import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.sql import func

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.bulletin import Bulletin
from app.models.user import User
from app.schemas.bulletin import BulletinResponse, BulletinCreate, BulletinUpdate
from app.services.userlog_service import UserLogService

logger = logging.getLogger(__name__)
router = APIRouter()


def bulletin_to_dict(item: Bulletin) -> dict:
    """將 Bulletin 物件轉換為字典（供日誌使用）"""
    return {
        "id": item.id,
        "title": item.title,
        "content": item.content,
        "category": item.category,
        "is_active": item.is_active,
        "edit_by": item.edit_by,
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
    }


@router.get("/", response_model=List[BulletinResponse], summary="取得公告列表")
async def get_bulletins(
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """取得公告列表，需要認證"""
    query = db.query(Bulletin)

    if is_active is not None:
        query = query.filter(Bulletin.is_active == is_active)
    if search:
        query = query.filter(
            Bulletin.title.cast(String).ilike(f"%{search}%")
        )

    return query.order_by(Bulletin.id.desc()).all()


@router.get("/{bulletin_id}", response_model=BulletinResponse, summary="取得單筆公告")
async def get_bulletin(
    bulletin_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(Bulletin).filter(Bulletin.id == bulletin_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="公告不存在")
    return item


@router.post("/", response_model=BulletinResponse, status_code=status.HTTP_201_CREATED, summary="新增公告")
async def create_bulletin(
    data: BulletinCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """需要 bulletins 功能的 create 權限"""
    item = Bulletin(**data.model_dump(), edit_by=current_user.id)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/{bulletin_id}", response_model=BulletinResponse, summary="更新公告")
async def update_bulletin(
    bulletin_id: int,
    data: BulletinUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """需要 bulletins 功能的 update 權限"""
    item = db.query(Bulletin).filter(Bulletin.id == bulletin_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="公告不存在")

    # 保存原始資料（供日誌比對）
    original_data = bulletin_to_dict(item)

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)

    item.edit_by = current_user.id
    item.updated_at = func.now()
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{bulletin_id}", status_code=status.HTTP_204_NO_CONTENT, summary="刪除公告")
async def delete_bulletin(
    bulletin_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """需要 bulletins 功能的 delete 權限"""
    item = db.query(Bulletin).filter(Bulletin.id == bulletin_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="公告不存在")

    db.delete(item)
    db.commit()
    return None
```

### Route 設計規範

- 使用 `Depends(get_db)` 取得資料庫 Session
- 使用 `Depends(get_current_user)` 驗證登入（自動驗證 JWT Token）
- 定義 `xxx_to_dict()` 函式供日誌記錄使用
- RESTful 風格：`GET /` 列表、`GET /{id}` 單筆、`POST /` 新增、`PUT /{id}` 更新、`DELETE /{id}` 刪除
- 更新時使用 `model_dump(exclude_unset=True)` 支援部分更新
- 更新時手動設定 `edit_by` 和 `updated_at`

---

## 9. Step 6：註冊路由

**檔案：** `app/main.py`

```python
# 1. 在 import 區段加入
from app.routes import bulletin

# 2. 在路由註冊區段加入
app.include_router(bulletin.router, prefix="/api/bulletins", tags=["公告管理"])
```

API 路徑慣例：`/api/{資料表名稱}`（複數形式）。

---

## 10. Step 7：註冊系統功能

在 `system_functions` 資料表新增功能記錄，系統才能顯示選單並控制權限。

### 10.1 新增節點（選單分類）

若應用系統需要獨立的選單分類：

```sql
INSERT INTO system_functions
  (id, func_code, upper_func_id, func_name, func_type, func_order, func_icon, module_code, module_item, description, is_mana, is_active, edit_by)
VALUES
  (100, 'app_mana', 0,
   '{"zh-TW":"應用管理","en":"Application"}',
   1, 30, '📋', NULL, '[]', '應用系統管理節點', FALSE, TRUE, 1);
```

### 10.2 新增功能頁面

```sql
INSERT INTO system_functions
  (id, func_code, upper_func_id, func_name, func_type, func_order, func_icon, module_code, module_item, description, is_mana, is_active, edit_by)
VALUES
  (101, 'bulletins', 100,
   '{"zh-TW":"公告管理","en":"Bulletins"}',
   2, 3010, '📋', 'bulletins',
   '["Create","Read","Update","Delete"]',
   '公告管理功能', FALSE, TRUE, 1);
```

### 10.3 欄位說明

| 欄位              | 說明                                                                                    | 範例                                        |
| ----------------- | --------------------------------------------------------------------------------------- | ------------------------------------------- |
| `func_code`     | 唯一識別碼，與前後端權限檢查對應                                                        | `'bulletins'`                             |
| `upper_func_id` | 上層節點 ID（`0` = 根層級）                                                           | `100`                                     |
| `func_name`     | JSONB 多語系名稱                                                                        | `'{"zh-TW":"公告管理","en":"Bulletins"}'` |
| `func_type`     | `1` = 節點（資料夾）、`2` = 功能（頁面）                                            | `2`                                       |
| `func_order`    | 排序值。`< 10` 不在側邊欄顯示。節點建議 `10, 20, 30...`，功能建議 `X010, X020...` | `3010`                                    |
| `func_icon`     | Emoji 或圖示名稱                                                                        | `'📋'`                                    |
| `module_code`   | 前端路由路徑，須與 `App.tsx` 中的 `path` 一致                                       | `'bulletins'`                             |
| `module_item`   | 支援的操作項目 JSON 陣列                                                                | `'["Create","Read","Update","Delete"]'`   |
| `is_mana`       | 是否為系統管理功能（僅系統管理角色可見）                                                | `FALSE`                                   |

### 10.4 指派角色權限

功能註冊後，需在「角色權限設定」頁面為對應角色勾選權限，使用者才能存取。

---

## 11. Step 8：前端 Service

**檔案：** `src/services/bulletinService.ts`

```typescript
/**
 * 公告管理服務
 */

import axios from '../api/axios';
import { I18nField } from '../types';

const BASE_URL = '/api/bulletins';

// 回應介面
export interface Bulletin {
  id: number;
  title: I18nField;
  content: string;
  category: string | null;
  is_active: boolean;
  edit_by: number;
  created_at: string;
  updated_at?: string;
}

// 新增介面
export interface BulletinCreate {
  title: I18nField;
  content: string;
  category?: string;
  is_active?: boolean;
}

// 更新介面
export interface BulletinUpdate {
  title?: I18nField;
  content?: string;
  category?: string;
  is_active?: boolean;
}

// CRUD API
export const getBulletins = async (): Promise<Bulletin[]> => {
  const response = await axios.get<Bulletin[]>(`${BASE_URL}/`);
  return response.data;
};

export const getBulletin = async (id: number): Promise<Bulletin> => {
  const response = await axios.get<Bulletin>(`${BASE_URL}/${id}`);
  return response.data;
};

export const createBulletin = async (data: BulletinCreate): Promise<Bulletin> => {
  const response = await axios.post<Bulletin>(`${BASE_URL}/`, data);
  return response.data;
};

export const updateBulletin = async (id: number, data: BulletinUpdate): Promise<Bulletin> => {
  const response = await axios.put<Bulletin>(`${BASE_URL}/${id}`, data);
  return response.data;
};

export const deleteBulletin = async (id: number): Promise<void> => {
  await axios.delete(`${BASE_URL}/${id}`);
};
```

### Service 設計規範

- axios 攔截器自動附加 `Authorization: Bearer <token>` 和 `X-Txn-Token` Header
- 多語系欄位使用 `I18nField`（即 `Record<string, string>`）型別
- URL 結尾加 `/`（FastAPI 預設需要）
- 函式命名：`getXxx`、`createXxx`、`updateXxx`、`deleteXxx`

---

## 12. Step 9：前端頁面

**檔案：** `src/pages/BulletinsPage.tsx`

以下為標準 CRUD 頁面的骨架結構：

```typescript
/**
 * 公告管理頁面
 */

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bulletin, BulletinCreate, BulletinUpdate,
  getBulletins, createBulletin, updateBulletin, deleteBulletin
} from '../services/bulletinService';
import { usePermission } from '../hooks/usePermission';
import { useSystem } from '../contexts/SystemContext';
import FunctionPageHeader from '../components/FunctionPageHeader';
import { logView, logCreate, logRead, logUpdate, logDelete } from '../utils/userLogHelper';
import { getI18nValue } from '../utils/i18nHelper';
import { I18nField } from '../types';
import '../styles/DataTable.css';

const FUNC_CODE = 'bulletins';

const BulletinsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { hasPermission, loading: permissionLoading } = usePermission();
  const { availableLanguages } = useSystem();
  const hasInitialized = useRef(false);

  // ===== 狀態管理 =====
  const [items, setItems] = useState<Bulletin[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Bulletin | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [formData, setFormData] = useState<BulletinCreate>({
    title: {} as I18nField,
    content: '',
    is_active: true,
  });

  // 語系代碼列表
  const enabledLangs = availableLanguages.map(l => l.code);

  // ===== 資料載入 =====
  const loadItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getBulletins();
      setItems(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  // ===== 初始化（含權限檢查）=====
  useEffect(() => {
    if (!permissionLoading && hasPermission(FUNC_CODE, 'read') && !hasInitialized.current) {
      hasInitialized.current = true;
      const initPage = async () => {
        try {
          await loadItems();
          await logView(FUNC_CODE, {}, null);
        } catch (err: any) {
          await logView(FUNC_CODE, {}, err.message);
        }
      };
      initPage();
    }
  }, [permissionLoading]);

  // ===== Modal 操作 =====
  const openCreate = () => {
    setEditingItem(null);
    setIsViewMode(false);
    setFormData({ title: {} as I18nField, content: '', is_active: true });
    setShowModal(true);
  };

  const openEdit = (item: Bulletin) => {
    setEditingItem(item);
    setIsViewMode(false);
    setFormData({
      title: item.title || {},
      content: item.content,
      category: item.category || undefined,
      is_active: item.is_active,
    });
    setShowModal(true);
  };

  const openView = async (item: Bulletin) => {
    setEditingItem(item);
    setIsViewMode(true);
    setFormData({
      title: item.title || {},
      content: item.content,
      category: item.category || undefined,
      is_active: item.is_active,
    });
    setShowModal(true);
    await logRead(FUNC_CODE, item as any);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingItem(null);
  };

  // ===== 表單送出 =====
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
        const updated = await updateBulletin(editingItem.id, formData);
        await logUpdate(FUNC_CODE, editingItem as any, updated as any);
        alert(t('message.saveSuccess'));
      } else {
        const created = await createBulletin(formData);
        await logCreate(FUNC_CODE, created as any);
        alert(t('message.createSuccess'));
      }
      closeModal();
      loadItems();
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || t('message.saveFailed');
      try {
        if (editingItem) {
          await logUpdate(FUNC_CODE, editingItem as any, formData, errorMsg);
        } else {
          await logCreate(FUNC_CODE, formData, errorMsg);
        }
      } catch (logErr) {
        console.error('Log error:', logErr);
      }
      alert(errorMsg);
    }
  };

  // ===== 刪除 =====
  const handleDelete = async (item: Bulletin) => {
    if (!window.confirm(t('common.confirmDelete'))) return;
    try {
      await deleteBulletin(item.id);
      await logDelete(FUNC_CODE, item as any);
      alert(t('message.deleteSuccess'));
      loadItems();
    } catch (err: any) {
      alert(err.response?.data?.detail || t('message.deleteFailed'));
    }
  };

  // ===== 多語系欄位更新 =====
  const updateI18nField = (langCode: string, value: string) => {
    setFormData({
      ...formData,
      title: { ...formData.title, [langCode]: value },
    });
  };

  // ===== 權限與載入狀態 =====
  if (permissionLoading || loading) {
    return <div className="page-container"><div className="loading">{t('common.loading')}</div></div>;
  }
  if (!hasPermission(FUNC_CODE, 'read')) {
    return <div className="page-container"><div className="error-message">{t('common.noPermission')}</div></div>;
  }

  const canCreate = hasPermission(FUNC_CODE, 'create');
  const canUpdate = hasPermission(FUNC_CODE, 'update');
  const canDelete = hasPermission(FUNC_CODE, 'delete');

  // ===== 渲染 =====
  return (
    <div className="page-container">
      <div className="page-header">
        <FunctionPageHeader funcCode={FUNC_CODE} />
        {canCreate && (
          <button className="btn-primary" onClick={openCreate}>{t('common.create')}</button>
        )}
      </div>

      {/* 資料列表 */}
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>{t('bulletin.title', '標題')}</th>
              <th>{t('common.status')}</th>
              <th>{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{getI18nValue(item.title, i18n.language)}</td>
                <td>
                  <span className={`status-badge ${item.is_active ? 'active' : 'inactive'}`}>
                    {item.is_active ? t('common.active') : t('common.inactive')}
                  </span>
                </td>
                <td className="actions">
                  <button className="btn-secondary" onClick={() => openView(item)}>{t('common.view')}</button>
                  {canUpdate && <button className="btn-edit" onClick={() => openEdit(item)}>{t('common.edit')}</button>}
                  {canDelete && <button className="btn-delete" onClick={() => handleDelete(item)}>{t('common.delete')}</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal 表單 */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <form onSubmit={handleSubmit}>
              <div className="modal-header">
                <h2>{editingItem ? (isViewMode ? t('common.view') : t('common.edit')) : t('common.create')}</h2>
                <button type="button" className="modal-close" onClick={closeModal}>×</button>
              </div>

              <div className="modal-body">
                <div className="form-grid">
                  {/* 多語系標題 */}
                  <div className="form-group full-width">
                    <label>{t('bulletin.title', '標題')}</label>
                    {enabledLangs.map(lang => (
                      <div key={lang} style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                        <span style={{ minWidth: '60px', fontSize: '13px', lineHeight: '38px' }}>{lang}</span>
                        <input
                          value={formData.title[lang] || ''}
                          onChange={e => updateI18nField(lang, e.target.value)}
                          disabled={isViewMode}
                          style={{ flex: 1 }}
                        />
                      </div>
                    ))}
                  </div>

                  {/* 內容 */}
                  <div className="form-group full-width">
                    <label>{t('bulletin.content', '內容')}</label>
                    <textarea
                      rows={5}
                      value={formData.content}
                      onChange={e => setFormData({ ...formData, content: e.target.value })}
                      disabled={isViewMode}
                    />
                  </div>

                  {/* 啟用 */}
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                        disabled={isViewMode}
                      />
                      {t('common.active')}
                    </label>
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                {!isViewMode && (
                  <button type="submit" className="btn-primary">{t('common.save')}</button>
                )}
                <button type="button" className="btn-secondary" onClick={closeModal}>{t('common.cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulletinsPage;
```

### 頁面設計規範

| 項目                          | 說明                                                     |
| ----------------------------- | -------------------------------------------------------- |
| `FUNC_CODE`                 | 常數定義功能代碼，與 `system_functions.func_code` 一致 |
| `hasInitialized`            | 使用 `useRef` 防止 React StrictMode 重複初始化         |
| `FunctionPageHeader`        | 自動從資料庫讀取功能名稱顯示標題                         |
| `logView / logCreate / ...` | 每個操作都記錄日誌                                       |
| `hasPermission`             | 動態控制新增/編輯/刪除按鈕顯示                           |
| `isViewMode`                | 共用同一個 Modal，透過旗標控制唯讀模式                   |
| CSS classes                   | 直接使用 `DataTable.css` 提供的樣式                    |

---

## 13. Step 10：前端路由註冊

**檔案：** `src/App.tsx`

```typescript
// 1. 加入 import
import BulletinsPage from './pages/BulletinsPage';

// 2. 在 <Route> 區段加入
<Route path="bulletins" element={<BulletinsPage />} />
```

路由的 `path` 必須與 `system_functions.module_code` 一致。

---

## 14. 命名規則

> Base AP 命名邏輯，源於system_functions的資料表設計

### 14.1 核心原則

- **後端檔案**：以 `module_code` 為基礎（去除底線、轉單數、全小寫）
- **前端檔案**：以 `func_code` 為基礎（套用 camelCase / PascalCase 轉換）

### 14.2 命名轉換規則

| 來源欄位        | 用途     | 轉換規則                   | 範例                                                              |
| --------------- | -------- | -------------------------- | ----------------------------------------------------------------- |
| `module_code` | 後端檔名 | 去除底線 + 轉單數 + 全小寫 | `user_roles` → `userrole.py`                                 |
| `func_code`   | 前端檔名 | camelCase / PascalCase     | `user_roles` → `userRolesService.ts` / `UserRolesPage.tsx` |

### 14.3 後端檔案命名

```
app/models/{module_code 標準化}.py          # userrole.py
app/schemas/{module_code 標準化}.py         # userrole.py
app/routes/{module_code 標準化}.py          # userrole.py
app/services/{module_code 標準化}_service.py # userrole_service.py（選用）
```

### 14.4 前端檔案命名

```
src/types/{func_code camelCase}.ts             # userRoles.ts
src/services/{func_code camelCase}Service.ts   # userRolesService.ts
src/pages/{func_code PascalCase}Page.tsx       # UserRolesPage.tsx
```

### 14.5 轉換範例

| `func_code`        | `module_code`      | 後端 Model 檔         | 前端 Page 檔                | 前端 Service 檔               |
| -------------------- | -------------------- | --------------------- | --------------------------- | ----------------------------- |
| `system_functions` | `system_functions` | `systemfunction.py` | `SystemFunctionsPage.tsx` | `systemFunctionsService.ts` |
| `system_codes`     | `system_codes`     | `systemcode.py`     | `SystemCodesPage.tsx`     | `systemCodesService.ts`     |
| `user_roles`       | `user_roles`       | `userrole.py`       | `UserRolesPage.tsx`       | `userRolesService.ts`       |
| `organizations`    | `organizations`    | `organization.py`   | `OrganizationsPage.tsx`   | `organizationService.ts`    |
| `bulletins`        | `bulletins`        | `bulletin.py`       | `BulletinsPage.tsx`       | `bulletinService.ts`        |

### 14.6 API 路徑慣例

```
/api/{資料表名稱}   # 複數形式，使用底線
```

| 範例                      | 說明         |
| ------------------------- | ------------ |
| `/api/bulletins`        | 公告管理     |
| `/api/system_functions` | 系統功能管理 |
| `/api/user_roles`       | 使用者角色   |

### 14.7 URL 尾部斜線規範

> ⚠️ **重要**：FastAPI 路由預設含尾部斜線，前端呼叫 list / create 端點時**必須加上 `/`**。

```typescript
// ✅ 正確
axios.get(`${BASE_URL}/`, { params })     // GET 列表
axios.post(`${BASE_URL}/`, data)          // POST 新增

// ❌ 錯誤 — 會觸發 307 Temporary Redirect，可能導致 Network Error
axios.get(BASE_URL, { params })
axios.post(BASE_URL, data)

// ID 路徑不受影響
axios.get(`${BASE_URL}/${id}`)            // GET 單筆
axios.put(`${BASE_URL}/${id}`, data)      // PUT 更新
axios.delete(`${BASE_URL}/${id}`)         // DELETE 刪除
```

---

## 15. 權限系統整合

### 15.1 權限檢查流程

```
使用者登入 → Session 寫入 Redis（含授權功能清單 + 權限矩陣）
    ↓
存取頁面 → 前端 usePermission hook 從 API 查詢權限
    ↓
呼叫 API → 後端 get_current_user 驗證 Token
    ↓
執行操作 → 後端 check_permission 驗證細項權限（可選）
```

### 15.2 前端權限控制

```typescript
const { hasPermission } = usePermission();

// 頁面層級：無 read 權限不載入
if (!hasPermission('bulletins', 'read')) {
  return <div>{t('common.noPermission')}</div>;
}

// 元件層級：動態控制按鈕
{hasPermission('bulletins', 'create') && <button>新增</button>}
{hasPermission('bulletins', 'update') && <button>編輯</button>}
{hasPermission('bulletins', 'delete') && <button>刪除</button>}
```

### 15.3 後端權限控制

```python
from app.core.permissions import check_permission

# 在 Route 中檢查特定權限
@router.post("/")
async def create_item(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # get_current_user 已驗證 Token 有效性
    # 如需進一步檢查細項權限：
    if not check_permission(db, current_user, "bulletins", "create"):
        raise HTTPException(status_code=403, detail="無操作權限")
    # ... 業務邏輯
```

### 15.4 權限類型

| 類型 | 代碼       | 說明             |
| ---- | ---------- | ---------------- |
| 新增 | `create` | 可新增資料       |
| 讀取 | `read`   | 可檢視清單與詳情 |
| 修改 | `update` | 可編輯資料       |
| 刪除 | `delete` | 可刪除資料       |
| 列印 | `print`  | 可列印/匯出      |
| 檔案 | `file`   | 可上傳/管理附件  |

---

## 16. Transaction Token 機制

> 延續自 P-PA6.4 的交易安全機制，Base AP 使用 Token v3.0 架構。

### 16.1 機制概述

Transaction Token（交易令牌）用於確保寫入操作的安全性，防止未授權的資料異動。

```
使用者登入 → 取得 Bearer Token + Txn Token → 寫入 localStorage
    ↓
前端 axios 攔截器自動附加至 Header:
  - Authorization: Bearer <access_token>
  - X-Txn-Token: <txn_token>
    ↓
後端驗證 Token 有效性 + 權限
```

### 16.2 權限檢查規則

| 操作                   | Bearer Token | Txn Token | 權限       | 說明                           |
| ---------------------- | :----------: | :-------: | ---------- | ------------------------------ |
| 查詢列表 `GET /`     |      ✓      |    —    | —         | 只需登入認證                   |
| 查詢單筆 `GET /{id}` |      ✓      |    —    | —         | 只需登入認證                   |
| 新增 `POST /`        |      ✓      |    ✓    | `create` | 需要交易令牌                   |
| 更新 `PUT /{id}`     |      ✓      |    ✓    | `update` | 需要交易令牌                   |
| 刪除 `DELETE /{id}`  |      ✓      |    ✓    | `delete` | 一次性使用，Token 用後立即失效 |

### 16.3 前端處理方式

Token v3.0 使用全域令牌，**前端 Service 層不需要手動傳遞 Token**：

```typescript
// axios 攔截器（在 src/api/axios.ts 中）自動處理：
// 1. 從 localStorage 讀取 access_token → Authorization header
// 2. 從 localStorage 讀取 txn_token → X-Txn-Token header
// 3. Token 過期時自動導向登入頁

// 因此 Service 層直接呼叫即可
const response = await axios.post(`${BASE_URL}/`, data);
```

### 16.4 Token 過期與延長

- Token 有有效期限，接近過期時前端可提示使用者延長
- 使用 `useTransactionToken` Hook 可取得倒數計時與延長功能（選用）
- Token 過期後 axios 攔截器會自動清除並導向登入頁

---

## 17. Session 驗證機制

### 17.1 驗證流程

每個功能頁面在初始化時執行以下驗證步驟：

```
1. 檢查 localStorage 是否有 token
   ├─ 檢查 access_token（Bearer Token）
   └─ 檢查 txn_token（交易令牌）
   → 如果沒有 → 導向登入頁

2. 呼叫後端 API 驗證 Session 有效性
   → API: GET /api/auth/verify-session
   → 無效 → 返回 401，前端清除 token 並導向登入頁
   → 有效 → 繼續執行

3. 執行業務邏輯
   → 載入資料、axios 攔截器自動附加 token
```

### 17.2 Base AP 的實作方式

Base AP 使用 `usePermission` Hook + `useRef` 防止重複初始化：

```typescript
import { usePermission } from '../hooks/usePermission';

const FUNC_CODE = 'bulletins';

const BulletinsPage: React.FC = () => {
  const { hasPermission, loading: permissionLoading } = usePermission();
  const hasInitialized = useRef(false);

  useEffect(() => {
    // permissionLoading 為 false 時表示權限已載入完成
    // hasInitialized 防止 React StrictMode 重複初始化
    if (!permissionLoading && hasPermission(FUNC_CODE, 'read') && !hasInitialized.current) {
      hasInitialized.current = true;
      const initPage = async () => {
        try {
          await loadItems();
          await logView(FUNC_CODE, {}, null);
        } catch (err: any) {
          await logView(FUNC_CODE, {}, err.message);
        }
      };
      initPage();
    }
  }, [permissionLoading]);

  // 無權限時顯示提示
  if (!hasPermission(FUNC_CODE, 'read')) {
    return <div className="error-message">{t('common.noPermission')}</div>;
  }

  // ...
};
```

### 17.3 重要說明

- 這是基於 Session 期間的信任作業
- 如果 Session 失效（長時間未操作），系統可能已變更
- 必須重新驗證並取得最新權限資訊
- 防止使用者繞過登入直接訪問功能頁面

---

## 18. 操作日誌整合

### 18.1 前端日誌記錄

```typescript
import { logView, logCreate, logRead, logUpdate, logDelete } from '../utils/userLogHelper';

// 頁面載入
await logView('bulletins', { filters: {} }, null);

// 檢視單筆
await logRead('bulletins', itemData);

// 新增（成功）
await logCreate('bulletins', createdItem);

// 新增（失敗）
await logCreate('bulletins', formData, '錯誤訊息');

// 更新（成功 — 傳入修改前和修改後資料）
await logUpdate('bulletins', oldItem, updatedItem);

// 刪除
await logDelete('bulletins', deletedItem);
```

### 18.2 日誌記錄最佳實踐

- **成功操作**：傳入 API 回傳的完整資料
- **失敗操作**：傳入嘗試的表單資料 + 錯誤訊息（第 3 或第 4 參數）
- **更新操作**：必須傳入修改前資料（`oldItem`）才能在日誌中比對差異
- **日誌失敗不應阻斷主流程**：使用 try-catch 包裹日誌呼叫

---

## 19. 多語系整合

### 19.1 JSONB 多語系欄位

資料庫中的多語系欄位以 JSONB 儲存：

```json
{
  "zh-TW": "公告標題",
  "en": "Bulletin Title"
}
```

### 19.2 前端取值

```typescript
import { getI18nValue } from '../utils/i18nHelper';
import { I18nField } from '../types';

// 取得當前語系的值
const title = getI18nValue(item.title, i18n.language);

// 帶 fallback
const title = getI18nValue(item.title, i18n.language, '預設標題');
```

### 19.3 前端表單輸入

依啟用語系動態產生輸入欄位：

```typescript
const { availableLanguages } = useSystem();
const enabledLangs = availableLanguages.map(l => l.code);

{enabledLangs.map(lang => (
  <div key={lang}>
    <label>{lang}</label>
    <input
      value={formData.title[lang] || ''}
      onChange={e => setFormData({
        ...formData,
        title: { ...formData.title, [lang]: e.target.value }
      })}
    />
  </div>
))}
```

### 19.4 UI 翻譯 Key

系統介面文字使用 `react-i18next`：

```typescript
const { t } = useTranslation();
t('common.save')         // 儲存
t('common.cancel')       // 取消
t('common.confirmDelete') // 確定要刪除嗎？
t('message.saveSuccess') // 儲存成功
```

自訂翻譯 key 需加入語系 JSON 檔，或透過語系管理 API 動態載入。

---

## 20. I18N 翻譯檔案規範

> Base AP 使用 `i18next-http-backend` 從 API 動態載入翻譯，保留靜態檔案作為 fallback。翻譯 key 的命名規範延續 P-PA6.4 標準。

### 20.1 翻譯載入機制

```
優先：API 動態載入  →  GET /api/languages/{lang}/translation
備用：靜態檔案      →  src/locales/{lang}/translation.json
```

### 20.2 翻譯 Key 命名空間

| 命名空間        | 用途                     | 範例                                                         |
| --------------- | ------------------------ | ------------------------------------------------------------ |
| `common`      | 通用文字（按鈕、標籤等） | `common.save`、`common.delete`、`common.confirmDelete` |
| `message`     | 操作結果訊息             | `message.saveSuccess`、`message.deleteFailed`            |
| `transaction` | 交易令牌相關             | `transaction.extendTitle`、`transaction.cancelled`       |
| `{funcCode}`  | 功能專用文字             | `bulletins.title`、`userRoles.roleName`                  |

### 20.3 命名規範

- 使用 **camelCase** 命名法
- 語意清晰，避免縮寫
- 優先使用 `common` / `message` 共用翻譯，避免重複定義

```typescript
// ✅ 推薦：使用共用翻譯
<button>{t('common.save')}</button>
<button>{t('common.delete')}</button>

// ❌ 不推薦：功能內重複定義
<button>{t('bulletins.save')}</button>
```

### 20.4 功能翻譯結構

每個功能模組的翻譯 key 建議按以下結構組織：

```json
{
  "bulletins": {
    "title": "公告標題",
    "content": "內容",
    "category": "分類",
    "placeholder": {
      "title": "請輸入公告標題",
      "content": "請輸入內容"
    },
    "validation": {
      "titleRequired": "標題為必填"
    }
  }
}
```

### 20.5 帶參數的翻譯

```json
{
  "message": {
    "itemDeleted": "已刪除 {{itemName}}",
    "recordCount": "共有 {{count}} 筆資料"
  }
}
```

```typescript
t('message.itemDeleted', { itemName: '公告' })
t('message.recordCount', { count: data.length })
```

### 20.6 帶預設值的翻譯（推薦）

```typescript
// 翻譯 key 不存在時顯示預設值
<h1>{t('bulletins.title', '公告標題')}</h1>
<button>{t('common.save', '儲存')}</button>
```

### 20.7 翻譯完整性檢查

- [ ] 所有按鈕文字使用 `t()` 翻譯
- [ ] 所有表單欄位標籤使用 `t()` 翻譯
- [ ] 所有訊息提示使用 `t()` 翻譯
- [ ] 頁面無硬編碼中文/英文字串（註解除外）
- [ ] 切換語系後所有文字正確顯示

> **注意**：頁面標題由 `FunctionPageHeader` 元件自動從 `system_functions.func_name` JSONB 取得，不需要 i18n 翻譯 key。

---

## 21. 系統訊息代碼整合

> 所有系統回應訊息（成功、錯誤、資料處理等）統一透過 `sys_message_code` 進行代碼化管理，不在程式中硬編碼訊息文字。
> 詳細規格請參閱 [系統訊息分類設計.md](系統訊息分類設計.md)。

### 21.1 代碼編碼規則

```
{PREFIX}{分類碼}{訊息碼}
  3碼    2碼     4碼     = 共 9 碼

範例：ERR010001（錯誤-認證模組-第1號）
```

| 前綴 | 說明 | 用途 |
|------|------|------|
| `SYS` | 系統訊息 | 系統狀態、成功回應、一般提示 |
| `ERR` | 錯誤訊息 | 操作失敗、驗證錯誤、例外狀況 |
| `DAT` | 資料處理 | 匯入匯出、資料驗證、批次處理結果 |

**分類碼區間**：正式環境 01~49、開發測試環境 51~99（差 50 對應）

### 21.2 新增功能模組時的訊息代碼處理

當新增應用功能模組時，需同步規劃該模組的系統訊息代碼：

#### Step 1：分配分類碼

從預留區間中選擇未使用的分類碼，正式與開發各取一組：

| 環境 | 區間 | 範例 |
|------|------|------|
| 正式環境 | 30~49 | 選定 `31` 作為新模組分類碼 |
| 開發環境 | 80~99 | 對應 `81`（31 + 50） |

#### Step 2：登記分類定義

在 `system_codes` 中新增分類記錄（code_type = `sys_message_category`）：

```
code_type: sys_message_category
code:      31
code_name: {"zh-TW":"公告管理","zh-CN":"公告管理","en":"Bulletin Management"}
note1:     production
```

```
code_type: sys_message_category
code:      81
code_name: {"zh-TW":"公告管理（開發）","zh-CN":"公告管理（开发）","en":"Bulletin Management (Dev)"}
note1:     development
```

#### Step 3：建立訊息代碼

在 `system_codes` 中新增訊息記錄（code_type = `sys_message_code`）：

```
# 正式環境 — 使用者看到的訊息（簡潔、不洩漏細節）
SYS310001: {"zh-TW":"{name}儲存成功","zh-CN":"{name}储存成功","en":"{name} saved successfully"}
SYS310002: {"zh-TW":"{name}刪除成功","zh-CN":"{name}删除成功","en":"{name} deleted successfully"}
ERR310001: {"zh-TW":"{name}儲存失敗","zh-CN":"{name}储存失败","en":"Failed to save {name}"}

# 開發環境 — 開發人員看到的訊息（含技術細節）
ERR810001: {"zh-TW":"{name}儲存失敗：{detail}","zh-CN":"{name}储存失败：{detail}","en":"Failed to save {name}: {detail}"}
```

#### Step 4：後端回傳代碼

在後端 Route 中使用代碼取代硬編碼訊息：

```python
from app.core.config import settings

# 依環境回傳不同精細度的代碼
if settings.ENVIRONMENT == "production":
    raise HTTPException(status_code=400, detail="ERR310001")
else:
    raise HTTPException(status_code=400, detail="ERR810001")
```

#### Step 5：前端顯示訊息

```typescript
const { getMessageByCode } = useSystem();

// 後端回傳的代碼 → 翻譯為使用者語系的訊息
// 無參數
setError(getMessageByCode(err.response?.data?.detail));
// → 系統訊息：(ERR310001)公告管理儲存失敗

// 帶參數（{name} 等佔位符替換）
alert(getMessageByCode("SYS310001", { name: t('bulletins.title') }));
// → 系統訊息：(SYS310001)公告管理儲存成功
```

### 21.3 注意事項

1. **不在程式碼中硬編碼訊息文字**：所有使用者可見的系統回應都應使用訊息代碼
2. **正式環境不回傳開發代碼**：分類碼 50~99 僅限開發環境使用
3. **代碼只增不減**：已廢棄的代碼設定 `is_active = false`，不刪除、不複用
4. **透過管理介面維護**：在系統代碼設定頁面（code_type = `sys_message_code`）管理，無需改程式碼
5. **多語系同步**：新增代碼時，`code_name` JSONB 須包含所有啟用語系的翻譯

---

## 22. 完整範例：公告管理模組

### 建置步驟總整理

| 步驟 | 動作         | 檔案                                                 |
| ---- | ------------ | ---------------------------------------------------- |
| 1    | 建立資料表   | SQL 執行 `CREATE TABLE bulletins ...`              |
| 2    | 建立 Model   | `backend/app/models/bulletin.py`                   |
| 3    | 建立 Schema  | `backend/app/schemas/bulletin.py`                  |
| 4    | 建立 Service | `backend/app/services/bulletin_service.py`（選用） |
| 5    | 建立 Route   | `backend/app/routes/bulletin.py`                   |
| 6    | 註冊路由     | `backend/app/main.py` 加入 `include_router`      |
| 7    | 註冊功能     | SQL 插入 `system_functions`                        |
| 8    | 指派權限     | 在「角色權限設定」頁面勾選                           |
| 9    | 建立 Service | `frontend/src/services/bulletinService.ts`         |
| 10   | 建立頁面     | `frontend/src/pages/BulletinsPage.tsx`             |
| 11   | 註冊路由     | `frontend/src/App.tsx` 加入 `<Route>`            |
| 12   | 重啟服務     | 後端重啟、前端自動熱載入                             |

---

## 23. 進階檢核清單

建置新功能模組前，請逐項確認：

### 第一階段：資料庫設計

- [ ] CREATE TABLE 包含 `id`、`edit_by`、`created_at`、`updated_at`
- [ ] 多語系欄位使用 JSONB 型別
- [ ] 建立必要索引
- [ ] 加入 COMMENT 註解
- [ ] `system_functions` 資料表已新增功能記錄
- [ ] `func_code` 命名符合規範（小寫英文 + 底線）
- [ ] `module_code` 與前端路由 path 一致
- [ ] `module_item` 列出支援的操作項目

### 第二階段：後端開發

- [ ] Model 繼承 `Base`，定義所有欄位與關聯
- [ ] Model 檔名遵循 module_code 標準化規則
- [ ] Schema 定義 Response / Create / Update 三種
- [ ] Response Schema 設定 `model_config = ConfigDict(from_attributes=True)`
- [ ] Route 使用 `Depends(get_db)` 和 `Depends(get_current_user)`
- [ ] Route 定義 `xxx_to_dict()` 函式（供日誌使用）
- [ ] 新增/更新操作檢查唯一碼重複（如適用）
- [ ] 刪除操作檢查關聯資料（如適用）
- [ ] 在 `main.py` 註冊 router
- [ ] API 文件可在 `http://localhost:10181/docs` 驗證

### 第三階段：前端開發

- [ ] Types 定義 Response / Create / Update / Filters 介面
- [ ] Service 定義 CRUD 函式，URL 尾部斜線正確
- [ ] 頁面使用 `usePermission` 檢查權限
- [ ] 頁面使用 `FunctionPageHeader` 元件（禁止自行撰寫標題）
- [ ] 頁面使用 `hasInitialized` ref 防止重複初始化
- [ ] 所有 CRUD 操作呼叫對應的 `log*` 函式
- [ ] 日誌失敗不阻斷主流程（try-catch 包裹）
- [ ] 多語系欄位使用 `getI18nValue` 取值
- [ ] 表單多語系輸入依 `availableLanguages` 動態產生
- [ ] 在 `App.tsx` 註冊路由（path = module_code）
- [ ] 所有文字使用 `t()` 翻譯，無硬編碼字串

### 第四階段：功能測試

- [ ] **資料查詢**：列表顯示、分頁、篩選、搜尋
- [ ] **資料新增**：成功建立並顯示、欄位驗證、重複碼檢查
- [ ] **資料更新**：成功更新並即時反映、部分更新
- [ ] **資料刪除**：確認對話框、成功刪除、關聯保護
- [ ] **API 調用**：Network 面板確認無 307 Redirect

### 第四階段：安全性測試

- [ ] 查詢不需要 Txn Token
- [ ] 新增需要 Txn Token + create 權限
- [ ] 更新需要 Txn Token + update 權限
- [ ] 刪除需要 Txn Token + delete 權限（一次性使用）
- [ ] Token 過期時正確拒絕（401/403）
- [ ] 無權限時按鈕隱藏且 API 拒絕

### 第四階段：日誌驗證

- [ ] 進入頁面記錄 View 日誌
- [ ] 新增成功/失敗記錄 Create 日誌
- [ ] 更新記錄 Update 日誌（含修改前 look_data、修改後 change_data）
- [ ] 刪除記錄 Delete 日誌（含被刪除資料）
- [ ] 錯誤時日誌包含 err_detail

### 第四階段：I18N 驗證

- [ ] 切換繁體中文顯示正確
- [ ] 切換簡體中文顯示正確
- [ ] 切換英文顯示正確
- [ ] 無遺漏翻譯（無顯示 key 值的情況）
- [ ] JSONB 多語系欄位依語系正確取值

### 第四階段：系統訊息代碼驗證

- [ ] 已分配分類碼（正式 + 開發各一組）
- [ ] 分類定義已登記至 `sys_message_category`
- [ ] 所有訊息代碼已建立至 `sys_message_code`（含所有啟用語系翻譯）
- [ ] `note1` 已標記環境（`production` / `development`）
- [ ] 正式碼 `note2` 已填寫對應的開發代碼
- [ ] 後端回傳代碼（非硬編碼文字），依 `ENVIRONMENT` 區分正式/開發代碼
- [ ] 前端使用 `getMessageByCode()` 顯示訊息
- [ ] 訊息格式正確：`系統訊息：(代碼)說明`
- [ ] 帶參數的訊息（`{name}` 等）替換正確
- [ ] 切換語系後訊息正確翻譯

### 第五階段：上線前

- [ ] 已在「角色權限設定」為需要的角色勾選權限
- [ ] API 端點可在 Swagger UI (`/docs`) 驗證
- [ ] 文件已更新

---

## 24. 常見問題 FAQ

### Q1: API 呼叫出現 307 Temporary Redirect？

**原因**：前端呼叫 list / create 端點時未加尾部斜線。FastAPI 路由定義為 `@router.get("/")`，缺少 `/` 會觸發 307 redirect。

**解決**：確認 Service 檔案中 `getAll()` 和 `create()` 使用 `` `${BASE_URL}/` `` 而非 `BASE_URL`。

### Q2: 如何處理不需要 Transaction Token 的功能？

某些唯讀功能（如報表、查詢）不需要 Txn Token。在 Route 中只使用 `Depends(get_current_user)` 即可，不加入 `require_txn_token` 依賴。

### Q3: 如何處理批量操作？

批量操作（如批量刪除）應該：

1. 使用一次性 Token（`one_time_use=True`）
2. 記錄每筆操作的日誌
3. 在錯誤時提供詳細訊息

### Q4: 前端 Token 過期時如何處理？

- axios 攔截器會自動偵測 401 回應並導向登入頁
- 如需 Token 倒數計時和延長提示功能，可使用 `useTransactionToken` Hook（選用）
- 使用者未回應時自動撤銷 Token

### Q5: JSONB 搜尋怎麼寫？

```python
from sqlalchemy import cast, String
from sqlalchemy.dialects.postgresql import JSONB

# 搜尋 JSONB 多語系欄位
query = query.filter(
    cast(Model.func_name, JSONB).cast(String).ilike(f"%{search}%")
)
```

> ⚠️ 注意：不要對 JSONB 欄位直接使用 `.cast(String)`，需先 cast 為 JSONB 再 cast 為 String。

### Q6: 新增語系後，JSONB 欄位要怎麼處理？

JSONB 儲存所有已建立語系的值，不論是否啟用。新增語系時，後端會以預設語系為模板自動補值。前端表單依 `availableLanguages` 動態產生輸入欄位，不需修改程式碼。

### Q7: 翻譯 key 應該放在哪個命名空間？

- **通用文字**（新增、編輯、刪除等）：`common` 命名空間
- **操作訊息**（成功、失敗等）：`message` 命名空間
- **功能專用文字**：使用 func_code 的 camelCase 作為命名空間（如 `userRoles`、`systemCodes`）
- 優先使用 `common` 和 `message` 的共用翻譯，避免重複定義

### Q8: 頁面標題怎麼顯示？

**必須使用 `FunctionPageHeader` 元件**，禁止自行撰寫標題邏輯。元件自動從 `system_functions.func_name` JSONB 取得當前語系名稱，下方以藍色文字顯示 `description`。

```tsx
<FunctionPageHeader funcCode="bulletins" />
```

### Q9: 如何防止 React StrictMode 重複初始化？

使用 `useRef` 旗標：

```typescript
const hasInitialized = useRef(false);

useEffect(() => {
  if (!permissionLoading && hasPermission(FUNC_CODE, 'read') && !hasInitialized.current) {
    hasInitialized.current = true;
    // 初始化邏輯...
  }
}, [permissionLoading]);
```

### Q10: 操作日誌記錄失敗會影響主流程嗎？

不會。日誌呼叫必須用 try-catch 包裹，確保日誌記錄失敗時不阻斷主流程：

```typescript
try {
  await logCreate(FUNC_CODE, created as any);
} catch (logErr) {
  console.error('Log error:', logErr);
}

---

## 附錄 A：實戰參考 — system_functions 系統功能管理

> 本節以平台內建的「系統功能管理」模組為實戰範例，展示一個包含**樹狀結構、CHECK 約束、唯一碼檢查、關聯刪除保護**等進階特性的完整 CRUD 模組如何從資料庫到前端逐層實作。

### A.1 資料庫設計特色

```sql
CREATE TABLE IF NOT EXISTS system_functions (
    id SERIAL PRIMARY KEY,
    func_code VARCHAR(200) NOT NULL,              -- 唯一功能代碼
    upper_func_id INTEGER NOT NULL DEFAULT 0,     -- 上層功能 ID（0=根節點，構成樹狀結構）
    func_name JSONB NOT NULL DEFAULT '{}',        -- 多語系名稱
    func_type INTEGER NOT NULL,                   -- 1:節點/選單, 2:功能頁面
    func_order INTEGER NOT NULL,                  -- 排序值
    func_icon VARCHAR(200),
    module_code VARCHAR(200),                     -- 前端路由路徑
    module_item JSONB NOT NULL DEFAULT '[]',      -- 權限項目陣列 ["Create","Read",...]
    description TEXT,
    is_mana BOOLEAN NOT NULL DEFAULT FALSE,       -- 系統管理功能旗標
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    edit_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    -- ★ CHECK 約束：節點不可有 module_code，功能必須有 module_code
    CONSTRAINT chk_system_functions_type CHECK (func_type IN (1, 2)),
    CONSTRAINT chk_system_functions_module CHECK (
        (func_type = 1 AND module_code IS NULL) OR
        (func_type = 2 AND module_code IS NOT NULL)
    )
);
```

**與簡易 CRUD 的差異：**

| 進階特性       | 說明                                                                                             |
| -------------- | ------------------------------------------------------------------------------------------------ |
| 樹狀結構       | `upper_func_id` 指向父節點，`0` 為根層級                                                     |
| CHECK 約束     | 資料庫層級強制「節點無 module、功能必有 module」                                                 |
| JSONB 陣列欄位 | `module_item` 存放 `["Create","Read","Update","Delete","Print","File"]`                      |
| 排序機制       | `func_order < 10` 為隱藏功能（不顯示於側邊欄），節點 `10, 20, 30...`，功能 `X010, X020...` |

**初始資料結構範例：**

```sql
-- 隱藏功能 (func_order 1~9)
(14, 'my_profile',      0, '{"zh-TW":"個人資料","en":"My Profile"}',      2, 1, ..., 'my_profile',      '["Read","Update"]'),
(15, 'change_password', 0, '{"zh-TW":"密碼變更","en":"Change Password"}', 2, 2, ..., 'change_password', '["Read","Update"]'),

-- 系統管理後台（節點）
(1,  'system_mana',     0, '{"zh-TW":"系統管理後台","en":"System Management"}', 1, 10,   ..., NULL, '[]'),
-- 系統管理後台 → 子功能
(6,  'system_functions', 1, '{"zh-TW":"系統功能管理","en":"System Functions"}',  2, 1050, ..., 'system_functions', '["Create","Read","Update","Delete","Print","File"]'),

-- 租戶管理（節點）
(11, 'tenant_mana',     0, '{"zh-TW":"租戶管理","en":"Tenant Management"}',     1, 20,   ..., NULL, '[]'),
-- 租戶管理 → 子功能
(12, 'tenant_profile', 11, '{"zh-TW":"組織資料維護","en":"Tenant Profile"}',     2, 2010, ..., 'tenant_profile', '["Create","Read","Update","Delete","Print","File"]'),
```

### A.2 後端 Model — 進階約束

```python
# app/models/systemfunction.py
class SystemFunction(Base):
    __tablename__ = "system_functions"

    id = Column(Integer, primary_key=True, index=True)
    func_code = Column(String(200), nullable=False, index=True)
    upper_func_id = Column(Integer, nullable=False, default=0, index=True)
    func_name = Column(JSONB, nullable=False, default=dict)
    func_type = Column(Integer, nullable=False, index=True)
    func_order = Column(Integer, nullable=False, index=True)
    func_icon = Column(String(200))
    module_code = Column(String(200), index=True)
    module_item = Column(JSONB, nullable=False, default=list)   # ★ 注意 default=list
    description = Column(Text)
    is_mana = Column(Boolean, nullable=False, default=False)
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    edit_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.current_timestamp())
    updated_at = Column(TIMESTAMP)

    __table_args__ = (
        # ★ Model 中定義 CHECK 約束
        CheckConstraint("func_type IN (1, 2)", name="chk_system_functions_type"),
        CheckConstraint(
            "(func_type = 1 AND module_code IS NULL) OR (func_type = 2 AND module_code IS NOT NULL)",
            name="chk_system_functions_module"
        ),
        # 多欄位索引
        Index("idx_system_functions_code", "func_code"),
        Index("idx_system_functions_upper", "upper_func_id"),
        Index("idx_system_functions_order", "func_order"),
    )

    editor = relationship("User", foreign_keys=[edit_by])
```

**重點：**

- JSONB 陣列欄位用 `default=list`（非 `default=dict`）
- `CheckConstraint` 在 Model 層定義，與 SQL 一致
- 多個 `Index` 定義在 `__table_args__` 中

### A.3 後端 Schema — 含樹狀節點

```python
# app/schemas/systemfunction.py
class SystemFunctionBase(BaseModel):
    func_code: str = Field(..., max_length=200)
    upper_func_id: int = Field(0)
    func_name: Dict[str, str] = Field(default_factory=dict)
    func_type: int = Field(...)               # 1 或 2
    func_order: int = Field(...)
    func_icon: Optional[str] = Field(None, max_length=200)
    module_code: Optional[str] = Field(None, max_length=200)
    module_item: List[str] = Field(default_factory=list)   # ★ List[str] 而非 Dict
    description: Optional[str] = Field(None)
    is_mana: bool = Field(False)
    is_active: bool = Field(True)

class SystemFunctionCreate(SystemFunctionBase):
    pass  # 繼承所有欄位

class SystemFunctionUpdate(BaseModel):
    # ★ 全部 Optional，支援部分更新
    func_code: Optional[str] = Field(None, max_length=200)
    upper_func_id: Optional[int] = Field(None)
    func_name: Optional[Dict[str, str]] = Field(None)
    # ... 其餘欄位皆 Optional

class SystemFunctionResponse(SystemFunctionBase):
    id: int
    edit_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

# ★ 樹狀結構節點 — 自我遞迴引用
class SystemFunctionTreeNode(SystemFunctionResponse):
    children: Optional[List['SystemFunctionTreeNode']] = Field(default_factory=list)
    model_config = ConfigDict(from_attributes=True)

SystemFunctionTreeNode.model_rebuild()  # ★ 解決循環引用
```

**重點：**

- `TreeNode` 繼承 `Response`，新增自我遞迴的 `children` 欄位
- 必須呼叫 `model_rebuild()` 讓 Pydantic 正確解析循環引用

### A.4 後端 Route — 進階邏輯

```python
# app/routes/systemfunction.py

# ===== 轉換字典（供日誌使用）=====
def system_function_to_dict(func: SystemFunction) -> dict:
    return {
        "id": func.id,
        "func_code": func.func_code,
        "func_name": func.func_name,
        "func_type": func.func_type,
        "func_order": func.func_order,
        "func_icon": func.func_icon,
        "module_code": func.module_code,
        "upper_func_id": func.upper_func_id,
        "module_item": func.module_item,
        "description": func.description,
        "is_mana": func.is_mana,
        "is_active": func.is_active,
        "edit_by": func.edit_by,
        "created_at": func.created_at.isoformat() if func.created_at else None,
        "updated_at": func.updated_at.isoformat() if func.updated_at else None
    }

# ===== ★ 樹狀結構建構 =====
def build_tree(functions: List[SystemFunction], parent_id: int = 0) -> List[dict]:
    tree = []
    for func in functions:
        if func.upper_func_id == parent_id:
            node = system_function_to_dict(func)
            children = build_tree(functions, func.id)
            if children:
                node['children'] = children
            tree.append(node)
    return tree
```

**進階端點 — 樹狀結構：**

```python
@router.get("/tree", response_model=List[SystemFunctionTreeNode])
async def get_functions_tree(
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(SystemFunction)
    if is_active is not None:
        query = query.filter(SystemFunction.is_active == is_active)
    functions = query.order_by(SystemFunction.func_order).all()
    return build_tree(functions, parent_id=0)
```

**進階端點 — 以 func_code 查詢：**

```python
@router.get("/by-code/{func_code}", response_model=SystemFunctionResponse)
async def get_function_by_code(func_code: str, ...):
    function = db.query(SystemFunction).filter(SystemFunction.func_code == func_code).first()
    if not function:
        raise HTTPException(status_code=404, detail=f"找不到系統功能: {func_code}")
    return function
```

**進階邏輯 — 新增時唯一碼檢查：**

```python
@router.post("/", response_model=SystemFunctionResponse, status_code=201)
async def create_function(function_data: SystemFunctionCreate, ...):
    # ★ func_code 唯一性檢查
    existing = db.query(SystemFunction).filter(
        SystemFunction.func_code == function_data.func_code
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="功能代碼已存在")

    new_function = SystemFunction(**function_data.model_dump(), edit_by=current_user.id)
    db.add(new_function)
    db.commit()
    db.refresh(new_function)

    # 後端日誌記錄
    log_service = UserLogService()
    func_id = log_service.get_function_id_by_code(db, "system_functions")
    if func_id:
        log_service.log_create(db, current_user.id, func_id, system_function_to_dict(new_function))
    return new_function
```

**進階邏輯 — 刪除保護（子功能 + 角色權限）：**

```python
@router.delete("/{function_id}", status_code=204)
async def delete_function(function_id: int, ...):
    function = db.query(SystemFunction).filter(SystemFunction.id == function_id).first()
    if not function:
        raise HTTPException(status_code=404, detail="找不到系統功能")

    # ★ 檢查子功能 — 有子節點不可刪除
    children = db.query(SystemFunction).filter(
        SystemFunction.upper_func_id == function_id
    ).count()
    if children > 0:
        raise HTTPException(status_code=400, detail="此功能下還有子功能，無法刪除")

    # ★ 檢查角色權限參照 — 有被角色使用不可刪除
    from app.models.roleright import RoleRight
    role_rights_count = db.query(RoleRight).filter(
        RoleRight.system_function_id == function_id
    ).count()
    if role_rights_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"此功能已被 {role_rights_count} 個角色使用，無法刪除。請先移除角色權限設定。"
        )

    deleted_data = system_function_to_dict(function)
    db.delete(function)
    db.commit()

    # 記錄刪除日誌
    log_service = UserLogService()
    func_id = log_service.get_function_id_by_code(db, "system_functions")
    if func_id:
        log_service.log_delete(db, current_user.id, func_id, deleted_data)
```

### A.5 前端 Types — 含樹狀結構與查詢參數

```typescript
// src/types/systemFunctions.ts
import { I18nField } from './index';

export interface SystemFunction {
  id: number;
  func_code: string;
  upper_func_id: number;
  func_name: I18nField;
  func_type: number;        // 1:節點, 2:功能
  func_order: number;
  func_icon?: string;
  module_code?: string;
  module_item: string[];    // ★ 字串陣列（非 Record）
  description?: string;
  is_mana: boolean;
  is_active: boolean;
  edit_by: number;
  created_at: string;
  updated_at?: string;
  children?: SystemFunction[];  // ★ 自我遞迴（樹狀結構）
}

// ★ 查詢參數介面
export interface GetSystemFunctionsParams {
  skip?: number;
  limit?: number;
  is_active?: boolean;
  func_type?: number;
  search?: string;
}
```

### A.6 前端 Service — 含 tree 與 by-code 端點

```typescript
// src/services/systemFunctionsService.ts
import axios from '../api/axios';
import { SystemFunction, SystemFunctionCreate, SystemFunctionUpdate, GetSystemFunctionsParams } from '../types/systemFunctions';

const BASE_URL = '/api/system_functions';

// 標準 CRUD
export const getSystemFunctions = async (params?: GetSystemFunctionsParams): Promise<SystemFunction[]> => {
  const response = await axios.get(`${BASE_URL}/`, { params });
  return response.data;
};

export const createSystemFunction = async (data: SystemFunctionCreate): Promise<SystemFunction> => {
  const response = await axios.post(`${BASE_URL}/`, data);
  return response.data;
};

export const updateSystemFunction = async (id: number, data: SystemFunctionUpdate): Promise<SystemFunction> => {
  const response = await axios.put(`${BASE_URL}/${id}`, data);
  return response.data;
};

export const deleteSystemFunction = async (id: number): Promise<void> => {
  await axios.delete(`${BASE_URL}/${id}`);
};

// ★ 進階端點
export const getSystemFunctionsTree = async (params?: { is_active?: boolean }): Promise<SystemFunction[]> => {
  const response = await axios.get(`${BASE_URL}/tree`, { params });
  return response.data;
};
```

### A.7 前端頁面關鍵模式

`SystemFunctionsPage.tsx` 展示了幾個超越簡易 CRUD 的常見模式：

**模式 1：func_type 連動控制**

```typescript
// func_type 切換時，自動清空/必填 module 相關欄位
const handleFuncTypeChange = (type: number) => {
  if (type === 1) {  // 節點
    setFormData({ ...formData, func_type: 1, module_code: undefined, module_item: [] });
  } else {           // 功能
    setFormData({ ...formData, func_type: 2 });
  }
};
```

**模式 2：module_item 多選 checkbox**

```typescript
const PERMISSION_OPTIONS = ['Create', 'Read', 'Update', 'Delete', 'Print', 'File'];

{PERMISSION_OPTIONS.map(perm => (
  <label key={perm}>
    <input
      type="checkbox"
      checked={formData.module_item?.includes(perm) || false}
      onChange={e => {
        const items = formData.module_item || [];
        setFormData({
          ...formData,
          module_item: e.target.checked
            ? [...items, perm]
            : items.filter(i => i !== perm)
        });
      }}
      disabled={isViewMode || formData.func_type === 1}
    />
    {perm}
  </label>
))}
```

**模式 3：上層功能下拉選單（僅顯示節點）**

```typescript
// 從完整列表過濾出 func_type=1 的節點供選擇
const nodeOptions = items.filter(f => f.func_type === 1);

<select
  value={formData.upper_func_id}
  onChange={e => setFormData({ ...formData, upper_func_id: Number(e.target.value) })}
>
  <option value={0}>（根層級）</option>
  {nodeOptions.map(node => (
    <option key={node.id} value={node.id}>
      {getI18nValue(node.func_name, i18n.language)}
    </option>
  ))}
</select>
```

### A.8 系統選單的權限過濾（system.py）

前端側邊欄的選單顯示，並非直接使用 `/api/system_functions/tree`，而是透過 `/api/system/functions` 做三層過濾：

```
1. 查詢使用者角色的所有 role_rights → 取得可存取的 function ID
2. 建立樹狀結構，僅保留有 read 權限的功能
3. 遞迴移除「空節點」（節點下所有子功能都無權限時，隱藏該節點）
```

這個邏輯確保不同角色的使用者看到不同的選單結構。

### A.9 與公告管理範例的對照

| 面向       | 公告管理（簡易 CRUD）     | 系統功能管理（進階 CRUD）        |
| ---------- | ------------------------- | -------------------------------- |
| 資料結構   | 扁平                      | 樹狀（upper_func_id）            |
| 約束       | 基本 NOT NULL             | CHECK 約束（type↔module 連動）  |
| 唯一碼     | 無                        | func_code 唯一性檢查             |
| 刪除保護   | 直接刪除                  | 檢查子功能 + 角色權限參照        |
| API 端點   | 5 個標準 CRUD             | 7 個（含 /tree、/by-code）       |
| Schema     | 3 個                      | 5 個（含 TreeNode）              |
| JSONB 欄位 | `Dict[str, str]` 多語系 | 同上 +`List[str]` 權限陣列     |
| 前端表單   | 靜態欄位                  | 條件連動（type 切換控制 module） |
| 後端日誌   | 前端呼叫                  | 後端 Route 內直接記錄            |

> **建議：** 簡易 CRUD 模組直接參考第 4~13 節的公告管理範例即可。當需要樹狀結構、唯一碼、刪除保護、條件連動表單等進階需求時，參照本附錄的 system_functions 實作模式。
