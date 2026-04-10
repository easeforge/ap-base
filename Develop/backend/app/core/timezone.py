"""
Timezone Utilities
全域時區工具模組

時區設定來源: sys_profiles.sys_timezone (資料庫)
所有需要取得「現在時間」的地方統一使用此模組，確保時區一致。

使用方式:
    from app.core.timezone import get_now, get_timezone, SYS_TIMEZONE_CACHE
"""

import logging
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo

logger = logging.getLogger(__name__)

# 全域快取：系統時區字串（預設台北）
_cached_timezone: str = "Asia/Taipei"


def get_sys_timezone() -> str:
    """取得目前快取的系統時區字串"""
    return _cached_timezone


def get_timezone() -> ZoneInfo:
    """取得目前系統時區物件"""
    try:
        return ZoneInfo(_cached_timezone)
    except Exception:
        logger.warning(f"無效的時區設定 '{_cached_timezone}'，使用預設 Asia/Taipei")
        return ZoneInfo("Asia/Taipei")


def get_now() -> datetime:
    """取得系統時區的當前時間（供 Model default / 手動賦值使用）"""
    return datetime.now(timezone.utc).astimezone(get_timezone())


def load_timezone_from_db():
    """
    從資料庫讀取 sys_profiles.sys_timezone 並更新全域快取。
    應在應用程式啟動時呼叫一次。
    """
    global _cached_timezone
    try:
        from sqlalchemy import text
        from app.core.database import engine
        with engine.connect() as conn:
            result = conn.execute(
                text("SELECT sys_timezone FROM sys_profiles WHERE id = 1")
            )
            row = result.fetchone()
            if row and row[0]:
                _cached_timezone = row[0]
                logger.info(f"系統時區已從資料庫載入: {_cached_timezone}")
            else:
                logger.warning("sys_profiles 無資料，使用預設時區: Asia/Taipei")
    except Exception as e:
        logger.warning(f"載入系統時區失敗: {e}，使用預設: {_cached_timezone}")


def update_timezone(tz_str: str):
    """
    更新全域時區快取（在 sys_profile 更新時呼叫）。
    同時驗證時區字串是否有效。
    """
    global _cached_timezone
    try:
        ZoneInfo(tz_str)  # 驗證有效性
        _cached_timezone = tz_str
        logger.info(f"系統時區已更新: {_cached_timezone}")
    except Exception:
        raise ValueError(f"無效的時區: {tz_str}")
