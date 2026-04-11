"""
SystemCode Model
系統代碼明細檔
"""

from sqlalchemy import Column, Integer, String, Boolean, TIMESTAMP, ForeignKey, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class SystemCode(Base):
    """系統代碼明細檔"""

    __tablename__ = "system_codes"

    # 主鍵
    id = Column(Integer, primary_key=True, index=True)

    # 代碼類別
    code_type = Column(String(100), nullable=False, index=True, comment="代碼類別識別碼（程式用）")
    code_type_name = Column(JSONB, nullable=False, default=dict, comment="代碼類別名稱（多語系 JSONB）")

    # 代碼資訊
    code = Column(String(50), nullable=False, index=True, comment="代碼編號")
    code_name = Column(JSONB, nullable=False, default=dict, comment="代碼名稱（多語系 JSONB）")

    # 排序與狀態
    order = Column(Integer, nullable=False, default=0, comment="次序")
    is_active = Column(Boolean, nullable=False, default=True, index=True, comment="啟用")

    # 擴充欄位
    note1 = Column(String(500), nullable=True, comment="說明1")
    note2 = Column(String(500), nullable=True, comment="說明2")
    note3 = Column(String(500), nullable=True, comment="說明3")
    note4 = Column(String(500), nullable=True, comment="說明4")
    note5 = Column(String(500), nullable=True, comment="說明5")

    # 系統欄位
    edit_by = Column(Integer, ForeignKey("users.id"), nullable=False, comment="資料建立人員")
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.current_timestamp(), comment="資料建立時間")
    updated_at = Column(TIMESTAMP, nullable=False, server_default=func.current_timestamp(), onupdate=func.current_timestamp(), comment="資料最新修改時間")

    # 索引
    __table_args__ = (
        Index("idx_system_codes_type", "code_type"),
        Index("idx_system_codes_code", "code"),
        Index("idx_system_codes_active", "is_active"),
        Index("idx_system_codes_order", "order"),
    )

    # 關聯
    editor = relationship("User", foreign_keys=[edit_by])
