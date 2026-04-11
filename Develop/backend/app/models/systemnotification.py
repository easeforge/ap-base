"""
System Notification Models
系統通知模型
"""

from sqlalchemy import Column, Integer, String, Boolean, TIMESTAMP, Text, Date, ForeignKey, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class SystemNotification(Base):
    """系統通知主表"""

    __tablename__ = "system_notifications"

    # 主鍵
    id = Column(Integer, primary_key=True, index=True)

    # 通知主旨與說明（多語系 JSONB）
    notice_subject = Column(JSONB, nullable=False, default=dict, comment="通知主旨（多語系）")
    notice_description = Column(JSONB, nullable=False, default=dict, comment="通知說明（多語系）")

    # 時間控制
    notice_start_at = Column(TIMESTAMP, nullable=False, server_default=func.current_timestamp(), index=True)
    notice_end_at = Column(TIMESTAMP, nullable=False, index=True)

    # 顯示控制
    notice_order = Column(Integer, nullable=False, default=0, index=True)
    is_active = Column(Boolean, nullable=False, default=True, index=True)

    # 系統欄位
    edit_by = Column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.current_timestamp())
    updated_at = Column(TIMESTAMP, server_default=func.current_timestamp(), onupdate=func.current_timestamp())

    # 索引
    __table_args__ = (
        Index("idx_notifications_active", "is_active"),
        Index("idx_notifications_time", "notice_start_at", "notice_end_at"),
        Index("idx_notifications_order", "notice_order"),
    )

    # 關聯
    editor = relationship("User", foreign_keys=[edit_by])


class NotificationCloseDate(Base):
    """系統通知關閉日期記錄表"""

    __tablename__ = "notification_closedates"

    # 主鍵
    id = Column(Integer, primary_key=True, index=True)

    # 不顯示訊息日期
    closed_at = Column(Date, nullable=False, server_default=func.current_date(), index=True)

    # 資料建立者
    edit_by = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # 建立時間
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.current_timestamp())

    # 索引
    __table_args__ = (
        Index("idx_notification_closedates_edit_by", "edit_by"),
        Index("idx_notification_closedates_closed_at", "closed_at"),
        Index("idx_notification_closedates_edit_by_closed_at", "edit_by", "closed_at"),
        {"sqlite_autoincrement": True},
    )

    # 關聯
    user = relationship("User")
