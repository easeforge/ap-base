"""
Application Configuration
使用 Pydantic Settings 管理環境變數
"""

from typing import List
from pydantic_settings import BaseSettings
from pydantic import Field
import os
from pathlib import Path


class Settings(BaseSettings):
    """應用程式設定"""

    # Application
    ENVIRONMENT: str = Field(default="production")
    DEBUG: bool = Field(default=False)
    LOG_LEVEL: str = Field(default="INFO")
    PORT: int = Field(default=10181)

    # Database (必須透過 .env 或環境變數設定)
    DATABASE_URL: str = Field(
        default="postgresql://user:password@localhost:5432/baseAP"
    )

    # Redis
    REDIS_HOST: str = Field(default="localhost")
    REDIS_PORT: int = Field(default=6379)
    REDIS_DB: int = Field(default=1)
    REDIS_PASSWORD: str = Field(default="")

    # Security (生產環境務必更換)
    SECRET_KEY: str = Field(
        default="CHANGE-THIS-SECRET-KEY-IN-PRODUCTION"
    )
    ALGORITHM: str = Field(default="HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30)

    # CORS
    # 開發環境明確列出前端來源（allow_credentials=True 不允許 wildcard）
    # 生產環境應該設定為特定的前端網域
    ALLOWED_ORIGINS: List[str] = Field(
        default=["http://localhost:10180", "http://127.0.0.1:10180"]
    )

    # File Upload
    MAX_UPLOAD_SIZE_MB: int = Field(default=50)
    ALLOWED_IMAGE_TYPES: List[str] = Field(
        default=[
            "image/png",
            "image/jpeg",
            "image/jpg",
            "image/gif",
            "image/svg+xml"
        ]
    )
    ALLOWED_DOCUMENT_TYPES: List[str] = Field(
        default=[
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",  # .xlsx
            "application/vnd.ms-excel",                                            # .xls
            "text/csv",                                                            # .csv
            "application/csv",                                                     # .csv (alt)
            "text/plain",                                                          # .csv (some browsers)
        ]
    )

    # Shared Data Directory
    SHAREDATA_DIR: str = Field(default="sharedata")

    @property
    def sharedata_path(self) -> Path:
        """共用資料目錄的絕對路徑"""
        base_dir = Path(__file__).parent.parent.parent
        return base_dir / self.SHAREDATA_DIR

    @property
    def images_path(self) -> Path:
        """圖片目錄"""
        return self.sharedata_path / "images"

    @property
    def uploads_path(self) -> Path:
        """上傳檔案目錄"""
        return self.sharedata_path / "uploads"

    @property
    def locales_path(self) -> Path:
        """語系檔案目錄"""
        return self.sharedata_path / "locales"

    class Config:
        env_file = ".env"
        case_sensitive = True


# 建立全域設定實例
settings = Settings()

# 確保目錄存在
settings.images_path.mkdir(parents=True, exist_ok=True)
settings.uploads_path.mkdir(parents=True, exist_ok=True)
settings.locales_path.mkdir(parents=True, exist_ok=True)
