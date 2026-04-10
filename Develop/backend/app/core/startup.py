"""
Application Startup
應用程式啟動初始化
"""

import logging
from app.core.database import SessionLocal
from app.core.dynamic_router import init_router

logger = logging.getLogger(__name__)


def startup_event():
    """應用程式啟動事件處理"""
    logger.info("應用程式啟動中...")

    # 初始化資料庫連線
    db = SessionLocal()

    try:
        # 初始化動態路由器
        logger.info("正在載入動態路由器...")
        init_router(db)
        logger.info("動態路由器載入完成")

        # 可以在這裡加入其他啟動初始化任務
        # 例如：快取預熱、檢查資料庫連線等

    except Exception as e:
        logger.error(f"啟動初始化失敗: {str(e)}")
        raise
    finally:
        db.close()

    logger.info("應用程式啟動完成")


def shutdown_event():
    """應用程式關閉事件處理"""
    logger.info("應用程式正在關閉...")
    # 可以在這裡加入清理任務
    logger.info("應用程式關閉完成")
