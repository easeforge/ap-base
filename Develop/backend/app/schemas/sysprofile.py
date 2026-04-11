"""
SysProfile Schemas
系統設定檔 API Schema
"""

from typing import Optional, List, Dict
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class SysProfileResponse(BaseModel):
    """系統設定檔回應"""
    id: int
    is_service: bool
    sys_url: str
    sys_title: Dict[str, str] = Field(default_factory=dict, description="系統標題（多語系）")
    sys_copyright: Dict[str, str] = Field(default_factory=dict, description="版權宣告（多語系）")
    sys_organization: int
    sys_mana_email: str
    sys_timezone: str = 'Asia/Taipei'
    sys_languages: List[str] = Field(default_factory=lambda: ["zh-TW"], description="啟用的語系代碼陣列")
    edit_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class SysProfileUpdate(BaseModel):
    """更新系統設定檔"""
    is_service: Optional[bool] = None
    sys_url: Optional[str] = None
    sys_title: Optional[Dict[str, str]] = Field(None, description="系統標題（多語系）")
    sys_copyright: Optional[Dict[str, str]] = Field(None, description="版權宣告（多語系）")
    sys_organization: Optional[int] = None
    sys_mana_email: Optional[str] = None
    sys_timezone: Optional[str] = None
    sys_languages: Optional[List[str]] = Field(None, description="啟用的語系代碼陣列")
