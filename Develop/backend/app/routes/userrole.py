"""
User Role Routes
使用者角色相關路由
"""

import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from sqlalchemy import cast, String
from sqlalchemy.dialects.postgresql import JSONB

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.message_codes import raise_msg
from app.models.userrole import UserRole
from app.models.user import User
from app.schemas.userrole import UserRoleResponse, UserRoleCreate, UserRoleUpdate
from app.services.userlog_service import UserLogService

logger = logging.getLogger(__name__)
router = APIRouter()


def user_roles_to_dict(role: UserRole) -> dict:
    """將 UserRole 物件轉換為完整資料字典"""
    return {
        "id": role.id,
        "role_name": role.role_name,
        "description": role.description,
        "is_mana": role.is_mana,
        "is_active": role.is_active,
        "edit_by": role.edit_by,
        "created_at": role.created_at.isoformat() if role.created_at else None,
        "updated_at": role.updated_at.isoformat() if role.updated_at else None
    }


@router.get("/", response_model=List[UserRoleResponse], summary="取得使用者角色列表")
async def get_user_roless(
    skip: int = 0,
    limit: int = 100,
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    取得使用者角色列表

    需要 user_roles.read 或 tenant_users.read 權限

    用途:
    - 系統管理員 (user_roles.read): 角色管理功能
    - 組織管理員 (tenant_users.read): 新增/編輯成員時選擇角色

    - **skip**: 略過筆數
    - **limit**: 限制筆數
    - **is_active**: 是否啟用 (可選)
    - **search**: 搜尋關鍵字 (角色中英文名稱)

    需要提供 Bearer Token 及 X-Txn-Token Header
    """
    query = db.query(UserRole)

    if is_active is not None:
        query = query.filter(UserRole.is_active == is_active)

    if search:
        query = query.filter(
            cast(UserRole.role_name, JSONB).cast(String).ilike(f"%{search}%")
        )

    roles = query.order_by(UserRole.id).offset(skip).limit(limit).all()

    return roles


@router.get("/{role_id}", response_model=UserRoleResponse, summary="取得使用者角色資訊")
async def get_user_roles(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    取得使用者角色資訊

    需要 user_roles 功能的 read 權限

    - **role_id**: 角色 ID

    需要提供 Bearer Token 及 X-Txn-Token Header
    """
    role = db.query(UserRole).filter(UserRole.id == role_id).first()

    if not role:
        raise_msg(status.HTTP_404_NOT_FOUND, "ERR020001", entity="使用者角色", id=role_id)

    return role


@router.post("/", response_model=UserRoleResponse, status_code=status.HTTP_201_CREATED, summary="建立使用者角色")
async def create_user_roles(
    role_data: UserRoleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    建立使用者角色

    需要 user_roles 功能的 create 權限

    需要提供 Bearer Token 及 X-Txn-Token Header
    """
    # Token 已驗證權限，不需要再次檢查

    # 檢查角色名稱是否已存在（以基礎語系 en 檢查）
    en_name = role_data.role_name.get('en', '')
    if en_name:
        existing = db.query(UserRole).filter(
            UserRole.role_name['en'].astext == en_name
        ).first()
    else:
        existing = None
    if existing:
        raise_msg(status.HTTP_400_BAD_REQUEST, "ERR020002", field="角色名稱", value=en_name)

    # 建立角色
    role = UserRole(
        **role_data.model_dump(),
        edit_by=current_user.id
    )

    db.add(role)
    db.commit()
    db.refresh(role)

    return role


@router.put("/{role_id}", response_model=UserRoleResponse, summary="更新使用者角色")
async def update_user_roles(
    role_id: int,
    role_data: UserRoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    更新使用者角色

    需要 user_roles 功能的 update 權限

    - **role_id**: 角色 ID

    需要提供 Bearer Token 及 X-Txn-Token Header
    """
    # Token 已驗證權限，不需要再次檢查

    # 查詢角色
    role = db.query(UserRole).filter(UserRole.id == role_id).first()
    if not role:
        raise_msg(status.HTTP_404_NOT_FOUND, "ERR020001", entity="使用者角色", id=role_id)

    # 保存原始資料用於日誌
    original_data = user_roles_to_dict(role)

    # 如果更新角色名稱，檢查是否重複（以基礎語系 en 檢查）
    if role_data.role_name:
        en_name = role_data.role_name.get('en', '')
        if en_name:
            existing = db.query(UserRole).filter(
                UserRole.id != role_id,
                UserRole.role_name['en'].astext == en_name
            ).first()
            if existing:
                raise_msg(status.HTTP_400_BAD_REQUEST, "ERR020002", field="角色名稱", value=en_name)

    # 更新欄位
    update_data = role_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(role, field, value)

    role.edit_by = current_user.id
    role.updated_at = func.now()

    db.commit()
    db.refresh(role)

    return role


@router.delete("/{role_id}", status_code=status.HTTP_204_NO_CONTENT, summary="刪除使用者角色")
async def delete_user_roles(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    刪除使用者角色（真正刪除）

    需要 user_roles 功能的 delete 權限
    此操作為一次性使用，Token 使用後立即失效

    - **role_id**: 角色 ID

    需要提供 Bearer Token 及 X-Txn-Token Header
    """
    # Token 已驗證權限，不需要再次檢查

    # 查詢角色
    role = db.query(UserRole).filter(UserRole.id == role_id).first()
    if not role:
        raise_msg(status.HTTP_404_NOT_FOUND, "ERR020001", entity="使用者角色", id=role_id)

    # 保存刪除前資料用於日誌
    deleted_data = user_roles_to_dict(role)

    # 檢查是否有使用者使用此角色（包含已停用的）
    # 使用 PostgreSQL JSONB 的 @> 操作符檢查是否包含該 role_id
    users_with_role = db.query(User).filter(
        User.user_role.op('@>')(cast([role_id], JSONB))
    ).count()

    if users_with_role > 0:
        raise_msg(status.HTTP_400_BAD_REQUEST, "ERR020007",
                  entity="使用者角色", id=role_id, count=users_with_role, relation="使用者")

    # 真正刪除
    db.delete(role)
    db.commit()

    return None
