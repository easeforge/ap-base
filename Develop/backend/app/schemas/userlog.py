"""
UserLog Schemas
使用者日誌相關 Schema（新版）
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime


class UserLogBase(BaseModel):
    """UserLog 基礎 Schema"""
    user_id: int = Field(..., description="作業人員ID")
    system_function_id: int = Field(..., description="作業功能ID")
    module_item: str = Field(..., description="模組項目：Create, Read, Update, Delete, Print, File")
    data_id: Optional[int] = Field(None, description="資料序號（處理的資料 id）")
    session_id: Optional[str] = Field(None, max_length=36, description="登入Session識別碼")
    look_data: Optional[Dict[str, Any]] = Field(None, description="檢視資料（JSON）")
    change_data: Optional[Dict[str, Any]] = Field(None, description="異動資料（JSON）")
    err_detail: Optional[str] = Field(None, max_length=2000, description="異常紀錄")


class UserLogCreate(UserLogBase):
    """建立 UserLog 的 Schema（系統內部使用，包含 user_id）"""
    pass


class UserLogCreateByFrontend(BaseModel):
    """前端建立 UserLog 的 Schema（不需要 user_id，由後端自動填入）"""
    system_function_id: int = Field(..., description="作業功能ID")
    module_item: str = Field(..., description="模組項目：View, Read, Create, Update, Delete, Print, File, Login")
    data_id: Optional[int] = Field(None, description="資料序號（處理的資料 id）")
    look_data: Optional[Dict[str, Any]] = Field(None, description="檢視資料（JSON）")
    change_data: Optional[Dict[str, Any]] = Field(None, description="異動資料（JSON）")
    err_detail: Optional[str] = Field(None, max_length=2000, description="異常紀錄")


class UserLogResponse(UserLogBase):
    """UserLog 回應 Schema"""
    id: int
    action_at: datetime
    user_name: Optional[str] = Field(None, description="使用者名稱")
    function_name: Optional[Any] = Field(None, description="功能名稱 (JSONB)")

    class Config:
        from_attributes = True


class UserLogQuery(BaseModel):
    """UserLog 查詢參數"""
    user_id: Optional[int] = Field(None, description="作業人員ID")
    system_function_id: Optional[int] = Field(None, description="作業功能ID")
    module_item: Optional[str] = Field(None, description="模組項目")
    data_id: Optional[int] = Field(None, description="資料序號")
    start_date: Optional[datetime] = Field(None, description="開始日期時間")
    end_date: Optional[datetime] = Field(None, description="結束日期時間")
    has_error: Optional[bool] = Field(None, description="是否有錯誤")
    skip: int = Field(0, ge=0, description="略過筆數")
    limit: int = Field(100, ge=1, le=1000, description="取得筆數")
