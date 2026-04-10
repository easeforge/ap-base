"""
Organization Schemas
組織單位相關資料結構
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class OrganizationBase(BaseModel):
    """組織單位基本資料"""
    org_code: str
    org_name: str
    org_type: int
    contact_person: str
    contact_email: str
    contact_phone: str
    address: Optional[str] = None
    phone: Optional[str] = None
    is_mana: bool = False
    is_active: bool = True
    memo: Optional[str] = None


class OrganizationResponse(OrganizationBase):
    """組織單位回應資料"""
    id: int
    edit_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class OrganizationCreate(OrganizationBase):
    """建立組織單位請求"""
    pass


class OrganizationUpdate(BaseModel):
    """更新組織單位請求"""
    org_code: Optional[str] = None
    org_name: Optional[str] = None
    org_type: Optional[int] = None
    contact_person: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    is_mana: Optional[bool] = None
    is_active: Optional[bool] = None
    memo: Optional[str] = None
