"""
System Profile Model
系統設定檔
"""

from sqlalchemy import Column, Integer, String, Boolean, TIMESTAMP, ForeignKey, CheckConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class SysProfile(Base):
    """系統設定檔 (唯一一筆)"""

    __tablename__ = "sys_profiles"

    # 主鍵 (固定為 1)
    id = Column(Integer, primary_key=True, default=1)

    # 系統狀態
    is_service = Column(Boolean, nullable=False, default=True)

    # 系統資訊（多語系 JSONB）
    sys_url = Column(String(200), nullable=False)
    sys_title = Column(JSONB, nullable=False, default=dict, comment="系統標題（多語系）")
    sys_copyright = Column(JSONB, nullable=False, default=dict, comment="版權宣告（多語系）")

    # 管理資訊
    sys_organization = Column(Integer, ForeignKey("organizations.id"), nullable=False, default=1)
    sys_mana_email = Column(String(200), nullable=False)

    # 時區設定
    sys_timezone = Column(String(50), nullable=False, default='Asia/Taipei')

    # 語系設定
    sys_languages = Column(JSONB, nullable=False, default=lambda: ["zh-TW"], comment="啟用的語系代碼陣列")

    # 系統欄位
    edit_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.current_timestamp())
    updated_at = Column(TIMESTAMP)

    # 約束
    __table_args__ = (
        CheckConstraint("id = 1", name="chk_sys_profile_id"),
    )

    # 關聯
    organization = relationship("Organization", back_populates="sys_profile")
    editor = relationship("User", foreign_keys=[edit_by])
