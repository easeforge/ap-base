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
    login_bg: str = Field(default='default', description="登入頁背景圖代碼")
    color_theme: str = Field(default='classic-blue', description="內頁配色主題代碼")
    layout_mode: str = Field(default='vertical', description="版面模式：vertical 或 horizontal")
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
    login_bg: Optional[str] = Field(None, description="登入頁背景圖代碼")
    color_theme: Optional[str] = Field(None, description="內頁配色主題代碼")
    layout_mode: Optional[str] = Field(None, description="版面模式：vertical 或 horizontal")
