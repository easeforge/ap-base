"""
Permissions Routes
權限查詢相關路由
"""

import logging
from typing import Dict
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.roleright import RoleRight
from app.models.systemfunction import SystemFunction
from app.models.user import User
from app.services.userlog_service import UserLogService

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/me", summary="取得當前使用者的所有權限")
async def get_my_permissions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Dict[str, bool]]:
    """
    取得當前使用者的所有功能權限

    回傳格式:
    {
        "sys_profile": {
            "is_create": true,
            "is_read": true,
            "is_update": true,
            "is_delete": false,
            "is_print": false,
            "is_file": false
        },
        "organizations": {
            ...
        }
    }
    """
    # 取得使用者的所有角色ID
    user_role_ids = current_user.user_role if isinstance(current_user.user_role, list) else []

    if not user_role_ids:
        return {}

    # 查詢使用者所有角色的權限設定，JOIN system_functions 取得正確的 func_code
    rights = db.query(RoleRight, SystemFunction).join(
        SystemFunction,
        RoleRight.system_function_id == SystemFunction.id
    ).filter(
        RoleRight.user_role_id.in_(user_role_ids),
        SystemFunction.is_active == True  # 只查詢啟用的功能
    ).all()

    # 建立權限字典 (以 func_code 為 key,採用 OR 邏輯合併多角色權限)
    permissions: Dict[str, Dict[str, bool]] = {}

    for right, func in rights:
        func_code = func.func_code  # 使用 system_functions.func_code

        if func_code not in permissions:
            permissions[func_code] = {
                "is_create": False,
                "is_read": False,
                "is_update": False,
                "is_delete": False,
                "is_print": False,
                "is_file": False
            }

        # OR 邏輯:任一角色有權限即為 True
        permissions[func_code]["is_create"] = permissions[func_code]["is_create"] or right.is_create
        permissions[func_code]["is_read"] = permissions[func_code]["is_read"] or right.is_read
        permissions[func_code]["is_update"] = permissions[func_code]["is_update"] or right.is_update
        permissions[func_code]["is_delete"] = permissions[func_code]["is_delete"] or right.is_delete
        permissions[func_code]["is_print"] = permissions[func_code]["is_print"] or right.is_print
        permissions[func_code]["is_file"] = permissions[func_code]["is_file"] or right.is_file

    return permissions
