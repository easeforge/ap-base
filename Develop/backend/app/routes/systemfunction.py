"""
System Function Routes
系統功能設定相關路由（正名化版本）
"""

import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import cast, String
from sqlalchemy.dialects.postgresql import JSONB

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.systemfunction import SystemFunction
from app.models.user import User
from app.schemas.systemfunction import (
    SystemFunctionResponse,
    SystemFunctionCreate,
    SystemFunctionUpdate,
    SystemFunctionTreeNode
)
from app.services.userlog_service import UserLogService

logger = logging.getLogger(__name__)
router = APIRouter()


def system_function_to_dict(func: SystemFunction) -> dict:
    """將 SystemFunction 物件轉換為完整資料字典"""
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


def build_tree(functions: List[SystemFunction], parent_id: int = 0) -> List[dict]:
    """建立樹狀結構"""
    tree = []
    for func in functions:
        if func.upper_func_id == parent_id:
            node = system_function_to_dict(func)
            children = build_tree(functions, func.id)
            if children:
                node['children'] = children
            tree.append(node)
    return tree


@router.get("/", response_model=List[SystemFunctionResponse], summary="取得系統功能列表")
async def get_functions(
    skip: int = 0,
    limit: int = 1000,
    is_active: Optional[bool] = None,
    func_type: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    取得系統功能列表（用於前端初始化）

    只需要 Bearer Token（登入認證）

    此 API 用於前端載入功能列表，不需要 transaction token
    前端會在首頁自動呼叫此 API 來顯示可用功能

    需要提供 Bearer Token
    """
    query = db.query(SystemFunction)

    if is_active is not None:
        query = query.filter(SystemFunction.is_active == is_active)

    if func_type is not None:
        query = query.filter(SystemFunction.func_type == func_type)

    if search:
        query = query.filter(
            (SystemFunction.func_code.ilike(f"%{search}%")) |
            (cast(SystemFunction.func_name, JSONB).cast(String).ilike(f"%{search}%"))
        )

    functions = query.order_by(SystemFunction.func_order).offset(skip).limit(limit).all()

    return functions


@router.get("/tree", response_model=List[SystemFunctionTreeNode], summary="取得系統功能樹狀結構")
async def get_functions_tree(
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    取得系統功能樹狀結構（用於選單顯示）

    只需要 Bearer Token（登入認證）

    此 API 用於前端載入選單，不需要 transaction token
    因為這是在使用者登入後立即執行的，還沒有進入任何功能頁面

    需要提供 Bearer Token
    """
    query = db.query(SystemFunction)

    if is_active is not None:
        query = query.filter(SystemFunction.is_active == is_active)

    functions = query.order_by(SystemFunction.func_order).all()

    # 建立樹狀結構
    tree = build_tree(functions, parent_id=0)

    return tree


@router.get("/by-code/{func_code}", response_model=SystemFunctionResponse, summary="根據 func_code 取得系統功能資訊")
async def get_function_by_code(
    func_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    根據 func_code 取得系統功能資訊（包含 module_item）

    需要 system_functions 功能的 read 權限

    此 API 用於前端頁面初始化時取得功能的 module_item
    module_item 定義了該功能的基本要求（應該提供哪些操作項目）

    前端使用範例:
    ```typescript
    const functionInfo = await api.getSystemFunctionByCode("organizations");
    // functionInfo.module_item = ["create", "read", "update", "delete"]
    ```

    需要提供 Bearer Token 及 X-Txn-Token Header
    """
    function = db.query(SystemFunction).filter(SystemFunction.func_code == func_code).first()
    if not function:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"找不到系統功能: {func_code}"
        )

    return function


@router.get("/{function_id}", response_model=SystemFunctionResponse, summary="取得系統功能資訊")
async def get_function(
    function_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    取得系統功能資訊

    需要 system_functions 功能的 read 權限

    需要提供 Bearer Token 及 X-Txn-Token Header
    """
    function = db.query(SystemFunction).filter(SystemFunction.id == function_id).first()
    if not function:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="找不到系統功能")

    return function


@router.post("/", response_model=SystemFunctionResponse, status_code=status.HTTP_201_CREATED, summary="建立系統功能")
async def create_function(
    function_data: SystemFunctionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    建立系統功能

    需要 system_functions 功能的 create 權限

    需要提供 Bearer Token 及 X-Txn-Token Header
    """
    # Token 已驗證 create 權限，不需要再次檢查

    # 檢查 func_code 是否已存在
    existing = db.query(SystemFunction).filter(SystemFunction.func_code == function_data.func_code).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="功能代碼已存在")

    # 建立新功能
    new_function = SystemFunction(
        **function_data.model_dump(),
        edit_by=current_user.id
    )

    db.add(new_function)
    db.commit()
    db.refresh(new_function)

    # 記錄日誌
    log_service = UserLogService()
    func_id = log_service.get_function_id_by_code(db, "system_functions")
    if func_id:
        log_service.log_create(db, current_user.id, func_id, system_function_to_dict(new_function))

    return new_function


@router.put("/{function_id}", response_model=SystemFunctionResponse, summary="更新系統功能")
async def update_function(
    function_id: int,
    function_data: SystemFunctionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    更新系統功能

    需要 system_functions 功能的 update 權限

    需要提供 Bearer Token 及 X-Txn-Token Header
    """
    # Token 已驗證 update 權限，不需要再次檢查

    function = db.query(SystemFunction).filter(SystemFunction.id == function_id).first()
    if not function:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="找不到系統功能")

    # 保存原始資料用於日誌
    original_data = system_function_to_dict(function)

    # 檢查 func_code 是否重複
    if function_data.func_code and function_data.func_code != function.func_code:
        existing = db.query(SystemFunction).filter(SystemFunction.func_code == function_data.func_code).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="功能代碼已存在")

    # 更新資料
    update_data = function_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(function, field, value)
    function.edit_by = current_user.id

    db.commit()
    db.refresh(function)

    # 記錄日誌
    updated_data = system_function_to_dict(function)
    log_service = UserLogService()
    func_id = log_service.get_function_id_by_code(db, "system_functions")
    if func_id:
        log_service.log_update(db, current_user.id, func_id, original_data, updated_data)

    return function


@router.delete("/{function_id}", status_code=status.HTTP_204_NO_CONTENT, summary="刪除系統功能")
async def delete_function(
    function_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    刪除系統功能

    需要 system_functions 功能的 delete 權限
    此操作為一次性使用，Token 使用後立即失效

    需要提供 Bearer Token 及 X-Txn-Token Header
    """
    # Token 已驗證 delete 權限，且使用後立即失效

    function = db.query(SystemFunction).filter(SystemFunction.id == function_id).first()
    if not function:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="找不到系統功能")

    # 檢查是否有子功能
    children = db.query(SystemFunction).filter(SystemFunction.upper_func_id == function_id).count()
    if children > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="此功能下還有子功能，無法刪除"
        )

    # 檢查是否有角色權限參照此功能
    from app.models.roleright import RoleRight
    role_rights_count = db.query(RoleRight).filter(RoleRight.system_function_id == function_id).count()
    if role_rights_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"此功能已被 {role_rights_count} 個角色使用，無法刪除。請先移除角色權限設定。"
        )

    # 保存刪除前資料用於日誌
    deleted_data = system_function_to_dict(function)

    db.delete(function)
    db.commit()

    # 記錄日誌
    log_service = UserLogService()
    func_id = log_service.get_function_id_by_code(db, "system_functions")
    if func_id:
        log_service.log_delete(db, current_user.id, func_id, deleted_data)

    return None
