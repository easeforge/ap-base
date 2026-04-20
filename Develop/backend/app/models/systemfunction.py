"""
System Function Model
系統功能設定表
"""

from sqlalchemy import Column, Integer, String, Boolean, TIMESTAMP, Text, ForeignKey, CheckConstraint, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
from app.core.func_type import check_constraint_sql, module_code_check_sql


class SystemFunction(Base):
    """系統功能設定表"""

    __tablename__ = "system_functions"

    # 主鍵
    id = Column(Integer, primary_key=True, index=True)

    # 功能資訊
    func_code = Column(String(200), nullable=False, index=True, comment="功能代碼，用於權限識別、前端路由、日誌記錄")
    upper_func_id = Column(Integer, nullable=False, default=0, index=True, comment="上層功能ID（0表示根節點）")
    func_name = Column(JSONB, nullable=False, default=dict, comment="功能名稱（多語系 JSONB）")
    func_type = Column(Integer, nullable=False, index=True,
                       comment="功能類型（CE 預設 1=節點、2=功能；其他類型由商業模組以 register_func_type() 註冊）")
    func_order = Column(Integer, nullable=False, index=True, comment="排序順序")
    func_icon = Column(String(200), comment="圖示")

    # 模組資訊
    module_code = Column(String(200), index=True, comment="模組代碼")
    module_item = Column(JSONB, nullable=False, default=list, comment="可設定權限項目")

    # 說明與狀態
    description = Column(Text, comment="功能說明")
    is_mana = Column(Boolean, nullable=False, default=False, comment="是否為管理功能")
    is_active = Column(Boolean, nullable=False, default=True, index=True, comment="是否啟用")

    # 系統欄位
    edit_by = Column(Integer, ForeignKey("users.id"), nullable=False, comment="最後編輯者ID")
    created_at = Column(TIMESTAMP, nullable=False, server_default=func.current_timestamp(), comment="建立時間")
    updated_at = Column(TIMESTAMP, comment="更新時間")

    # 約束（func_type 值域與 module_code 規則由 app.core.func_type 集中定義）
    __table_args__ = (
        CheckConstraint(check_constraint_sql(), name="chk_system_functions_type"),
        CheckConstraint(module_code_check_sql(), name="chk_system_functions_module"),
        Index("idx_system_functions_code", "func_code"),
        Index("idx_system_functions_upper", "upper_func_id"),
        Index("idx_system_functions_type", "func_type"),
        Index("idx_system_functions_active", "is_active"),
        Index("idx_system_functions_order", "func_order"),
        Index("idx_system_functions_module", "module_code"),
    )

    # 關聯
    editor = relationship("User", foreign_keys=[edit_by])

    def __repr__(self):
        return f"<SystemFunction(id={self.id}, func_code='{self.func_code}', module_code='{self.module_code}')>"
