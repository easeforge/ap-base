"""
Base AP Plugin System

讓 Enterprise Edition（EE，ap-base-ee）能在 Community Edition（CE）基礎上
掛入新的路由、啟動 hook、選單項目等，而不需要修改 CE 本身的檔案。

設計原則：
- CE 不知道 EE 有哪些功能（解耦）
- EE 匯入期間呼叫 register_* 註冊自己
- CE 在 lifespan 啟動時跑 run_startup_hooks()，註冊時機完成後才開始服務
- 所有 EE 模組必須先檢查 LicenseManager.has('xxx')，授權缺失時不註冊

EE 模組典型寫法：
    # app/ee/scheduler/__init__.py  (僅存於 ap-base-ee)
    from app.core.license import LicenseManager
    from app.core.plugin import register_router, register_startup

    if LicenseManager.has('scheduler'):
        from .routes import router
        register_router(router, prefix='/api/ee/scheduler', tags=['EE-排程'])
        register_startup(start_scheduler)

然後在 main.py 啟動時匯入 `app.ee`（若存在），觸發這些註冊。
"""

import asyncio
import logging
from typing import Callable, List, Dict, Any, Optional
from fastapi import APIRouter

logger = logging.getLogger(__name__)


# ============================================================
# Registry（class-level 共用狀態）
# ============================================================
_startup_hooks: List[Callable] = []
_shutdown_hooks: List[Callable] = []
_route_registrations: List[Dict[str, Any]] = []
_menu_extensions: List[Dict[str, Any]] = []


def register_startup(fn: Callable) -> None:
    """
    註冊啟動時執行的函式（可為 sync 或 async）

    用於 EE 啟動 scheduler、連接外部服務等初始化動作。
    """
    _startup_hooks.append(fn)
    logger.debug(f"Registered startup hook: {fn.__name__}")


def register_shutdown(fn: Callable) -> None:
    """註冊關閉時執行的清理函式"""
    _shutdown_hooks.append(fn)
    logger.debug(f"Registered shutdown hook: {fn.__name__}")


def register_router(
    router: APIRouter,
    prefix: str,
    tags: Optional[List[str]] = None
) -> None:
    """
    註冊額外的路由

    main.py 會在所有 CE routes 掛載完後，統一掛載這些 EE routes。
    前綴建議使用 /api/ee/ 便於識別。
    """
    _route_registrations.append({
        'router': router,
        'prefix': prefix,
        'tags': tags or []
    })
    logger.debug(f"Registered router: {prefix}")


def register_menu(
    parent_code: str,
    func_code: str,
    label: Dict[str, str],
    icon: Optional[str] = None,
    order: int = 9999
) -> None:
    """
    註冊前端選單項目（由 /api/system/functions 端點合併到回傳中）

    Args:
        parent_code: 父節點 func_code（如 'system_mana'）
        func_code:   新功能的 func_code（對應前端路由）
        label:       多語系標籤 {"zh-TW": "...", "en": "..."}
        icon:        emoji 或 Material-UI 圖示名
        order:       排序

    注意：這個機制用於「動態掛入」的 EE 選單，不進資料庫。
    若要存進 system_functions 表做權限控管，由 EE 自己在啟動時插入。
    """
    _menu_extensions.append({
        'parent_code': parent_code,
        'func_code': func_code,
        'label': label,
        'icon': icon,
        'order': order
    })


async def run_startup_hooks() -> None:
    """由 main.py lifespan 呼叫"""
    for hook in _startup_hooks:
        try:
            if asyncio.iscoroutinefunction(hook):
                await hook()
            else:
                hook()
        except Exception as e:
            logger.error(f"Startup hook {hook.__name__} failed: {e}", exc_info=True)


async def run_shutdown_hooks() -> None:
    """由 main.py lifespan 呼叫"""
    for hook in _shutdown_hooks:
        try:
            if asyncio.iscoroutinefunction(hook):
                await hook()
            else:
                hook()
        except Exception as e:
            logger.error(f"Shutdown hook {hook.__name__} failed: {e}", exc_info=True)


def get_registered_routers() -> List[Dict[str, Any]]:
    """main.py 用來取得所有註冊的 EE 路由，統一掛載"""
    return list(_route_registrations)


def get_registered_menus() -> List[Dict[str, Any]]:
    """取得所有註冊的動態選單項目"""
    return list(_menu_extensions)


def load_ee_if_present() -> bool:
    """
    嘗試匯入 app.ee 套件（存在於 ap-base-ee repo 的商用版模組）

    CE 環境下此套件不存在，安靜返回 False。
    EE 環境下匯入時會觸發各 EE 模組的 register_* 呼叫。

    Returns:
        True 成功載入 EE 套件
        False CE 環境（無 app.ee）
    """
    try:
        import importlib
        importlib.import_module('app.ee')
        logger.info("Enterprise Edition modules loaded")
        return True
    except ImportError as e:
        # CE 環境預期狀態
        logger.debug(f"No Enterprise Edition found (CE mode): {e}")
        return False
    except Exception as e:
        logger.error(f"Failed to load Enterprise Edition: {e}", exc_info=True)
        return False
