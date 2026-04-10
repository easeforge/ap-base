"""
User Model
使用者資料表
"""

from sqlalchemy import Column, Integer, String, Boolean, TIMESTAMP, ForeignKey, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class User(Base):
    """使用者資料表"""

    __tablename__ = "users"

    # 主鍵
    id = Column(Integer, primary_key=True, index=True)

    # 組織與帳號
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    account = Column(String(100), unique=True, nullable=False, index=True)
    username = Column(String(200), nullable=False)
    password = Column(String(200), nullable=False)

    # 職務資訊
    department = Column(String(200))
    job_title = Column(String(200))
    phone = Column(String(200))

    # 角色權限 (JSONB array of role IDs)
    user_role = Column(JSONB, nullable=False, default=list)

    # 登入資訊
    last_login_at = Column(TIMESTAMP)
    last_login_ip = Column(String(100))

    # 系統欄位
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    edit_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.current_timestamp())
    updated_at = Column(TIMESTAMP)

    # 索引
    __table_args__ = (
        Index("idx_users_account", "account"),
        Index("idx_users_org", "organization_id"),
        Index("idx_users_active", "is_active"),
    )

    # 關聯
    organization = relationship("Organization", back_populates="users", foreign_keys=[organization_id])
    editor = relationship("User", remote_side=[id], foreign_keys=[edit_by])
    logs = relationship("UserLog", back_populates="user")
