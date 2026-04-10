"""
Dependencies
FastAPI 依賴注入函數
"""

import uuid
import logging
from contextvars import ContextVar
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User
from app.services.session_service import SessionService

logger = logging.getLogger(__name__)

# Context variable for session_id
session_id_ctx: ContextVar[Optional[str]] = ContextVar("session_id", default=None)

# HTTP Bearer Token 驗證
security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    取得當前登入使用者

    Args:
        credentials: HTTP Bearer Token
        db: 資料庫 Session

    Returns:
        User: 使用者物件

    Raises:
        HTTPException: 401 未授權
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="無法驗證認證資訊",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token = credentials.credentials
    payload = decode_access_token(token)

    if payload is None:
        raise credentials_exception

    # 從 Token 取得 session_id
    session_id = payload.get("session_id")
    if not session_id:
        # 相容舊版 Token（含 sub 欄位）
        user_id_str = payload.get("sub")
        if user_id_str:
            logger.warning(f"使用舊版 Token (含 user_id)，建議重新登入")
            # 產生臨時 session_id
            session_id = f"legacy-{uuid.uuid4()}"
            session_id_ctx.set(session_id)

            try:
                user_id = int(user_id_str)
            except (ValueError, TypeError):
                raise credentials_exception

            # 從資料庫查詢使用者（舊版流程）
            user = db.query(User).filter(User.id == user_id).first()
            if user is None:
                raise credentials_exception
            if not user.is_active:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="帳號已停用"
                )

            user.current_session_id = session_id
            return user
        else:
            raise credentials_exception

    # 設定 session_id 到 context
    session_id_ctx.set(session_id)
    logger.debug(f"Token session_id: {session_id}")

    # 從 Redis 取得 Session 資料
    session_data = SessionService.get_session(session_id)
    if not session_data:
        logger.warning(f"Session 不存在或已過期: {session_id}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session 已過期，請重新登入",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 從 Session 資料取得 user_id
    user_id = session_data.get("user_id")
    if not user_id:
        logger.error(f"Session 資料異常，缺少 user_id: {session_id}")
        raise credentials_exception

    # 從資料庫查詢使用者（確保資料庫與 Session 同步）
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        logger.warning(f"使用者不存在: {user_id}")
        # 刪除無效的 Session
        SessionService.delete_session(session_id)
        raise credentials_exception

    if not user.is_active:
        logger.warning(f"帳號已停用: {user_id}")
        # 刪除已停用使用者的 Session
        SessionService.delete_session(session_id)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="帳號已停用"
        )

    # 將 Session 中的角色資料存到非 ORM 屬性（避免污染 ORM dirty tracking）
    # 注意：不可直接覆寫 user.user_role，否則 db.commit() 的 auto-flush
    # 會把 session 舊值寫回 DB，導致其他端點更新 user_role 失效
    session_role_ids = session_data.get("role_ids", [])
    if session_role_ids:
        user._session_role_ids = session_role_ids
        logger.debug(f"使用 Session 中的角色資料: {session_role_ids}")

    # 將 session_id 附加到 user 物件上（用於日誌記錄）
    user.current_session_id = session_id

    logger.debug(f"✅ 使用者驗證成功: {user.username} (ID: {user.id}, Roles: {user.user_role})")

    return user


def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    取得當前啟用的使用者（已在 get_current_user 驗證）

    Args:
        current_user: 當前使用者

    Returns:
        User: 使用者物件
    """
    return current_user
