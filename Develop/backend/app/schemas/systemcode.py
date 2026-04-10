"""
SystemCode Schemas
系統代碼相關資料結構
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class SystemCodeBase(BaseModel):
    """系統代碼基本資料"""
    code_etype: str = Field(..., max_length=100, description="代碼類別英文名稱")
    code_ctype: str = Field(..., max_length=200, description="代碼類別中文名稱")
    code: str = Field(..., max_length=50, description="代碼編號")
    code_cname: str = Field(..., max_length=300, description="代碼中文名稱")
    code_ename: Optional[str] = Field(None, max_length=300, description="代碼英文名稱")
    order: int = Field(0, description="次序")
    is_active: bool = Field(True, description="啟用")
    note1: Optional[str] = Field(None, max_length=500, description="說明1")
    note2: Optional[str] = Field(None, max_length=500, description="說明2")
    note3: Optional[str] = Field(None, max_length=500, description="說明3")
    note4: Optional[str] = Field(None, max_length=500, description="說明4")
    note5: Optional[str] = Field(None, max_length=500, description="說明5")


class SystemCodeResponse(SystemCodeBase):
    """系統代碼回應資料"""
    id: int
    edit_by: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SystemCodeCreate(SystemCodeBase):
    """建立系統代碼請求"""
    pass


class SystemCodeUpdate(BaseModel):
    """更新系統代碼請求"""
    code_etype: Optional[str] = Field(None, max_length=100, description="代碼類別英文名稱")
    code_ctype: Optional[str] = Field(None, max_length=200, description="代碼類別中文名稱")
    code: Optional[str] = Field(None, max_length=50, description="代碼編號")
    code_cname: Optional[str] = Field(None, max_length=300, description="代碼中文名稱")
    code_ename: Optional[str] = Field(None, max_length=300, description="代碼英文名稱")
    order: Optional[int] = Field(None, description="次序")
    is_active: Optional[bool] = Field(None, description="啟用")
    note1: Optional[str] = Field(None, max_length=500, description="說明1")
    note2: Optional[str] = Field(None, max_length=500, description="說明2")
    note3: Optional[str] = Field(None, max_length=500, description="說明3")
    note4: Optional[str] = Field(None, max_length=500, description="說明4")
    note5: Optional[str] = Field(None, max_length=500, description="說明5")


class SystemCodeQuery(BaseModel):
    """系統代碼查詢參數"""
    code_etype: Optional[str] = Field(None, description="代碼類別英文名稱（模糊搜尋）")
    code_ctype: Optional[str] = Field(None, description="代碼類別中文名稱（模糊搜尋）")
    code: Optional[str] = Field(None, description="代碼編號（模糊搜尋）")
    code_cname: Optional[str] = Field(None, description="代碼中文名稱（模糊搜尋）")
    code_ename: Optional[str] = Field(None, description="代碼英文名稱（模糊搜尋）")
    is_active: Optional[bool] = Field(None, description="啟用狀態")
    search: Optional[str] = Field(None, description="綜合搜尋（代碼類別、代碼編號、代碼名稱）")
