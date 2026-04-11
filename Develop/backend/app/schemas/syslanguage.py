"""
SysLanguage Schemas
語系翻譯資料 API Schema
"""

from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class SysLanguageBase(BaseModel):
    """語系基本資料"""
    lang_code: str = Field(..., max_length=10, description="語系代碼（IETF 標籤）")
    lang_cname: str = Field(..., max_length=100, description="語系中文名稱")
    lang_ename: str = Field(..., max_length=100, description="語系英文名稱")
    lang_data: Dict[str, Any] = Field(default_factory=dict, description="完整翻譯 JSON 資料")
    is_active: bool = Field(True, description="啟用")


class SysLanguageCreate(SysLanguageBase):
    """建立語系"""
    pass


class SysLanguageUpdate(BaseModel):
    """更新語系"""
    lang_cname: Optional[str] = Field(None, max_length=100)
    lang_ename: Optional[str] = Field(None, max_length=100)
    lang_data: Optional[Dict[str, Any]] = Field(None, description="完整翻譯 JSON 資料")
    is_active: Optional[bool] = Field(None)


class SysLanguageResponse(SysLanguageBase):
    """語系回應"""
    id: int
    edit_by: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SysLanguageListItem(BaseModel):
    """語系列表項目（不含 lang_data，減少傳輸量）"""
    id: int
    lang_code: str
    lang_cname: str
    lang_ename: str
    is_active: bool
    edit_by: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LanguageInfo(BaseModel):
    """語系資訊（供前端初始化用）"""
    code: str
    cname: str
    ename: str
    short_name: str = ""


class ActiveLanguagesResponse(BaseModel):
    """啟用語系回應（公開端點）"""
    default_language: str
    languages: list[LanguageInfo]
