"""
SystemFunction Schemas
系統功能設定表 API Schema
"""

from typing import Optional, List, Dict
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class SystemFunctionBase(BaseModel):
    """系統功能基本資料"""
    func_code: str = Field(..., max_length=200, description="功能代碼")
    upper_func_id: int = Field(0, description="上層功能ID (0表示根節點)")
    func_name: Dict[str, str] = Field(default_factory=dict, description="功能名稱（多語系）")
    func_type: int = Field(..., description="功能類型 (1:節點/選單, 2:功能)")
    func_order: int = Field(..., description="排序順序")
    func_icon: Optional[str] = Field(None, max_length=200, description="圖示")
    module_code: Optional[str] = Field(None, max_length=200, description="模組代碼")
    module_item: List[str] = Field(default_factory=list, description="可設定權限項目")
    description: Optional[str] = Field(None, description="功能說明")
    is_mana: bool = Field(False, description="是否為管理功能")
    is_active: bool = Field(True, description="是否啟用")


class SystemFunctionCreate(SystemFunctionBase):
    """建立系統功能"""
    pass


class SystemFunctionUpdate(BaseModel):
    """更新系統功能"""
    func_code: Optional[str] = Field(None, max_length=200)
    upper_func_id: Optional[int] = Field(None)
    func_name: Optional[Dict[str, str]] = Field(None, description="功能名稱（多語系）")
    func_type: Optional[int] = Field(None)
    func_order: Optional[int] = Field(None)
    func_icon: Optional[str] = Field(None, max_length=200)
    module_code: Optional[str] = Field(None, max_length=200)
    module_item: Optional[List[str]] = Field(None)
    description: Optional[str] = Field(None)
    is_mana: Optional[bool] = Field(None)
    is_active: Optional[bool] = Field(None)


class SystemFunctionResponse(SystemFunctionBase):
    """系統功能回應資料"""
    id: int
    edit_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class SystemFunctionTreeNode(SystemFunctionResponse):
    """系統功能樹狀結構節點（含子節點）"""
    children: Optional[List['SystemFunctionTreeNode']] = Field(default_factory=list, description="子功能列表")

    model_config = ConfigDict(from_attributes=True)


# 解決循環引用問題
SystemFunctionTreeNode.model_rebuild()
