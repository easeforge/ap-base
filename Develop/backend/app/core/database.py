"""
Database Connection and Session Management
資料庫連線與 Session 管理
"""

from sqlalchemy import create_engine, event, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator

from app.core.config import settings

# 建立資料庫引擎
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,  # 檢查連線是否有效
    pool_recycle=1800,   # 每 30 分鐘回收連線（NAS 環境）
    pool_size=5,         # 連線池大小
    max_overflow=10,     # 最大額外連線數
    pool_timeout=20,     # 等待連線的最大秒數
    connect_args={"connect_timeout": 10},  # 建立連線逾時（秒）
    echo=settings.DEBUG  # 開發環境顯示 SQL
)


@event.listens_for(engine, "connect")
def _set_timezone_on_connect(dbapi_connection, connection_record):
    """
    新建連線時，設定 session 時區為系統設定值。
    時區值來自 app.core.timezone 的全域快取。
    """
    from app.core.timezone import get_sys_timezone
    tz = get_sys_timezone()
    cursor = dbapi_connection.cursor()
    cursor.execute(f"SET timezone = '{tz}'")
    cursor.close()


@event.listens_for(engine, "checkout")
def _set_timezone_on_checkout(dbapi_connection, connection_record, connection_proxy):
    """
    每次從連線池取出連線時，確保時區與系統設定一致。
    """
    from app.core.timezone import get_sys_timezone
    tz = get_sys_timezone()
    cursor = dbapi_connection.cursor()
    cursor.execute(f"SET timezone = '{tz}'")
    cursor.close()


# 建立 SessionLocal 類別
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# 建立 Base 類別
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """
    取得資料庫 Session 的依賴注入函數

    使用範例:
        @app.get("/users")
        def get_users(db: Session = Depends(get_db)):
            users = db.query(User).all()
            return users
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
