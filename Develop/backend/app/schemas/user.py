"""
User Schemas
使用者相關的 Pydantic Schema
"""

from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, EmailStr


class UserBase(BaseModel):
    """使用者基本資訊"""

    account: EmailStr = Field(..., description="登入帳號 (電子郵件)")
    username: str = Field(..., description="使用者名稱")
    organization_id: int = Field(..., description="組織 ID")
    department: Optional[str] = Field(None, description="部門")
    job_title: Optional[str] = Field(None, description="職稱")
    phone: Optional[str] = Field(None, description="電話")
    user_role: List[int] = Field(default_factory=list, description="角色 ID 列表")
    is_active: bool = Field(default=True, description="啟用狀態")


class UserCreate(UserBase):
    """建立使用者"""

    password: str = Field(..., description="密碼", min_length=6)


class UserUpdate(BaseModel):
    """更新使用者"""

    username: Optional[str] = Field(None, description="使用者名稱")
    department: Optional[str] = Field(None, description="部門")
    job_title: Optional[str] = Field(None, description="職稱")
    phone: Optional[str] = Field(None, description="電話")
    user_role: Optional[List[int]] = Field(None, description="角色 ID 列表")
    is_active: Optional[bool] = Field(None, description="啟用狀態")


class UserResponse(UserBase):
    """使用者回應"""

    id: int = Field(..., description="使用者 ID")
    last_login_at: Optional[datetime] = Field(None, description="最後登入時間")
    last_login_ip: Optional[str] = Field(None, description="最後登入 IP")
    created_at: datetime = Field(..., description="建立時間")
    updated_at: Optional[datetime] = Field(None, description="更新時間")

    class Config:
        from_attributes = True


class PasswordChange(BaseModel):
    """密碼變更"""

    old_password: str = Field(..., description="舊密碼")
    new_password: str = Field(..., description="新密碼", min_length=6)


# 別名 (相容舊的 user_detail 命名)
UserDetailResponse = UserResponse
UserDetailCreate = UserCreate
UserDetailUpdate = UserUpdate


class UserProfile(BaseModel):
    """使用者個人資料"""

    id: int = Field(..., description="使用者 ID")
    account: str = Field(..., description="登入帳號")
    username: str = Field(..., description="使用者名稱")
    organization_id: int = Field(..., description="組織 ID")
    department: Optional[str] = Field(None, description="部門")
    job_title: Optional[str] = Field(None, description="職稱")
    phone: Optional[str] = Field(None, description="電話")
    user_role: List[int] = Field(..., description="角色 ID 列表")

    class Config:
        from_attributes = True
