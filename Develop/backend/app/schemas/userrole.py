"""
User Role Schemas
使用者角色明細檔 API Schema（新版）
"""

from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field


class UserRoleBase(BaseModel):
    """使用者角色基本資料"""
    role_cname: str = Field(..., max_length=200, description="角色中文名稱")
    role_ename: str = Field(..., max_length=200, description="角色英文名稱")
    description: Optional[str] = Field(None, description="角色說明")
    is_mana: bool = Field(False, description="是否為系統管理角色")
    is_active: bool = Field(True, description="是否啟用")


class UserRoleCreate(UserRoleBase):
    """建立使用者角色"""
    pass


class UserRoleUpdate(BaseModel):
    """更新使用者角色（所有欄位可選）"""
    role_cname: Optional[str] = Field(None, max_length=200, description="角色中文名稱")
    role_ename: Optional[str] = Field(None, max_length=200, description="角色英文名稱")
    description: Optional[str] = Field(None, description="角色說明")
    is_mana: Optional[bool] = Field(None, description="是否為系統管理角色")
    is_active: Optional[bool] = Field(None, description="是否啟用")


class UserRoleResponse(UserRoleBase):
    """使用者角色回應資料"""
    id: int
    edit_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
