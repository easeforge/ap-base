"""
Session Service
Session 管理服務
"""

import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, List

from app.core.redis_client import get_redis

logger = logging.getLogger(__name__)

# Session 有效期限（秒）
SESSION_EXPIRE_SECONDS = 3600  # 60 分鐘（初始時效）
SESSION_EXTEND_SECONDS = 1800  # 30 分鐘（每次延長）

# 台北時區 (UTC+8)
TAIPEI_TZ = timezone(timedelta(hours=8))


def get_taipei_now():
    """取得台北時間"""
    return datetime.now(timezone.utc).astimezone(TAIPEI_TZ)


class SessionService:
    """Session 管理服務"""

    @staticmethod
    def create_session(
        session_id: str,
        user_id: int,
        role_ids: List[int],
        organization_id: int,
        username: str,
        account: str,
        authorized_function_ids: List[int] = None,
        roles: List[Dict[str, Any]] = None
    ) -> bool:
        """
        建立 Session

        Args:
            session_id: Session ID (UUID)
            user_id: 使用者 ID
            role_ids: 角色 ID 陣列
            organization_id: 組織 ID
            username: 使用者名稱
            account: 帳號
            authorized_function_ids: 使用者有權限的功能 IDs
            roles: 角色詳細資訊 [{"id": 1, "role_cname": "系統管理員", "role_ename": "Admin"}]

        Returns:
            是否建立成功
        """
        redis_client = get_redis()
        if not redis_client:
            logger.warning("Redis 未連線，無法建立 Session")
            return False

        try:
            session_data = {
                "user_id": user_id,
                "role_ids": role_ids,
                "roles": roles or [],
                "organization_id": organization_id,
                "username": username,
                "account": account,
                "authorized_function_ids": authorized_function_ids or [],
                "created_at": get_taipei_now().isoformat(),
                "last_access": get_taipei_now().isoformat()
            }

            key = f"session:{session_id}"
            redis_client.setex(
                key,
                SESSION_EXPIRE_SECONDS,
                json.dumps(session_data)
            )

            logger.info(
                f"✅ Session 已建立: {session_id} "
                f"(User: {user_id}, Roles: {role_ids}, "
                f"Authorized Functions: {len(authorized_function_ids or [])})"
            )
            return True

        except Exception as e:
            logger.error(f"❌ 建立 Session 失敗: {e}")
            return False

    @staticmethod
    def get_session(session_id: str) -> Optional[Dict[str, Any]]:
        """
        取得 Session 資料

        Args:
            session_id: Session ID

        Returns:
            Session 資料字典，如果不存在或過期則返回 None
        """
        redis_client = get_redis()
        if not redis_client:
            logger.warning("Redis 未連線，無法取得 Session")
            return None

        try:
            key = f"session:{session_id}"
            session_json = redis_client.get(key)

            if not session_json:
                logger.warning(f"Session 不存在或已過期: {session_id}")
                return None

            session_data = json.loads(session_json)

            # 更新最後存取時間並延長過期時間（延長 30 分鐘）
            session_data["last_access"] = get_taipei_now().isoformat()
            redis_client.setex(
                key,
                SESSION_EXTEND_SECONDS,
                json.dumps(session_data)
            )

            logger.debug(f"Session 已讀取並更新: {session_id}")
            return session_data

        except Exception as e:
            logger.error(f"❌ 取得 Session 失敗: {e}")
            return None

    @staticmethod
    def update_session_roles(
        session_id: str,
        role_ids: List[int],
        roles: List[Dict[str, Any]] = None
    ) -> bool:
        """
        更新 Session 中的角色資料（用於權限變更時即時更新）

        Args:
            session_id: Session ID
            role_ids: 新的角色 ID 陣列
            roles: 角色詳細資訊 [{"id": 1, "role_cname": "系統管理員", "role_ename": "Admin"}]

        Returns:
            是否更新成功
        """
        redis_client = get_redis()
        if not redis_client:
            logger.warning("Redis 未連線，無法更新 Session")
            return False

        try:
            key = f"session:{session_id}"
            session_json = redis_client.get(key)

            if not session_json:
                logger.warning(f"Session 不存在: {session_id}")
                return False

            session_data = json.loads(session_json)
            session_data["role_ids"] = role_ids
            if roles is not None:
                session_data["roles"] = roles
            session_data["last_access"] = get_taipei_now().isoformat()

            # 保持原有的 TTL
            ttl = redis_client.ttl(key)
            if ttl > 0:
                redis_client.setex(key, ttl, json.dumps(session_data))
                logger.info(f"✅ Session 角色已更新: {session_id} → {role_ids}")
                return True
            else:
                logger.warning(f"Session 已過期: {session_id}")
                return False

        except Exception as e:
            logger.error(f"❌ 更新 Session 失敗: {e}")
            return False

    @staticmethod
    def update_session_authorized_functions(
        session_id: str,
        authorized_function_ids: List[int]
    ) -> bool:
        """
        更新 Session 中的授權功能清單

        Args:
            session_id: Session ID
            authorized_function_ids: 新的授權功能 IDs

        Returns:
            是否更新成功
        """
        redis_client = get_redis()
        if not redis_client:
            logger.warning("Redis 未連線，無法更新 Session")
            return False

        try:
            key = f"session:{session_id}"
            session_json = redis_client.get(key)

            if not session_json:
                logger.warning(f"Session 不存在: {session_id}")
                return False

            session_data = json.loads(session_json)
            session_data["authorized_function_ids"] = authorized_function_ids
            session_data["last_access"] = get_taipei_now().isoformat()

            # 保持原有的 TTL
            ttl = redis_client.ttl(key)
            if ttl > 0:
                redis_client.setex(key, ttl, json.dumps(session_data))
                logger.info(
                    f"✅ Session 授權功能已更新: {session_id} → "
                    f"{len(authorized_function_ids)} 個功能"
                )
                return True
            else:
                logger.warning(f"Session 已過期: {session_id}")
                return False

        except Exception as e:
            logger.error(f"❌ 更新 Session 授權功能失敗: {e}")
            return False

    @staticmethod
    def update_user_sessions_authorized_functions(
        user_id: int,
        authorized_function_ids: List[int]
    ) -> int:
        """
        更新某使用者所有 Session 的授權功能清單

        當使用者的角色權限被修改時，更新其所有活躍 Session

        Args:
            user_id: 使用者 ID
            authorized_function_ids: 新的授權功能 IDs

        Returns:
            更新的 Session 數量
        """
        redis_client = get_redis()
        if not redis_client:
            logger.warning("Redis 未連線，無法更新使用者 Sessions")
            return 0

        try:
            # 搜尋所有 session
            pattern = "session:*"
            updated_count = 0

            for key in redis_client.scan_iter(match=pattern):
                session_json = redis_client.get(key)
                if session_json:
                    session_data = json.loads(session_json)
                    if session_data.get("user_id") == user_id:
                        # 更新授權功能清單
                        session_data["authorized_function_ids"] = authorized_function_ids
                        session_data["last_access"] = get_taipei_now().isoformat()

                        # 保持原有的 TTL
                        ttl = redis_client.ttl(key)
                        if ttl > 0:
                            redis_client.setex(key, ttl, json.dumps(session_data))
                            updated_count += 1

            if updated_count > 0:
                logger.info(
                    f"✅ 已更新使用者 {user_id} 的 {updated_count} 個 Session 授權功能 "
                    f"({len(authorized_function_ids)} 個功能)"
                )

            return updated_count

        except Exception as e:
            logger.error(f"❌ 更新使用者 Sessions 授權功能失敗: {e}")
            return 0

    @staticmethod
    def delete_session(session_id: str) -> bool:
        """
        刪除 Session（登出）

        Args:
            session_id: Session ID

        Returns:
            是否刪除成功
        """
        redis_client = get_redis()
        if not redis_client:
            logger.warning("Redis 未連線，無法刪除 Session")
            return False

        try:
            key = f"session:{session_id}"
            result = redis_client.delete(key)

            if result:
                logger.info(f"✅ Session 已刪除: {session_id}")
                return True
            else:
                logger.warning(f"Session 不存在: {session_id}")
                return False

        except Exception as e:
            logger.error(f"❌ 刪除 Session 失敗: {e}")
            return False

    @staticmethod
    def delete_user_sessions(user_id: int) -> int:
        """
        刪除使用者的所有 Session（用於強制登出）

        Args:
            user_id: 使用者 ID

        Returns:
            刪除的 Session 數量
        """
        redis_client = get_redis()
        if not redis_client:
            logger.warning("Redis 未連線，無法刪除使用者 Session")
            return 0

        try:
            # 搜尋所有 session
            pattern = "session:*"
            deleted_count = 0

            for key in redis_client.scan_iter(match=pattern):
                session_json = redis_client.get(key)
                if session_json:
                    session_data = json.loads(session_json)
                    if session_data.get("user_id") == user_id:
                        redis_client.delete(key)
                        deleted_count += 1

            if deleted_count > 0:
                logger.info(f"✅ 已刪除使用者 {user_id} 的 {deleted_count} 個 Session")

            return deleted_count

        except Exception as e:
            logger.error(f"❌ 刪除使用者 Session 失敗: {e}")
            return 0

    @staticmethod
    def get_session_ttl(session_id: str) -> Optional[int]:
        """
        取得 Session 剩餘有效時間（秒）

        Args:
            session_id: Session ID

        Returns:
            剩餘秒數，-1 表示沒有過期時間，-2 表示不存在
        """
        redis_client = get_redis()
        if not redis_client:
            return None

        try:
            key = f"session:{session_id}"
            ttl = redis_client.ttl(key)
            return ttl

        except Exception as e:
            logger.error(f"❌ 取得 Session TTL 失敗: {e}")
            return None

    @staticmethod
    def extend_session(session_id: str, extra_seconds: int = SESSION_EXPIRE_SECONDS) -> bool:
        """
        延長 Session 有效時間

        Args:
            session_id: Session ID
            extra_seconds: 延長秒數（預設為標準過期時間）

        Returns:
            是否延長成功
        """
        redis_client = get_redis()
        if not redis_client:
            return False

        try:
            key = f"session:{session_id}"
            result = redis_client.expire(key, extra_seconds)

            if result:
                logger.debug(f"Session 已延長: {session_id} → {extra_seconds}秒")
                return True
            else:
                logger.warning(f"Session 不存在: {session_id}")
                return False

        except Exception as e:
            logger.error(f"❌ 延長 Session 失敗: {e}")
            return False

    @staticmethod
    def get_active_sessions_count() -> int:
        """
        取得目前活躍的 Session 數量

        Returns:
            活躍 Session 數量
        """
        redis_client = get_redis()
        if not redis_client:
            return 0

        try:
            pattern = "session:*"
            count = sum(1 for _ in redis_client.scan_iter(match=pattern))
            return count

        except Exception as e:
            logger.error(f"❌ 取得活躍 Session 數量失敗: {e}")
            return 0
