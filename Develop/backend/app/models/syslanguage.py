"""
SysLanguage Model
語系翻譯資料表
"""

from sqlalchemy import Column, Integer, String, Boolean, TIMESTAMP, ForeignKey, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class SysLanguage(Base):
    """語系翻譯資料表"""

    __tablename__ = "sys_languages"

    # 主鍵
    id = Column(Integer, primary_key=True, index=True)

    # 語系資訊
    lang_code = Column(String(10), unique=True, nullable=False, index=True, comment="語系代碼（IETF 標籤）")
    lang_cname = Column(String(100), nullable=False, comment="語系中文名稱")
    lang_ename = Column(String(100), nullable=False, comment="語系英文名稱")

    # 翻譯資料
    lang_data = Column(JSONB, nullable=False, default=dict, comment="完整翻譯 JSON 資料")

    # 狀態
    is_active = Column(Boolean, nullable=False, default=True, index=True, comment="啟用")

    # 系統欄位
    edit_by = Column(Integer, ForeignKey("users.id"), nullable=False, comment="編輯者")
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.current_timestamp(), comment="建立時間")
    updated_at = Column(TIMESTAMP, nullable=False, server_default=func.current_timestamp(), comment="修改時間")

    # 索引
    __table_args__ = (
        Index("idx_sys_languages_code", "lang_code"),
        Index("idx_sys_languages_active", "is_active"),
    )

    # 關聯
    editor = relationship("User", foreign_keys=[edit_by])
