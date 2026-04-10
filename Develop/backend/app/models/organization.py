"""
Organization Model
組織單位明細檔
"""

from sqlalchemy import Column, Integer, String, Boolean, TIMESTAMP, CheckConstraint, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Organization(Base):
    """組織單位明細檔"""

    __tablename__ = "organizations"

    # 主鍵
    id = Column(Integer, primary_key=True, index=True)

    # 組織資訊
    org_code = Column(String(200), unique=True, nullable=False, index=True)
    org_name = Column(String(200), nullable=False)
    org_type = Column(Integer, nullable=False)  # 1:政府, 2:公司, 3:個人

    # 聯絡資訊
    contact_person = Column(String(200), nullable=False)
    contact_email = Column(String(200), nullable=False)
    contact_phone = Column(String(200), nullable=False)
    address = Column(String(200))
    phone = Column(String(200))

    # 系統欄位
    is_mana = Column(Boolean, nullable=False, default=False, index=True)
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    memo = Column(String(1000))
    edit_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.current_timestamp())
    updated_at = Column(TIMESTAMP)

    # 約束
    __table_args__ = (
        CheckConstraint("org_type IN (1, 2, 3)", name="chk_org_type"),
        Index("idx_organizations_code", "org_code"),
        Index("idx_organizations_active", "is_active"),
        Index("idx_organizations_mana", "is_mana"),
    )

    # 關聯
    users = relationship("User", back_populates="organization", foreign_keys="User.organization_id")
    sys_profile = relationship("SysProfile", back_populates="organization")
    editor = relationship("User", foreign_keys=[edit_by])
