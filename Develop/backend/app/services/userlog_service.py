"""
UserLog Service
使用者日誌服務層
"""

import logging
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
from datetime import datetime

from app.models.userlog import UserLog
from app.models.systemfunction import SystemFunction
from app.core.deps import session_id_ctx

logger = logging.getLogger(__name__)


class UserLogService:
    """使用者日誌服務"""

    @staticmethod
    def is_logging_enabled(db: Session) -> bool:
        """
        檢查是否啟用日誌記錄
        當 system_functions 表中 func_code='user_logs' 且 is_active=true 時啟用
        """
        user_logs_func = db.query(SystemFunction).filter(
            SystemFunction.func_code == 'user_logs',
            SystemFunction.is_active == True
        ).first()
        return user_logs_func is not None

    @staticmethod
    def create_log(
        db: Session,
        user_id: int,
        function_id: int,
        module_item: str,
        look_data: Optional[Dict[str, Any]] = None,
        change_data: Optional[Dict[str, Any]] = None,
        err_detail: Optional[str] = None
    ) -> Optional[UserLog]:
        """
        建立日誌記錄

        Args:
            db: 資料庫 Session
            user_id: 使用者ID
            function_id: 功能ID
            module_item: 模組項目 (Create, Read, Update, Delete, Print, File)
            look_data: 檢視資料
            change_data: 異動資料
            err_detail: 錯誤訊息

        Returns:
            UserLog 物件或 None (若未啟用日誌)
        """
        if not UserLogService.is_logging_enabled(db):
            return None

        # 從 context 取得 session_id
        session_id = session_id_ctx.get()
        logger.info(f"UserLogService: session_id from context = {session_id}")

        log = UserLog(
            user_id=user_id,
            system_function_id=function_id,
            module_item=module_item,
            session_id=session_id,
            look_data=look_data or {},
            change_data=change_data or {},
            action_at=datetime.now(),
            err_detail=err_detail
        )
        db.add(log)
        try:
            db.commit()
            db.refresh(log)
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to commit user log: {e}")
            # 日誌記錄失敗不應該影響主要功能，所以只記錄錯誤
        return log

    @staticmethod
    def log_create(
        db: Session,
        user_id: int,
        function_id: int,
        created_data: Dict[str, Any],
        current_user=None
    ) -> Optional[UserLog]:
        """
        記錄 Create 操作
        將新建立的資料寫入 change_data
        """
        # 優先從 current_user 物件讀取 session_id
        if current_user and hasattr(current_user, 'current_session_id'):
            old_session_id = session_id_ctx.get()
            session_id_ctx.set(current_user.current_session_id)
            logger.info(f"Using session_id from user object: {current_user.current_session_id} (context was: {old_session_id})")

        return UserLogService.create_log(
            db=db,
            user_id=user_id,
            function_id=function_id,
            module_item="Create",
            look_data={},
            change_data=created_data
        )

    @staticmethod
    def log_view(
        db: Session,
        user_id: int,
        function_id: int,
        viewed_data: Dict[str, Any],
        current_user=None
    ) -> Optional[UserLog]:
        """
        記錄 View 操作（功能瀏覽記錄）
        記錄使用者進入功能頁面的行為
        """
        # 優先從 current_user 物件讀取 session_id
        if current_user and hasattr(current_user, 'current_session_id'):
            old_session_id = session_id_ctx.get()
            session_id_ctx.set(current_user.current_session_id)
            logger.info(f"Using session_id from user object: {current_user.current_session_id} (context was: {old_session_id})")

        return UserLogService.create_log(
            db=db,
            user_id=user_id,
            function_id=function_id,
            module_item="View",
            look_data=viewed_data,
            change_data={}
        )

    @staticmethod
    def log_read(
        db: Session,
        user_id: int,
        function_id: int,
        viewed_data: Dict[str, Any],
        current_user=None
    ) -> Optional[UserLog]:
        """
        記錄 Read 操作（資料檢視記錄）
        記錄使用者查看單筆資料詳情的行為
        """
        # 優先從 current_user 物件讀取 session_id
        if current_user and hasattr(current_user, 'current_session_id'):
            old_session_id = session_id_ctx.get()
            session_id_ctx.set(current_user.current_session_id)
            logger.info(f"Using session_id from user object: {current_user.current_session_id} (context was: {old_session_id})")

        return UserLogService.create_log(
            db=db,
            user_id=user_id,
            function_id=function_id,
            module_item="Read",
            look_data=viewed_data,
            change_data={}
        )

    @staticmethod
    def log_update(
        db: Session,
        user_id: int,
        function_id: int,
        original_data: Dict[str, Any],
        updated_data: Dict[str, Any],
        current_user=None
    ) -> Optional[UserLog]:
        """
        記錄 Update 操作
        將修改前的資料寫入 look_data，修改後的資料寫入 change_data
        """
        # 優先從 current_user 物件讀取 session_id
        if current_user and hasattr(current_user, 'current_session_id'):
            old_session_id = session_id_ctx.get()
            session_id_ctx.set(current_user.current_session_id)
            logger.info(f"Using session_id from user object: {current_user.current_session_id} (context was: {old_session_id})")

        return UserLogService.create_log(
            db=db,
            user_id=user_id,
            function_id=function_id,
            module_item="Update",
            look_data=original_data,
            change_data=updated_data
        )

    @staticmethod
    def log_delete(
        db: Session,
        user_id: int,
        function_id: int,
        deleted_data: Dict[str, Any],
        current_user=None
    ) -> Optional[UserLog]:
        """
        記錄 Delete 操作
        將被刪除的資料寫入 look_data
        """
        # 優先從 current_user 物件讀取 session_id
        if current_user and hasattr(current_user, 'current_session_id'):
            old_session_id = session_id_ctx.get()
            session_id_ctx.set(current_user.current_session_id)
            logger.info(f"Using session_id from user object: {current_user.current_session_id} (context was: {old_session_id})")

        return UserLogService.create_log(
            db=db,
            user_id=user_id,
            function_id=function_id,
            module_item="Delete",
            look_data=deleted_data,
            change_data={}
        )

    @staticmethod
    def log_print(
        db: Session,
        user_id: int,
        function_id: int,
        print_info: Dict[str, Any]
    ) -> Optional[UserLog]:
        """
        記錄 Print 操作
        將列印資訊寫入 look_data
        """
        return UserLogService.create_log(
            db=db,
            user_id=user_id,
            function_id=function_id,
            module_item="Print",
            look_data=print_info,
            change_data={}
        )

    @staticmethod
    def log_file(
        db: Session,
        user_id: int,
        function_id: int,
        file_info: Dict[str, Any],
        is_upload: bool = True
    ) -> Optional[UserLog]:
        """
        記錄 File 操作
        上傳時寫入 change_data，下載時寫入 look_data
        """
        return UserLogService.create_log(
            db=db,
            user_id=user_id,
            function_id=function_id,
            module_item="File",
            look_data={} if is_upload else file_info,
            change_data=file_info if is_upload else {}
        )

    @staticmethod
    def log_login(
        db: Session,
        user_id: int,
        function_id: int,
        login_info: Dict[str, Any]
    ) -> Optional[UserLog]:
        """
        記錄 Login 操作
        將登入資訊寫入 change_data
        """
        return UserLogService.create_log(
            db=db,
            user_id=user_id,
            function_id=function_id,
            module_item="Login",
            look_data={},
            change_data=login_info
        )

    @staticmethod
    def log_error(
        db: Session,
        user_id: int,
        function_id: int,
        module_item: str,
        error_message: str,
        look_data: Optional[Dict[str, Any]] = None,
        change_data: Optional[Dict[str, Any]] = None
    ) -> Optional[UserLog]:
        """
        記錄錯誤操作
        將錯誤訊息寫入 err_detail
        """
        return UserLogService.create_log(
            db=db,
            user_id=user_id,
            function_id=function_id,
            module_item=module_item,
            look_data=look_data or {},
            change_data=change_data or {},
            err_detail=error_message
        )

    @staticmethod
    def get_function_id_by_code(db: Session, func_code: str) -> Optional[int]:
        """
        根據 func_code 取得功能 ID
        用於快速查找功能ID以記錄日誌
        """
        func = db.query(SystemFunction).filter(
            SystemFunction.func_code == func_code
        ).first()
        return func.id if func else None
