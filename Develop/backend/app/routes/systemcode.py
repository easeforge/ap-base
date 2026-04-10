"""
SystemCode Routes
系統代碼相關路由
"""

import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.systemcode import SystemCode
from app.models.user import User
from app.schemas.systemcode import (
    SystemCodeResponse,
    SystemCodeCreate,
    SystemCodeUpdate,
    SystemCodeQuery
)
from app.services.systemcode_service import SystemCodeService

logger = logging.getLogger(__name__)
router = APIRouter()


def systemcode_to_dict(code: SystemCode) -> dict:
    """將系統代碼物件轉換為完整字典"""
    return {
        "id": code.id,
        "code_etype": code.code_etype,
        "code_ctype": code.code_ctype,
        "code": code.code,
        "code_cname": code.code_cname,
        "code_ename": code.code_ename,
        "order": code.order,
        "is_active": code.is_active,
        "note1": code.note1,
        "note2": code.note2,
        "note3": code.note3,
        "note4": code.note4,
        "note5": code.note5,
        "edit_by": code.edit_by,
        "created_at": code.created_at.isoformat() if code.created_at else None,
        "updated_at": code.updated_at.isoformat() if code.updated_at else None
    }


@router.get("/", response_model=List[SystemCodeResponse], summary="取得系統代碼列表")
async def get_system_codes(
    code_etype: str = None,
    code_ctype: str = None,
    code: str = None,
    code_cname: str = None,
    code_ename: str = None,
    is_active: bool = None,
    search: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    取得系統代碼列表

    需要 system_codes 功能的 read 權限

    - **code_etype**: 代碼類別英文名稱（模糊搜尋）
    - **code_ctype**: 代碼類別中文名稱（模糊搜尋）
    - **code**: 代碼編號（模糊搜尋）
    - **code_cname**: 代碼中文名稱（模糊搜尋）
    - **code_ename**: 代碼英文名稱（模糊搜尋）
    - **is_active**: 啟用狀態
    - **search**: 綜合搜尋（代碼類別、代碼編號、代碼名稱）

    需要提供 Bearer Token 及 X-Txn-Token Header
    """
    # Token 已驗證 read 權限

    query = SystemCodeQuery(
        code_etype=code_etype,
        code_ctype=code_ctype,
        code=code,
        code_cname=code_cname,
        code_ename=code_ename,
        is_active=is_active,
        search=search
    )

    codes = SystemCodeService.get_all(db, query)
    return codes


@router.get("/{code_id}", response_model=SystemCodeResponse, summary="取得系統代碼資訊")
async def get_system_code(
    code_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    取得系統代碼資訊

    需要 system_codes 功能的 read 權限

    - **code_id**: 系統代碼 ID

    需要提供 Bearer Token 及 X-Txn-Token Header
    """
    # Token 已驗證 read 權限

    code = SystemCodeService.get_by_id(db, code_id)
    if not code:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"找不到 ID 為 {code_id} 的系統代碼"
        )

    return code


@router.post("/", response_model=SystemCodeResponse, summary="建立系統代碼")
async def create_system_code(
    code_data: SystemCodeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    建立系統代碼

    需要 system_codes 功能的 create 權限

    需要提供 Bearer Token 及 X-Txn-Token Header
    """
    # Token 已驗證 create 權限

    try:
        new_code = SystemCodeService.create(db, code_data, current_user.id)
        return new_code
    except Exception as e:
        logger.error(f"[SystemCode] Create failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"建立系統代碼失敗: {str(e)}"
        )


@router.put("/{code_id}", response_model=SystemCodeResponse, summary="更新系統代碼")
async def update_system_code(
    code_id: int,
    code_data: SystemCodeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    更新系統代碼

    需要 system_codes 功能的 update 權限

    - **code_id**: 系統代碼 ID

    需要提供 Bearer Token 及 X-Txn-Token Header
    """
    # Token 已驗證 update 權限

    # 取得原始資料（用於日誌記錄）
    original_code = SystemCodeService.get_by_id(db, code_id)
    if not original_code:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"找不到 ID 為 {code_id} 的系統代碼"
        )

    try:
        updated_code = SystemCodeService.update(db, code_id, code_data, current_user.id)
        return updated_code
    except Exception as e:
        logger.error(f"[SystemCode] Update failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"更新系統代碼失敗: {str(e)}"
        )


@router.delete("/{code_id}", summary="刪除系統代碼")
async def delete_system_code(
    code_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    刪除系統代碼

    需要 system_codes 功能的 delete 權限
    此操作為一次性使用，Token 使用後立即失效

    - **code_id**: 系統代碼 ID

    需要提供 Bearer Token 及 X-Txn-Token Header
    """
    # Token 已驗證 delete 權限，且使用後立即失效

    # 取得原始資料（用於日誌記錄）
    original_code = SystemCodeService.get_by_id(db, code_id)
    if not original_code:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"找不到 ID 為 {code_id} 的系統代碼"
        )

    try:
        success = SystemCodeService.delete(db, code_id)
        if success:
            return {"message": "刪除成功"}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="刪除失敗"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[SystemCode] Delete failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"刪除系統代碼失敗: {str(e)}"
        )


@router.get("/type/{code_etype}", response_model=List[SystemCodeResponse], summary="根據代碼類別查詢")
async def get_system_codes_by_type(
    code_etype: str,
    code_ctype: str = None,
    active_only: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    根據代碼類別查詢系統代碼

    需要 system_codes 功能的 read 權限

    - **code_etype**: 代碼類別英文名稱
    - **code_ctype**: 代碼類別中文名稱（可選）
    - **active_only**: 只查詢啟用的代碼（預設: true）

    需要提供 Bearer Token 及 X-Txn-Token Header
    """
    # Token 已驗證 read 權限

    codes = SystemCodeService.get_by_type(db, code_etype, code_ctype, active_only)
    return codes
