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


@router.get("/", response_model=List[SystemCodeResponse], summary="取得系統代碼列表")
async def get_system_codes(
    code_type: str = None,
    code: str = None,
    is_active: bool = None,
    search: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    取得系統代碼列表

    - **code_type**: 代碼類別識別碼（模糊搜尋）
    - **code**: 代碼編號（模糊搜尋）
    - **is_active**: 啟用狀態
    - **search**: 綜合搜尋（代碼類別、代碼編號、各語系名稱、note1~5）
    """
    query = SystemCodeQuery(
        code_type=code_type,
        code=code,
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
    """取得系統代碼資訊"""
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
    """建立系統代碼"""
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
    """更新系統代碼"""
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
    """刪除系統代碼"""
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


@router.get("/type/{code_type}", response_model=List[SystemCodeResponse], summary="根據代碼類別查詢")
async def get_system_codes_by_type(
    code_type: str,
    active_only: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    根據代碼類別查詢系統代碼

    - **code_type**: 代碼類別識別碼（精確匹配）
    - **active_only**: 只查詢啟用的代碼（預設 true）
    """
    codes = SystemCodeService.get_by_type(db, code_type, active_only)
    return codes
