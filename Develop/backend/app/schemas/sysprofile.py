"""
System Profile Schemas
系統設定相關資料結構
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class SysProfileBase(BaseModel):
    """系統設定基本資料"""
    is_service: bool
    sys_url: str
    sys_ctitle: str
    sys_etitle: str
    sys_ccopyright: str
    sys_ecopyright: str
    sys_organization: int
    sys_mana_email: str
    sys_timezone: str


class SysProfileResponse(SysProfileBase):
    """系統設定回應資料"""
    id: int
    edit_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class SysProfileUpdate(BaseModel):
    """更新系統設定請求"""
    is_service: Optional[bool] = None
    sys_url: Optional[str] = None
    sys_ctitle: Optional[str] = None
    sys_etitle: Optional[str] = None
    sys_ccopyright: Optional[str] = None
    sys_ecopyright: Optional[str] = None
    sys_organization: Optional[int] = None
    sys_mana_email: Optional[str] = None
    sys_timezone: Optional[str] = None
