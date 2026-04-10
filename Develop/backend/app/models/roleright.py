"""
Role Right Model
角色權限設定檔（新版）
"""

from sqlalchemy import Column, Integer, String, Boolean, TIMESTAMP, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class RoleRight(Base):
    """角色權限設定檔"""

    __tablename__ = "role_rights"

    # 主鍵
    id = Column(Integer, primary_key=True, index=True)

    # 關聯欄位
    user_role_id = Column(Integer, ForeignKey("user_roles.id", ondelete="CASCADE"), nullable=False, index=True)
    system_function_id = Column(Integer, ForeignKey("system_functions.id", ondelete="CASCADE"), nullable=False, index=True)
    func_code = Column(String(200), nullable=False)

    # 權限設定
    is_create = Column(Boolean, nullable=False, default=False)
    is_read = Column(Boolean, nullable=False, default=False)
    is_update = Column(Boolean, nullable=False, default=False)
    is_delete = Column(Boolean, nullable=False, default=False)
    is_print = Column(Boolean, nullable=False, default=False)
    is_file = Column(Boolean, nullable=False, default=False)

    # 系統欄位
    edit_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.current_timestamp())
    updated_at = Column(TIMESTAMP)

    # 索引與約束
    __table_args__ = (
        Index("idx_role_rights_role", "user_role_id"),
        Index("idx_role_rights_function", "system_function_id"),
        Index("idx_role_rights_unique", "user_role_id", "system_function_id", unique=True),
    )

    # 關聯
    role = relationship("UserRole", foreign_keys=[user_role_id])
    function = relationship("SystemFunction", foreign_keys=[system_function_id])
    editor = relationship("User", foreign_keys=[edit_by])
