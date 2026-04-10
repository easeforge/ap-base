"""
User Log Model
使用者作業紀錄表（新版）
"""

from sqlalchemy import Column, Integer, String, TIMESTAMP, ForeignKey, CheckConstraint, Index, and_
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class UserLog(Base):
    """使用者作業紀錄表"""

    __tablename__ = "user_logs"

    # 主鍵
    id = Column(Integer, primary_key=True, index=True)

    # 作業資訊
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    system_function_id = Column(Integer, nullable=False, index=True)  # 不設外鍵約束,允許保留已刪除功能的歷史記錄
    module_item = Column(String(50), nullable=False, index=True)  # Create/Read/Update/Delete/Print/File/Login
    data_id = Column(Integer, nullable=True, index=True)  # 資料序號 (處理的資料 id)
    session_id = Column(String(36), nullable=True, index=True)  # 登入Session識別碼(UUID)

    # 資料記錄
    look_data = Column(JSONB, nullable=False, default=dict)
    change_data = Column(JSONB, nullable=False, default=dict)

    # 時間與錯誤
    action_at = Column(TIMESTAMP, nullable=False, server_default=func.current_timestamp(), index=True)
    err_detail = Column(String(2000))

    # 約束
    __table_args__ = (
        CheckConstraint(
            "module_item IN ('Create', 'Read', 'Update', 'Delete', 'Print', 'File', 'Login')",
            name="chk_user_logs_module_item"
        ),
        Index("idx_user_logs_user", "user_id"),
        Index("idx_user_logs_function", "system_function_id"),
        Index("idx_user_logs_action_at", "action_at"),
        Index("idx_user_logs_module", "module_item"),
        Index("idx_user_logs_session", "session_id"),
        Index("idx_user_logs_data_id", "data_id"),
    )

    # 關聯
    user = relationship("User", back_populates="logs")
    # 注意: system_function_id 不設外鍵約束,因為日誌需要保留已刪除功能的歷史記錄
    # 因此不建立 relationship,改在查詢時手動 join
