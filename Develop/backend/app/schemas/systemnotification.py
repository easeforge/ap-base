"""
System Notification Schemas
系統通知 API Schema
"""

from typing import Optional, List, Dict
from datetime import datetime, date
from pydantic import BaseModel, Field, ConfigDict


class SystemNotificationBase(BaseModel):
    """系統通知基本資料"""
    notice_subject: Dict[str, str] = Field(default_factory=dict, description="通知主旨（多語系）")
    notice_description: Dict[str, str] = Field(default_factory=dict, description="通知說明（多語系，富文本格式）")
    notice_start_at: datetime = Field(..., description="通知開始時間")
    notice_end_at: datetime = Field(..., description="通知結束時間")
    notice_order: int = Field(0, description="訊息次序")
    is_active: bool = Field(True, description="啟用狀態")


class SystemNotificationCreate(SystemNotificationBase):
    """建立系統通知"""
    pass


class SystemNotificationUpdate(BaseModel):
    """更新系統通知"""
    notice_subject: Optional[Dict[str, str]] = Field(None, description="通知主旨（多語系）")
    notice_description: Optional[Dict[str, str]] = Field(None, description="通知說明（多語系）")
    notice_start_at: Optional[datetime] = Field(None, description="通知開始時間")
    notice_end_at: Optional[datetime] = Field(None, description="通知結束時間")
    notice_order: Optional[int] = Field(None, description="訊息次序")
    is_active: Optional[bool] = Field(None, description="啟用狀態")


class SystemNotificationResponse(SystemNotificationBase):
    """系統通知回應資料"""
    id: int
    edit_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class NotificationCloseDateCreate(BaseModel):
    """建立通知關閉日期記錄"""
    closed_at: Optional[date] = Field(None, description="關閉日期（預設今日）")


class NotificationCloseDateResponse(BaseModel):
    """通知關閉日期記錄回應"""
    id: int
    closed_at: date
    edit_by: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TodayNotificationsResponse(BaseModel):
    """今日通知回應"""
    notifications: List[SystemNotificationResponse] = Field(..., description="今日通知列表")


class DataTablesRequest(BaseModel):
    """DataTables 請求參數"""
    draw: int = Field(..., description="繪圖計數器")
    start: int = Field(0, ge=0, description="起始位置")
    length: int = Field(10, ge=1, le=1000, description="每頁筆數")
    search_value: Optional[str] = Field(None, description="全文檢索值")
    order_column: Optional[int] = Field(None, description="排序欄位索引")
    order_dir: Optional[str] = Field("asc", description="排序方向")
    filter_notice_end_at_start: Optional[datetime] = Field(None)
    filter_notice_end_at_end: Optional[datetime] = Field(None)
    filter_notice_order: Optional[int] = Field(None)
    filter_is_active: Optional[bool] = Field(None)


class DataTablesResponse(BaseModel):
    """DataTables 回應格式"""
    draw: int
    recordsTotal: int
    recordsFiltered: int
    data: List[SystemNotificationResponse]
