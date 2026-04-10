"""
Redis Client Configuration
Redis 客戶端配置
"""

import logging
from typing import Optional
import redis
from redis import Redis, ConnectionPool

logger = logging.getLogger(__name__)

# Redis 連線池
_redis_pool: Optional[ConnectionPool] = None
_redis_client: Optional[Redis] = None


def init_redis(
    host: str = "localhost",
    port: int = 6379,
    db: int = 0,
    password: Optional[str] = None,
    decode_responses: bool = True,
    max_connections: int = 50
):
    """
    初始化 Redis 連線池

    Args:
        host: Redis 主機位址
        port: Redis 埠號
        db: Redis 資料庫編號 (0-15)
        password: Redis 密碼
        decode_responses: 是否自動解碼回應為字串
        max_connections: 最大連線數
    """
    global _redis_pool, _redis_client

    try:
        _redis_pool = ConnectionPool(
            host=host,
            port=port,
            db=db,
            password=password,
            decode_responses=decode_responses,
            max_connections=max_connections,
            socket_connect_timeout=5,
            socket_timeout=5
        )

        _redis_client = Redis(connection_pool=_redis_pool)

        # 測試連線
        _redis_client.ping()

        logger.info(f"✅ Redis 連線成功: {host}:{port} (DB {db})")

    except redis.ConnectionError as e:
        logger.error(f"❌ Redis 連線失敗: {e}")
        logger.warning("⚠️  系統將使用記憶體儲存 (不適合生產環境)")
        _redis_client = None
    except Exception as e:
        logger.error(f"❌ Redis 初始化失敗: {e}")
        _redis_client = None


def get_redis() -> Optional[Redis]:
    """
    取得 Redis 客戶端

    Returns:
        Redis 客戶端 或 None (如果連線失敗)
    """
    return _redis_client


def close_redis():
    """關閉 Redis 連線池"""
    global _redis_pool, _redis_client

    if _redis_pool:
        _redis_pool.disconnect()
        _redis_pool = None

    _redis_client = None
    logger.info("Redis 連線已關閉")


# 健康檢查
def redis_health_check() -> bool:
    """
    Redis 健康檢查

    Returns:
        是否正常運作
    """
    try:
        if _redis_client:
            _redis_client.ping()
            return True
        return False
    except Exception:
        return False
