"""
Permission Check
權限檢查工具

兩階段權限驗證架構:
階段 1 (Redis): 從 Session 的 authorized_function_ids 檢查使用者是否有功能權限
階段 2 (Database): 從 role_rights 檢查使用者是否有特定操作權限，並查詢 module_item

使用範例:
    # 方式 1: 直接呼叫
    result = check_permission_and_manage_token(db, current_user, "organizations", "create")
    txn_token = result["txn_token"]
    module_item = result["module_item"]  # 該功能的可設定權限項目

    # 方式 2: 使用裝飾器
    @require_permission("organizations", "create")
    async def create_organization(db, current_user):
        # current_user.current_txn_token 已自動設定
        # current_user.current_module_item 已自動設定
        ...
"""

import logging
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.roleright import RoleRight
from app.models.user import User
from app.models.systemfunction import SystemFunction

logger = logging.getLogger(__name__)


def check_permission(
    db: Session,
    user: User,
    func_code: str,
    permission_type: str
) -> bool:
    """
    檢查使用者是否擁有特定功能的特定權限

    Args:
        db: 資料庫 Session
        user: 使用者物件
        func_code: 功能代碼
        permission_type: 權限類型 (create/read/update/delete/print/file)

    Returns:
        bool: 是否有權限
    """
    # 取得使用者的所有角色ID（優先使用 session 中的角色，確保即時權限）
    session_roles = getattr(user, '_session_role_ids', None)
    role_ids: List[int] = session_roles if session_roles else (user.user_role if isinstance(user.user_role, list) else [])

    if not role_ids:
        return False

    # 查詢該使用者的角色是否有此功能的權限
    permission_field = f"is_{permission_type.lower()}"

    rights = db.query(RoleRight).filter(
        RoleRight.user_role_id.in_(role_ids),
        RoleRight.func_code == func_code
    ).all()

    # 只要有任一角色擁有權限即可
    for right in rights:
        if getattr(right, permission_field, False):
            return True

    return False


def check_permission_and_manage_token(
    db: Session,
    user: User,
    func_code: str,
    permission_type: str
) -> dict:
    """
    檢查權限並自動管理 Transaction Token（兩階段驗證）

    階段 1 (Redis): 檢查使用者是否有功能權限
    階段 2 (Database): 查詢 module_item 確認具體可執行的操作

    Args:
        db: 資料庫 Session
        user: 使用者物件
        func_code: 功能代碼
        permission_type: 權限類型

    Returns:
        dict: {
            "txn_token": str,              # Transaction Token
            "module_item": list,           # 該功能可設定的權限項目
            "has_permission": bool         # 是否有指定的權限
        }

    Raises:
        HTTPException: 403 無權限 或 404 功能不存在
    """
    # 1. 階段一：Redis 檢查功能權限
    # 從 Session 的 authorized_function_ids 檢查是否有該功能的 read 權限
    has_function_access = check_permission(db, user, func_code, "read")

    if not has_function_access:
        logger.warning(
            f"使用者 {user.id} ({user.username}) 無功能存取權: {func_code}"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"無權限存取功能: {func_code}"
        )

    # 2. 取得 system_functions 資料
    system_function = db.query(SystemFunction).filter(
        SystemFunction.func_code == func_code
    ).first()

    if not system_function:
        logger.error(f"找不到功能: {func_code}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"功能不存在: {func_code}"
        )

    # 3. 階段二：Database 檢查具體權限
    # 從 role_rights 檢查是否有指定的操作權限
    has_specific_permission = check_permission(db, user, func_code, permission_type)

    if not has_specific_permission:
        logger.warning(
            f"使用者 {user.id} ({user.username}) 無操作權限: {func_code}.{permission_type}"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"無權限執行此操作: {func_code} - {permission_type}"
        )

    # 4. 回傳完整資訊
    return {
        "module_item": system_function.module_item or [],
        "has_permission": has_specific_permission
    }


def require_permission(func_code: str, permission_type: str):
    """
    權限檢查裝飾器（自動管理 Transaction Token）

    使用範例:
    @router.post("/organizations")
    @require_permission("organizations", "create")
    async def create_organization(...):
        ...

    Args:
        func_code: 功能代碼
        permission_type: 權限類型 (create/read/update/delete/print/file)

    Raises:
        HTTPException: 401 未授權 或 403 無權限
    """
    def decorator(func):
        async def wrapper(*args, **kwargs):
            db: Session = kwargs.get('db')
            current_user: User = kwargs.get('current_user')

            if not db or not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="未授權"
                )

            # 檢查權限並自動管理 Transaction Token
            permission_result = check_permission_and_manage_token(
                db, current_user, func_code, permission_type
            )

            # 將 module_item 附加到 user 物件上（供 API 使用）
            current_user.current_module_item = permission_result.get("module_item", [])

            return await func(*args, **kwargs)

        return wrapper
    return decorator
