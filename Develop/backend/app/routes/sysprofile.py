"""
System Profile Routes
系統設定相關路由
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.sql import func

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.permissions import check_permission
from app.models.sysprofile import SysProfile
from app.models.user import User
from app.schemas.sysprofile import SysProfileResponse, SysProfileUpdate
from app.services.userlog_service import UserLogService

logger = logging.getLogger(__name__)
router = APIRouter()


def sys_profile_to_dict(profile: SysProfile) -> dict:
    """將 SysProfile 物件轉換為完整資料字典"""
    return {
        "id": profile.id,
        "is_service": profile.is_service,
        "sys_url": profile.sys_url,
        "sys_title": profile.sys_title,
        "sys_copyright": profile.sys_copyright,
        "sys_organization": profile.sys_organization,
        "sys_mana_email": profile.sys_mana_email,
        "sys_timezone": profile.sys_timezone,
        "login_bg": profile.login_bg,
        "color_theme": profile.color_theme,
        "edit_by": profile.edit_by,
        "created_at": profile.created_at.isoformat() if profile.created_at else None,
        "updated_at": profile.updated_at.isoformat() if profile.updated_at else None
    }


@router.get("/", response_model=SysProfileResponse, summary="取得系統設定")
async def get_sys_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    取得系統設定（id=1）

    需要提供 Bearer Token（所有已登入使用者都可讀取）
    """
    # 系統基本資料不需要權限檢查,所有登入使用者都可以讀取
    logger.info(f"使用者 {current_user.id} 正在讀取系統設定")

    profile = db.query(SysProfile).filter(SysProfile.id == 1).first()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="系統設定不存在"
        )

    return profile


@router.put("/", response_model=SysProfileResponse, summary="更新系統設定")
async def update_sys_profile(
    profile_data: SysProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    更新系統設定（id=1）

    需要 sys_profile 功能的 update 權限

    需要提供 Bearer Token 及 X-Txn-Token Header
    """
    # Token 已驗證 update 權限

    # 查詢系統設定
    profile = db.query(SysProfile).filter(SysProfile.id == 1).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="系統設定不存在"
        )

    # 保存原始資料用於日誌
    original_data = sys_profile_to_dict(profile)

    # 驗證時區（如有變更）
    if profile_data.sys_timezone is not None:
        from app.core.timezone import update_timezone
        try:
            update_timezone(profile_data.sys_timezone)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"無效的時區設定: {profile_data.sys_timezone}"
            )

    # 更新欄位
    update_data = profile_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)

    profile.edit_by = current_user.id
    profile.updated_at = func.now()

    db.commit()
    db.refresh(profile)

    # 若語系設定有變更，觸發語系檔同步
    if 'sys_languages' in update_data:
        try:
            from app.services.language_service import LanguageService
            sync_results = LanguageService.sync_locale_files(db)
            logger.info(f"語系檔同步完成: {sync_results}")
        except Exception as e:
            logger.error(f"語系檔同步失敗: {e}")

    return profile
