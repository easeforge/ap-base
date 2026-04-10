"""
SystemCode Service
系統代碼服務層
"""

import logging
from sqlalchemy.orm import Session
from typing import List, Optional
from sqlalchemy import or_, and_

from app.models.systemcode import SystemCode
from app.schemas.systemcode import SystemCodeCreate, SystemCodeUpdate, SystemCodeQuery

logger = logging.getLogger(__name__)


class SystemCodeService:
    """系統代碼服務"""

    @staticmethod
    def get_all(db: Session, query: Optional[SystemCodeQuery] = None) -> List[SystemCode]:
        """
        查詢系統代碼列表

        Args:
            db: 資料庫 Session
            query: 查詢參數

        Returns:
            SystemCode 列表
        """
        q = db.query(SystemCode)

        if query:
            # 綜合搜尋
            if query.search:
                search_filter = or_(
                    SystemCode.code_etype.ilike(f"%{query.search}%"),
                    SystemCode.code_ctype.ilike(f"%{query.search}%"),
                    SystemCode.code.ilike(f"%{query.search}%"),
                    SystemCode.code_cname.ilike(f"%{query.search}%"),
                    SystemCode.code_ename.ilike(f"%{query.search}%")
                )
                q = q.filter(search_filter)
            else:
                # 個別欄位搜尋
                if query.code_etype:
                    q = q.filter(SystemCode.code_etype.ilike(f"%{query.code_etype}%"))
                if query.code_ctype:
                    q = q.filter(SystemCode.code_ctype.ilike(f"%{query.code_ctype}%"))
                if query.code:
                    q = q.filter(SystemCode.code.ilike(f"%{query.code}%"))
                if query.code_cname:
                    q = q.filter(SystemCode.code_cname.ilike(f"%{query.code_cname}%"))
                if query.code_ename:
                    q = q.filter(SystemCode.code_ename.ilike(f"%{query.code_ename}%"))

            # 啟用狀態
            if query.is_active is not None:
                q = q.filter(SystemCode.is_active == query.is_active)

        # 排序：依照 code_etype, code_ctype, order, code
        return q.order_by(
            SystemCode.code_etype,
            SystemCode.code_ctype,
            SystemCode.order,
            SystemCode.code
        ).all()

    @staticmethod
    def get_by_id(db: Session, code_id: int) -> Optional[SystemCode]:
        """
        根據ID查詢系統代碼

        Args:
            db: 資料庫 Session
            code_id: 代碼ID

        Returns:
            SystemCode 或 None
        """
        return db.query(SystemCode).filter(SystemCode.id == code_id).first()

    @staticmethod
    def create(db: Session, code_data: SystemCodeCreate, user_id: int) -> SystemCode:
        """
        建立系統代碼

        Args:
            db: 資料庫 Session
            code_data: 系統代碼資料
            user_id: 建立者ID

        Returns:
            新建立的 SystemCode
        """
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
        """
        更新系統代碼

        Args:
            db: 資料庫 Session
            code_id: 代碼ID
            code_data: 更新資料
            user_id: 更新者ID

        Returns:
            更新後的 SystemCode 或 None
        """
        db_code = SystemCodeService.get_by_id(db, code_id)
        if not db_code:
            return None

        # 更新欄位
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
        """
        刪除系統代碼

        Args:
            db: 資料庫 Session
            code_id: 代碼ID

        Returns:
            是否刪除成功
        """
        db_code = SystemCodeService.get_by_id(db, code_id)
        if not db_code:
            return False

        db.delete(db_code)
        db.commit()
        logger.info(f"[SystemCodeService] Deleted system code: {code_id}")
        return True

    @staticmethod
    def get_by_type(db: Session, code_etype: str, code_ctype: Optional[str] = None, active_only: bool = True) -> List[SystemCode]:
        """
        根據代碼類別查詢系統代碼

        Args:
            db: 資料庫 Session
            code_etype: 代碼類別英文名稱
            code_ctype: 代碼類別中文名稱（可選）
            active_only: 只查詢啟用的代碼

        Returns:
            SystemCode 列表
        """
        q = db.query(SystemCode).filter(SystemCode.code_etype == code_etype)

        if code_ctype:
            q = q.filter(SystemCode.code_ctype == code_ctype)

        if active_only:
            q = q.filter(SystemCode.is_active == True)

        return q.order_by(SystemCode.order, SystemCode.code).all()
