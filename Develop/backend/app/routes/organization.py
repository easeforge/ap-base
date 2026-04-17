"""
Organization Routes
組織單位相關路由
"""

import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.sql import func

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.permissions import check_permission  # 保留用於資料層級安全控制
from app.core.message_codes import raise_msg
from app.models.organization import Organization
from app.models.user import User
from app.schemas.organization import OrganizationResponse, OrganizationCreate, OrganizationUpdate
from app.services.userlog_service import UserLogService

logger = logging.getLogger(__name__)
router = APIRouter()


def organization_to_dict(org: Organization) -> dict:
    """將組織單位物件轉換為完整字典"""
    return {
        "id": org.id,
        "org_code": org.org_code,
        "org_name": org.org_name,
        "org_type": org.org_type,
        "contact_person": org.contact_person,
        "contact_email": org.contact_email,
        "contact_phone": org.contact_phone,
        "address": org.address,
        "phone": org.phone,
        "is_mana": org.is_mana,
        "is_active": org.is_active,
        "memo": org.memo,
        "edit_by": org.edit_by,
        "created_at": org.created_at.isoformat() if org.created_at else None,
        "updated_at": org.updated_at.isoformat() if org.updated_at else None
    }


@router.get("/", response_model=List[OrganizationResponse], summary="取得組織單位列表")
async def get_organizations(
    skip: int = 0,
    limit: int = 100,
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    取得組織單位列表

    需要 organizations.read 或 tenant_profile.read 權限

    資料權限:
    - 系統管理員 (organizations.read): 可查看所有組織
    - 組織管理員 (tenant_profile.read): 只能查看自己的組織

    - **skip**: 略過筆數
    - **limit**: 限制筆數
    - **is_active**: 是否啟用 (可選)
    - **search**: 搜尋關鍵字 (組織代碼或名稱)

    需要提供 Bearer Token 及 X-Txn-Token Header
    """
    query = db.query(Organization)

    # 資料權限檢查:如果沒有完整的 organizations 權限,只能查看自己的組織
    has_full_permission = check_permission(db, current_user, "organizations", "read")
    if not has_full_permission:
        query = query.filter(Organization.id == current_user.organization_id)

    if is_active is not None:
        query = query.filter(Organization.is_active == is_active)

    if search:
        query = query.filter(
            (Organization.org_code.ilike(f"%{search}%")) |
            (Organization.org_name.ilike(f"%{search}%"))
        )

    organizations = query.order_by(Organization.id).offset(skip).limit(limit).all()

    return organizations


@router.get("/{organization_id}", response_model=OrganizationResponse, summary="取得組織單位資訊")
async def get_organization(
    organization_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    取得組織單位資訊

    只需要 Bearer Token（登入認證）

    此 API 用於首頁顯示使用者所屬組織資訊，不需要 transaction token
    因為這是登入後自動載入的基本資訊

    資料層級安全控制:一般使用者只能查看自己的組織

    - **organization_id**: 組織單位 ID

    需要提供 Bearer Token
    """
    # Token 已驗證 read 權限
    organization = db.query(Organization).filter(Organization.id == organization_id).first()

    if not organization:
        raise_msg(status.HTTP_404_NOT_FOUND, "ERR020001", entity="組織單位", id=organization_id)

    # 資料層級安全控制:檢查是否有權限查看此組織
    has_full_permission = check_permission(db, current_user, "organizations", "read")
    if not has_full_permission and organization.id != current_user.organization_id:
        raise_msg(status.HTTP_403_FORBIDDEN, "ERR020003", action="read organization", user_id=current_user.id)

    return organization


@router.post("/", response_model=OrganizationResponse, status_code=status.HTTP_201_CREATED, summary="建立組織單位")
async def create_organization(
    organization_data: OrganizationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    建立組織單位

    需要 organizations 功能的 create 權限

    需要提供 Bearer Token 及 X-Txn-Token Header
    """
    # Token 已驗證 create 權限，不需要再次檢查

    # 檢查組織代碼是否已存在
    existing = db.query(Organization).filter(Organization.org_code == organization_data.org_code).first()
    if existing:
        raise_msg(status.HTTP_400_BAD_REQUEST, "ERR020002", field="組織代碼", value=organization_data.org_code)

    # 建立組織單位
    organization = Organization(
        **organization_data.model_dump(),
        edit_by=current_user.id
    )

    db.add(organization)
    db.commit()
    db.refresh(organization)

    return organization


@router.put("/{organization_id}", response_model=OrganizationResponse, summary="更新組織單位")
async def update_organization(
    organization_id: int,
    organization_data: OrganizationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    更新組織單位

    需要 organizations.update 或 tenant_profile.update 權限

    資料權限:
    - 系統管理員 (organizations.update): 可更新任何組織
    - 組織管理員 (tenant_profile.update): 只能更新自己的組織

    - **organization_id**: 組織單位 ID

    需要提供 Bearer Token 及 X-Txn-Token Header
    """
    # 查詢組織單位
    organization = db.query(Organization).filter(Organization.id == organization_id).first()
    if not organization:
        raise_msg(status.HTTP_404_NOT_FOUND, "ERR020001", entity="組織單位", id=organization_id)

    # 資料權限檢查:如果沒有完整的 organizations 權限,只能更新自己的組織
    has_full_permission = check_permission(db, current_user, "organizations", "update")
    if not has_full_permission and organization_id != current_user.organization_id:
        raise_msg(status.HTTP_403_FORBIDDEN, "ERR020003", action="update organization", user_id=current_user.id)

    # 如果更新組織代碼，檢查是否重複
    if organization_data.org_code and organization_data.org_code != organization.org_code:
        existing = db.query(Organization).filter(
            Organization.org_code == organization_data.org_code,
            Organization.id != organization_id
        ).first()
        if existing:
            raise_msg(status.HTTP_400_BAD_REQUEST, "ERR020002", field="組織代碼", value=organization_data.org_code)

    # 更新組織單位資料
    update_data = organization_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(organization, field, value)

    organization.edit_by = current_user.id
    organization.updated_at = func.now()

    db.commit()
    db.refresh(organization)

    return organization


@router.delete("/{organization_id}", status_code=status.HTTP_204_NO_CONTENT, summary="刪除組織單位")
async def delete_organization(
    organization_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    刪除組織單位（真正刪除）

    需要 organizations 功能的 delete 權限
    此操作為一次性使用，Token 使用後立即失效

    - **organization_id**: 組織單位 ID

    需要提供 Bearer Token 及 X-Txn-Token Header
    """
    # Token 已驗證 delete 權限，且使用後立即失效

    # 查詢組織單位
    organization = db.query(Organization).filter(Organization.id == organization_id).first()
    if not organization:
        raise_msg(status.HTTP_404_NOT_FOUND, "ERR020001", entity="組織單位", id=organization_id)

    # 檢查是否有使用者使用此組織（包含已停用的）
    users_count = db.query(User).filter(
        User.organization_id == organization_id
    ).count()

    if users_count > 0:
        raise_msg(status.HTTP_400_BAD_REQUEST, "ERR020007",
                  entity="組織單位", id=organization_id, count=users_count, relation="使用者")

    # 真正刪除
    db.delete(organization)
    db.commit()

    return None


# ============================================================
# 便捷端點 (tenant_profile) - 組織管理員使用
# ============================================================

@router.get("/me/profile", response_model=OrganizationResponse, summary="取得我的組織資料 (便捷端點)")
async def get_my_organization_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    取得我的組織資料 (便捷端點)

    需要 tenant_profile.read 權限

    路由: GET /api/organizations/me/profile
    自動使用 current_user.organization_id，不需要在 URL 中傳遞組織 ID

    需要提供 Bearer Token 及 X-Txn-Token Header
    """
    organization = db.query(Organization).filter(
        Organization.id == current_user.organization_id
    ).first()

    if not organization:
        raise_msg(status.HTTP_404_NOT_FOUND, "ERR020001", entity="組織", id=current_user.organization_id)

    return organization


@router.put("/me/profile", response_model=OrganizationResponse, summary="更新我的組織資料 (便捷端點)")
async def update_my_organization_profile(
    organization_data: OrganizationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    更新我的組織資料 (便捷端點)

    需要 tenant_profile.update 權限

    路由: PUT /api/organizations/me/profile
    自動使用 current_user.organization_id，不需要在 URL 中傳遞組織 ID
    不需要額外的資料權限檢查，因為只能更新自己的組織

    需要提供 Bearer Token 及 X-Txn-Token Header
    """
    # 查詢當前使用者的組織
    organization = db.query(Organization).filter(
        Organization.id == current_user.organization_id
    ).first()

    if not organization:
        raise_msg(status.HTTP_404_NOT_FOUND, "ERR020001", entity="組織", id=current_user.organization_id)

    # 如果更新組織代碼，檢查是否重複
    if organization_data.org_code and organization_data.org_code != organization.org_code:
        existing = db.query(Organization).filter(
            Organization.org_code == organization_data.org_code,
            Organization.id != current_user.organization_id
        ).first()
        if existing:
            raise_msg(status.HTTP_400_BAD_REQUEST, "ERR020002", field="組織代碼", value=organization_data.org_code)

    # 更新組織資料
    update_data = organization_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(organization, field, value)

    organization.edit_by = current_user.id
    organization.updated_at = func.now()

    db.commit()
    db.refresh(organization)

    return organization
