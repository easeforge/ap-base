"""
SystemCode Service
系統代碼服務層
"""

import logging
from sqlalchemy.orm import Session
from sqlalchemy import or_, text, cast, String
from typing import List, Optional

from app.models.systemcode import SystemCode
from app.schemas.systemcode import SystemCodeCreate, SystemCodeUpdate, SystemCodeQuery

logger = logging.getLogger(__name__)


class SystemCodeService:
    """系統代碼服務"""

    @staticmethod
    def get_all(db: Session, query: Optional[SystemCodeQuery] = None) -> List[SystemCode]:
        """查詢系統代碼列表"""
        q = db.query(SystemCode)

        if query:
            if query.search:
                # 綜合搜尋：code_type、code、所有語系名稱、note1~5
                search_term = f"%{query.search}%"
                search_filter = or_(
                    SystemCode.code_type.ilike(search_term),
                    SystemCode.code.ilike(search_term),
                    # JSONB 多語系欄位：搜尋所有語系的值
                    cast(SystemCode.code_type_name, String).ilike(search_term),
                    cast(SystemCode.code_name, String).ilike(search_term),
                    SystemCode.note1.ilike(search_term),
                    SystemCode.note2.ilike(search_term),
                    SystemCode.note3.ilike(search_term),
                    SystemCode.note4.ilike(search_term),
                    SystemCode.note5.ilike(search_term),
                )
                q = q.filter(search_filter)
            else:
                if query.code_type:
                    q = q.filter(SystemCode.code_type.ilike(f"%{query.code_type}%"))
                if query.code:
                    q = q.filter(SystemCode.code.ilike(f"%{query.code}%"))

            if query.is_active is not None:
                q = q.filter(SystemCode.is_active == query.is_active)

        return q.order_by(
            SystemCode.code_type,
            SystemCode.order,
            SystemCode.code
        ).all()

    @staticmethod
    def get_by_id(db: Session, code_id: int) -> Optional[SystemCode]:
        """根據ID查詢系統代碼"""
        return db.query(SystemCode).filter(SystemCode.id == code_id).first()

    @staticmethod
    def create(db: Session, code_data: SystemCodeCreate, user_id: int) -> SystemCode:
        """建立系統代碼"""
        db_code = SystemCode(
            **code_data.model_dump(),
            edit_by=user_id
        )
        db.add(db_code)
        db.commit()
        db.refresh(db_code)
        logger.info(f"[SystemCodeService] Created system code: {db_code.id} by user {user_id}")
        return db_code

    @staticmethod
    def update(db: Session, code_id: int, code_data: SystemCodeUpdate, user_id: int) -> Optional[SystemCode]:
        """更新系統代碼"""
        db_code = SystemCodeService.get_by_id(db, code_id)
        if not db_code:
            return None

        update_data = code_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_code, field, value)

        db_code.edit_by = user_id
        db.commit()
        db.refresh(db_code)
        logger.info(f"[SystemCodeService] Updated system code: {code_id} by user {user_id}")
        return db_code

    @staticmethod
    def delete(db: Session, code_id: int) -> bool:
        """刪除系統代碼"""
        db_code = SystemCodeService.get_by_id(db, code_id)
        if not db_code:
            return False

        db.delete(db_code)
        db.commit()
        logger.info(f"[SystemCodeService] Deleted system code: {code_id}")
        return True

    @staticmethod
    def get_by_type(db: Session, code_type: str, active_only: bool = True) -> List[SystemCode]:
        """根據代碼類別查詢系統代碼"""
        q = db.query(SystemCode).filter(SystemCode.code_type == code_type)

        if active_only:
            q = q.filter(SystemCode.is_active == True)

        return q.order_by(SystemCode.order, SystemCode.code).all()
