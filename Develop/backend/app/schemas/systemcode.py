"""
SystemCode Schemas
系統代碼相關資料結構
"""

from datetime import datetime
from typing import Optional, Dict
from pydantic import BaseModel, ConfigDict, Field


class SystemCodeBase(BaseModel):
    """系統代碼基本資料"""
    code_type: str = Field(..., max_length=100, description="代碼類別識別碼（程式用）")
    code_type_name: Dict[str, str] = Field(default_factory=dict, description="代碼類別名稱（多語系）")
    code: str = Field(..., max_length=50, description="代碼編號")
    code_name: Dict[str, str] = Field(default_factory=dict, description="代碼名稱（多語系）")
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
    code_type: Optional[str] = Field(None, max_length=100, description="代碼類別識別碼")
    code_type_name: Optional[Dict[str, str]] = Field(None, description="代碼類別名稱（多語系）")
    code: Optional[str] = Field(None, max_length=50, description="代碼編號")
    code_name: Optional[Dict[str, str]] = Field(None, description="代碼名稱（多語系）")
    order: Optional[int] = Field(None, description="次序")
    is_active: Optional[bool] = Field(None, description="啟用")
    note1: Optional[str] = Field(None, max_length=500, description="說明1")
    note2: Optional[str] = Field(None, max_length=500, description="說明2")
    note3: Optional[str] = Field(None, max_length=500, description="說明3")
    note4: Optional[str] = Field(None, max_length=500, description="說明4")
    note5: Optional[str] = Field(None, max_length=500, description="說明5")


class SystemCodeQuery(BaseModel):
    """系統代碼查詢參數"""
    code_type: Optional[str] = Field(None, description="代碼類別識別碼（模糊搜尋）")
    code: Optional[str] = Field(None, description="代碼編號（模糊搜尋）")
    is_active: Optional[bool] = Field(None, description="啟用狀態")
    search: Optional[str] = Field(None, description="綜合搜尋（代碼類別、代碼編號、各語系名稱、note1~5）")
