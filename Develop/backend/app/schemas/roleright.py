"""
Role Right Schemas
角色權限設定相關資料驗證（新版）
"""

from typing import Any, List, Optional, Dict
from pydantic import BaseModel, Field
from datetime import datetime


class RoleRightBase(BaseModel):
    """角色權限基本資料"""
    system_function_id: int = Field(..., description="功能編號")
    func_code: str = Field(..., max_length=200, description="功能代碼")
    is_create: bool = Field(False, description="新增權限")
    is_read: bool = Field(False, description="讀取權限")
    is_update: bool = Field(False, description="修改權限")
    is_delete: bool = Field(False, description="刪除權限")
    is_print: bool = Field(False, description="列印權限")
    is_file: bool = Field(False, description="檔案權限")


class RoleRightCreate(RoleRightBase):
    """建立角色權限"""
    pass


class RoleRightBatchCreate(BaseModel):
    """批次建立角色權限"""
    rights: List[RoleRightCreate] = Field(..., description="權限設定列表")


class RoleRightResponse(RoleRightBase):
    """角色權限回應"""
    id: int
    user_role_id: int
    edit_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class FunctionWithPermissions(BaseModel):
    """功能及其可用權限"""
    id: int
    func_code: str
    func_name: Any
    func_type: int
    func_order: int
    upper_func_id: int
    module_item: List[str]
    available_permissions: Dict[str, bool] = Field(
        description="可用權限 {create, read, update, delete, print, file}"
    )


class RoleRightsDetail(BaseModel):
    """角色權限詳情"""
    role_id: int
    role_name: Any
    rights: List[RoleRightResponse]
