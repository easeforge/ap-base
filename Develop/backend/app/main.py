"""
Base AP Backend Main Application
FastAPI 主應用程式 - 後臺管理基底平台
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from app.core.config import settings
from app.core.redis_client import init_redis, close_redis, redis_health_check
from app.routes import (
    auth, system, organization, sysprofile,
    user, permissions,
    systemcode, systemfunction, systemnotification,
    userrole, roleright, userlog, syslanguage,
)

# 配置日誌
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)


# 生命週期事件
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 啟動時執行
    logger.info("應用程式啟動中...")

    # 測試資料庫連接
    try:
        from app.core.database import engine
        from sqlalchemy import text
        from urllib.parse import urlparse

        # 解析資料庫 URL 以顯示連接位置
        db_url = urlparse(settings.DATABASE_URL)
        db_location = f"{db_url.hostname}:{db_url.port}"
        db_name = db_url.path.lstrip('/')

        with engine.connect() as conn:
            result = conn.execute(text("SELECT version()"))
            version = result.scalar()
            pg_version = version.split()[1] if version else 'Unknown'
            logger.info(f"資料庫連接成功: {db_location}/{db_name} (PostgreSQL {pg_version})")

        # 從資料庫載入系統時區設定
        from app.core.timezone import load_timezone_from_db, get_sys_timezone
        load_timezone_from_db()
        logger.info(f"系統時區: {get_sys_timezone()}")
    except Exception as e:
        logger.error(f"資料庫連接失敗: {e}")
        raise  # 資料庫連接失敗應該中止啟動

    # 初始化 Redis
    try:
        init_redis(
            host=getattr(settings, 'REDIS_HOST', 'localhost'),
            port=getattr(settings, 'REDIS_PORT', 6379),
            db=getattr(settings, 'REDIS_DB', 0),
            password=getattr(settings, 'REDIS_PASSWORD', None)
        )
    except Exception as e:
        logger.warning(f"Redis 初始化失敗,使用記憶體儲存: {e}")

    # 同步語系檔案
    try:
        from app.core.database import SessionLocal
        from app.services.language_service import LanguageService
        sync_db = SessionLocal()
        try:
            results = LanguageService.sync_locale_files(sync_db)
            if results:
                synced = [f"{k}({v})" for k, v in results.items()]
                logger.info(f"語系檔同步: {', '.join(synced)}")
            else:
                logger.info("語系檔同步: 無需同步")
        finally:
            sync_db.close()
    except Exception as e:
        logger.warning(f"語系檔同步失敗: {e}")

    logger.info("應用程式啟動完成")

    yield  # 應用程式運行期間

    # 關閉時執行
    logger.info("應用程式關閉中...")
    close_redis()
    logger.info("應用程式已關閉")


# 建立 FastAPI 應用程式
app = FastAPI(
    title="Base AP Management System API",
    description="後臺管理基底平台 API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Exception handlers for better debugging
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """處理請求驗證錯誤，記錄詳細資訊"""
    logger.error(f"Request Validation Error at {request.url}")
    logger.error(f"   Errors: {exc.errors()}")
    logger.error(f"   Body: {exc.body}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors(), "body": exc.body}
    )

@app.exception_handler(ValidationError)
async def pydantic_validation_exception_handler(request: Request, exc: ValidationError):
    """處理 Pydantic 驗證錯誤（response model）"""
    logger.error(f"Pydantic Validation Error at {request.url}")
    logger.error(f"   Errors: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors()}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """處理未預期的例外，記錄完整 traceback"""
    import traceback
    logger.error(f"Unhandled Exception at {request.method} {request.url}")
    logger.error(f"   Type: {type(exc).__name__}")
    logger.error(f"   Message: {str(exc)}")
    logger.error(f"   Traceback:\n{''.join(traceback.format_exception(exc))}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": f"{type(exc).__name__}: {str(exc)}"}
    )

# CORS 設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 掛載靜態檔案
app.mount("/images", StaticFiles(directory=str(settings.images_path)), name="images")
app.mount("/uploads", StaticFiles(directory=str(settings.uploads_path)), name="uploads")
app.mount("/locales", StaticFiles(directory=str(settings.locales_path)), name="locales")

# 註冊路由 - 認證
app.include_router(auth.router, prefix="/api/auth", tags=["認證"])

# 系統管理
app.include_router(system.router, prefix="/api/system", tags=["系統管理"])
app.include_router(sysprofile.router, prefix="/api/sys_profiles", tags=["系統設定"])
app.include_router(systemcode.router, prefix="/api/system_codes", tags=["系統代碼管理"])
app.include_router(systemfunction.router, prefix="/api/system_functions", tags=["系統功能管理"])
app.include_router(systemnotification.router, prefix="/api/system_notifications", tags=["系統通知管理"])
app.include_router(syslanguage.router, prefix="/api/sys_languages", tags=["語系管理"])

# 組織與使用者管理
app.include_router(organization.router, prefix="/api/organizations", tags=["組織管理"])
app.include_router(user.router, prefix="/api/users", tags=["使用者管理"])
app.include_router(userrole.router, prefix="/api/user_roles", tags=["使用者角色管理"])
app.include_router(roleright.router, prefix="/api/role_rights", tags=["角色權限管理"])
app.include_router(permissions.router, prefix="/api/permissions", tags=["權限查詢"])
app.include_router(userlog.router, prefix="/api/user_logs", tags=["使用者日誌"])


@app.get("/", tags=["根路徑"])
async def root():
    """API 根路徑"""
    return {
        "message": "Base AP Management System API",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
        "docs": "/docs"
    }


@app.get("/api/health", tags=["健康檢查"])
async def health_check():
    """健康檢查端點"""
    redis_status = "healthy" if redis_health_check() else "unavailable (using memory storage)"

    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT,
        "redis": redis_status
    }


@app.get("/api/debug/routes", tags=["調試"])
async def debug_routes():
    """列出所有路由（僅供調試）"""
    routes_info = []
    for route in app.routes:
        if hasattr(route, 'path'):
            routes_info.append({
                "path": route.path,
                "methods": list(route.methods) if hasattr(route, 'methods') else []
            })
    return {"total_routes": len(routes_info), "routes": routes_info}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=settings.DEBUG
    )
