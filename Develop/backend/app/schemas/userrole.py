"""
UserRole Schemas
使用者角色明細檔 API Schema
"""

from typing import Optional, Dict
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class UserRoleBase(BaseModel):
    """使用者角色基本資料"""
    role_name: Dict[str, str] = Field(default_factory=dict, description="角色名稱（多語系）")
    description: Optional[str] = Field(None, description="角色說明")
    is_mana: bool = Field(False, description="系統管理角色")
    is_active: bool = Field(True, description="啟用")


class UserRoleCreate(UserRoleBase):
    """建立使用者角色"""
    pass


class UserRoleUpdate(BaseModel):
    """更新使用者角色"""
    role_name: Optional[Dict[str, str]] = Field(None, description="角色名稱（多語系）")
    description: Optional[str] = Field(None)
    is_mana: Optional[bool] = Field(None)
    is_active: Optional[bool] = Field(None)


class UserRoleResponse(UserRoleBase):
    """使用者角色回應"""
    id: int
    edit_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
