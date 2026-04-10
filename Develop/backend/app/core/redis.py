"""
Redis Connection Management
Redis 連線管理
"""

import redis
from typing import Optional
from app.core.config import settings

# 全域 Redis 連線實例
_redis_client: Optional[redis.Redis] = None


def get_redis() -> redis.Redis:
    """
    取得 Redis 連線實例

    Returns:
        redis.Redis: Redis 連線物件
    """
    global _redis_client

    if _redis_client is None:
        _redis_client = redis.from_url(
            settings.REDIS_URL,
            decode_responses=True  # 自動解碼為字串
        )

    return _redis_client


def close_redis():
    """關閉 Redis 連線"""
    global _redis_client

    if _redis_client is not None:
        _redis_client.close()
        _redis_client = None
