"""
System Notification Schemas
系統通知 API Schema
"""

from typing import Optional, List
from datetime import datetime, date
from pydantic import BaseModel, Field


class SystemNotificationBase(BaseModel):
    """系統通知基本資料"""
    notice_csubject: str = Field(..., max_length=200, description="通知中文主旨")
    notice_esubject: str = Field(..., max_length=200, description="通知英文主旨")
    notice_cdescription: str = Field(..., description="通知中文說明（富文本格式）")
    notice_edescription: str = Field(..., description="通知英文說明（富文本格式）")
    notice_start_at: datetime = Field(..., description="通知開始時間")
    notice_end_at: datetime = Field(..., description="通知結束時間")
    notice_order: int = Field(0, description="訊息次序")
    is_active: bool = Field(True, description="啟用狀態")


class SystemNotificationCreate(SystemNotificationBase):
    """建立系統通知"""
    pass


class SystemNotificationUpdate(BaseModel):
    """更新系統通知（所有欄位可選）"""
    notice_csubject: Optional[str] = Field(None, max_length=200, description="通知中文主旨")
    notice_esubject: Optional[str] = Field(None, max_length=200, description="通知英文主旨")
    notice_cdescription: Optional[str] = Field(None, description="通知中文說明（富文本格式）")
    notice_edescription: Optional[str] = Field(None, description="通知英文說明（富文本格式）")
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

    class Config:
        from_attributes = True


class NotificationCloseDateCreate(BaseModel):
    """建立通知關閉日期記錄"""
    closed_at: Optional[date] = Field(None, description="關閉日期（預設今日）")


class NotificationCloseDateResponse(BaseModel):
    """通知關閉日期記錄回應"""
    id: int
    closed_at: date
    edit_by: int
    created_at: datetime

    class Config:
        from_attributes = True


class TodayNotificationsResponse(BaseModel):
    """今日通知回應（用於 Home 頁面 Modal）"""
    notifications: List[SystemNotificationResponse] = Field(..., description="今日通知列表（依次序排序）")


class DataTablesRequest(BaseModel):
    """DataTables 請求參數"""
    draw: int = Field(..., description="繪圖計數器")
    start: int = Field(0, ge=0, description="起始位置")
    length: int = Field(10, ge=1, le=1000, description="每頁筆數")
    search_value: Optional[str] = Field(None, description="全文檢索值")
    order_column: Optional[int] = Field(None, description="排序欄位索引")
    order_dir: Optional[str] = Field("asc", description="排序方向")

    # 篩選欄位
    filter_notice_end_at_start: Optional[datetime] = Field(None, description="結束時間起始")
    filter_notice_end_at_end: Optional[datetime] = Field(None, description="結束時間結束")
    filter_notice_order: Optional[int] = Field(None, description="訊息次序")
    filter_is_active: Optional[bool] = Field(None, description="啟用狀態")


class DataTablesResponse(BaseModel):
    """DataTables 回應格式"""
    draw: int
    recordsTotal: int
    recordsFiltered: int
    data: List[SystemNotificationResponse]
