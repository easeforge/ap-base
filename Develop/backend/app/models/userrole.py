"""
User Role Model
使用者角色明細檔
"""

from sqlalchemy import Column, Integer, String, Boolean, TIMESTAMP, Text, ForeignKey, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class UserRole(Base):
    """使用者角色明細檔"""

    __tablename__ = "user_roles"

    # 主鍵
    id = Column(Integer, primary_key=True, index=True)

    # 角色資訊
    role_name = Column(JSONB, nullable=False, default=dict, comment="角色名稱（多語系 JSONB）")
    description = Column(Text)

    # 系統欄位
    is_mana = Column(Boolean, nullable=False, default=False)
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    edit_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.current_timestamp())
    updated_at = Column(TIMESTAMP)

    # 索引
    __table_args__ = (
        Index("idx_user_roles_active", "is_active"),
    )

    # 關聯
    editor = relationship("User", foreign_keys=[edit_by])
