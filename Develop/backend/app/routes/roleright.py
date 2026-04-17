"""
Role Right Routes
角色權限設定相關路由
"""

import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.message_codes import raise_msg
from app.models.roleright import RoleRight
from app.models.userrole import UserRole
from app.models.systemfunction import SystemFunction
from app.models.user import User
from app.schemas.roleright import (
    RoleRightResponse,
    RoleRightBatchCreate,
    FunctionWithPermissions,
    RoleRightsDetail
)
from app.services.userlog_service import UserLogService

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/functions", response_model=List[FunctionWithPermissions], summary="取得功能清單與可用權限")
async def get_functions_with_permissions(
    role_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    取得所有已啟用功能及其支援的權限項目

    需要 role_rights 功能的 read 權限

    - 回傳所有 is_active=true 的功能
    - 依 func_order 排序
    - 包含每個功能的 available_permissions
    - 若提供 role_id 且該角色為非系統管理角色(is_mana=false),則過濾掉系統管理功能(is_mana=true)

    需要提供 Bearer Token 及 X-Txn-Token Header
    """
    # Token 已驗證 read 權限

    # 查詢功能清單
    query = db.query(SystemFunction).filter(SystemFunction.is_active == True)

    # 如果提供 role_id,檢查角色是否為系統管理角色
    if role_id:
        role = db.query(UserRole).filter(UserRole.id == role_id).first()
        if role and not role.is_mana:
            # 非系統管理角色,過濾掉系統管理功能
            query = query.filter(SystemFunction.is_mana == False)

    functions = query.order_by(SystemFunction.func_order).all()

    result = []
    for func in functions:
        # 判斷每個權限是否可用
        # 節點類型 (func_type=1) 不應該有任何權限項目
        if func.func_type == 1:
            available_permissions = {
                "create": False,
                "read": False,
                "update": False,
                "delete": False,
                "print": False,
                "file": False,
            }
        else:
            # 功能類型 (func_type=2) 根據 module_item 決定可用權限
            available_permissions = {
                "create": "Create" in func.module_item,
                "read": "Read" in func.module_item,
                "update": "Update" in func.module_item,
                "delete": "Delete" in func.module_item,
                "print": "Print" in func.module_item,
                "file": "File" in func.module_item,
            }

        result.append(FunctionWithPermissions(
            id=func.id,
            func_code=func.func_code,
            func_name=func.func_name,
            func_type=func.func_type,
            func_order=func.func_order,
            upper_func_id=func.upper_func_id,
            module_item=func.module_item,
            available_permissions=available_permissions
        ))

    return result


@router.get("/{role_id}", response_model=RoleRightsDetail, summary="取得角色權限設定")
async def get_role_rights(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    取得指定角色的權限設定

    需要 role_rights 功能的 read 權限

    Args:
        role_id: 角色ID

    Returns:
        角色權限詳情，包含角色資訊與權限列表

    需要提供 Bearer Token 及 X-Txn-Token Header
    """
    # Token 已驗證 read 權限
    # 檢查角色是否存在
    role = db.query(UserRole).filter(UserRole.id == role_id).first()
    if not role:
        raise_msg(status.HTTP_404_NOT_FOUND, "ERR020001", entity="角色", id=role_id)

    # 查詢權限設定
    rights = db.query(RoleRight).filter(
        RoleRight.user_role_id == role_id
    ).all()

    # 整理權限資料
    permission_list = []
    for right in rights:
        permission_list.append(RoleRightResponse(
            id=right.id,
            user_role_id=right.user_role_id,
            system_function_id=right.system_function_id,
            func_code=right.func_code,
            is_create=right.is_create,
            is_read=right.is_read,
            is_update=right.is_update,
            is_delete=right.is_delete,
            is_print=right.is_print,
            is_file=right.is_file,
            edit_by=right.edit_by,
            created_at=right.created_at,
            updated_at=right.updated_at
        ))

    return RoleRightsDetail(
        role_id=role.id,
        role_name=role.role_name,
        rights=permission_list
    )


@router.post("/{role_id}", status_code=status.HTTP_200_OK, summary="儲存角色權限設定")
async def save_role_rights(
    role_id: int,
    batch_data: RoleRightBatchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    批次儲存角色權限設定

    需要 role_rights 功能的 update 權限

    - 先刪除該角色的所有現有權限
    - 再批次新增傳入的權限設定

    Args:
        role_id: 角色ID
        batch_data: 包含權限列表的資料

    Returns:
        儲存結果訊息

    需要提供 Bearer Token 及 X-Txn-Token Header
    """
    # Token 已驗證 update 權限
    # 檢查角色是否存在
    role = db.query(UserRole).filter(UserRole.id == role_id).first()
    if not role:
        raise_msg(status.HTTP_404_NOT_FOUND, "ERR020001", entity="角色", id=role_id)

    try:
        # 1. 刪除現有權限
        db.query(RoleRight).filter(RoleRight.user_role_id == role_id).delete()

        # 2. 批次新增新權限（只儲存至少有一個權限為 true 的記錄）
        for right_data in batch_data.rights:
            # 驗證 system_function_id 是否存在
            func = db.query(SystemFunction).filter(
                SystemFunction.id == right_data.system_function_id
            ).first()

            if not func:
                logger.warning(f"找不到功能ID: {right_data.system_function_id}")
                continue

            # 檢查是否至少有一個權限為 true
            has_any_permission = (
                right_data.is_create or
                right_data.is_read or
                right_data.is_update or
                right_data.is_delete or
                right_data.is_print or
                right_data.is_file
            )

            # 只儲存有權限的記錄，避免無意義的資料
            if not has_any_permission:
                logger.debug(
                    f"跳過無權限記錄: role_id={role_id}, "
                    f"func_id={right_data.system_function_id}, "
                    f"func_code={right_data.func_code}"
                )
                continue

            new_right = RoleRight(
                user_role_id=role_id,
                system_function_id=right_data.system_function_id,
                func_code=right_data.func_code,
                is_create=right_data.is_create,
                is_read=right_data.is_read,
                is_update=right_data.is_update,
                is_delete=right_data.is_delete,
                is_print=right_data.is_print,
                is_file=right_data.is_file,
                edit_by=current_user.id
            )
            db.add(new_right)

        # 3. Commit 權限變更（不包含日誌，日誌由前端獨立發送）
        db.commit()

        # 4. 更新所有使用該角色的使用者的 Session 授權功能
        try:
            from app.models.user import User
            from app.services.session_service import SessionService

            # 找出所有擁有此角色的使用者
            users_with_role = db.query(User).filter(
                User.user_role.contains([role_id])
            ).all()

            updated_sessions = 0
            for user in users_with_role:
                # 取得該使用者目前所有角色的權限
                all_role_ids = user.user_role if isinstance(user.user_role, list) else []

                # 重新計算授權功能 IDs
                role_rights = db.query(RoleRight).filter(
                    RoleRight.user_role_id.in_(all_role_ids),
                    RoleRight.is_read == True
                ).all()

                authorized_function_ids = list(set([
                    rr.system_function_id for rr in role_rights if rr.system_function_id
                ]))

                # 更新該使用者的所有 Session
                count = SessionService.update_user_sessions_authorized_functions(
                    user_id=user.id,
                    authorized_function_ids=authorized_function_ids
                )
                updated_sessions += count

            if updated_sessions > 0:
                logger.info(
                    f"角色 {role_id} 權限更新，已同步更新 {updated_sessions} 個使用者 Session"
                )

        except Exception as e:
            # Session 更新失敗不影響權限儲存
            logger.error(f"更新使用者 Sessions 失敗: {e}")

        return {
            "message": "權限設定已儲存",
            "role_id": role_id,
            "rights_count": len(batch_data.rights),
            "updated_sessions": updated_sessions if 'updated_sessions' in locals() else 0
        }

    except Exception as e:
        db.rollback()
        logger.error(f"儲存角色權限失敗: {str(e)}")
        raise_msg(status.HTTP_500_INTERNAL_SERVER_ERROR, "ERR020004", operation="儲存角色權限", detail=str(e))


@router.delete("/{role_id}", status_code=status.HTTP_200_OK, summary="刪除角色權限設定")
async def delete_role_rights(
    role_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    刪除指定角色的所有權限設定

    需要 role_rights 功能的 delete 權限
    此操作為一次性使用，Token 使用後立即失效

    Args:
        role_id: 角色ID

    Returns:
        刪除結果訊息

    需要提供 Bearer Token 及 X-Txn-Token Header
    """
    # Token 已驗證 delete 權限，且使用後立即失效
    # 保存刪除前資料用於日誌
    rights = db.query(RoleRight).filter(
        RoleRight.user_role_id == role_id
    ).all()
    deleted_data = {
        "role_id": role_id,
        "rights_count": len(rights),
        "rights": [
            {
                "id": right.id,
                "system_function_id": right.system_function_id,
                "func_code": right.func_code,
                "is_create": right.is_create,
                "is_read": right.is_read,
                "is_update": right.is_update,
                "is_delete": right.is_delete,
                "is_print": right.is_print,
                "is_file": right.is_file
            } for right in rights
        ]
    }

    deleted_count = db.query(RoleRight).filter(
        RoleRight.user_role_id == role_id
    ).delete()

    db.commit()

    return {
        "message": "權限設定已刪除",
        "deleted_count": deleted_count
    }
