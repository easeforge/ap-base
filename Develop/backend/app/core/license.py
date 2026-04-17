"""
Base AP License Manager

本模組為 Community Edition 公開程式碼的一部分（MIT 授權），負責：
- 驗證 license.key 檔案（Ed25519 簽章）
- 提供 has(feature) 查詢介面給其他模組使用

安全模型：
- 驗證邏輯完全公開（任何人可稽核）
- 安全性來自「只有商用版簽發者持有私鑰」
- 沒有 license.key 或簽章無效時 → Community Edition，無任何商用功能
- license.key 有效時 → 依 payload.features 啟用對應 EE 模組

EE 模組的程式碼本身只存在於商用版 repo（ap-base-ee）。
即使有效的 license 檔案，沒有 EE 程式碼也啟用不了任何功能。
這是雙重保護。
"""

import json
import base64
import logging
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional, Set, Dict, Any

logger = logging.getLogger(__name__)


# ============================================================
# Ed25519 公鑰（由商用版簽發端持有對應私鑰）
# ============================================================
# 開發/測試階段的公鑰佔位符。商用版正式發布前應由商用版團隊：
#   1. 執行 tools/generate_license_keypair.py 產生正式 keypair
#   2. 將 public key 替換到下方 LICENSE_PUBLIC_KEY_HEX
#   3. 將 private key 安全保存（HSM / 離線環境），僅用於簽發 license
#
# 替換後需同步發布新版 CE，舊簽發的 license 將失效。
LICENSE_PUBLIC_KEY_HEX: Optional[str] = "146c662d217331a4d88978592676d1ff1c060d2b385426fcf48675fbe8758af8"


class LicenseManager:
    """
    授權管理器（singleton via class attributes）

    使用方式：
        from app.core.license import LicenseManager

        # 在啟動時載入 license.key
        LicenseManager.load_from_file('./license.key')

        # 其他模組查詢
        if LicenseManager.has('scheduler'):
            # 啟用排程功能
            ...

        # 取得授權資訊給前端
        info = LicenseManager.info()
    """

    _edition: str = 'community'
    _features: Set[str] = set()
    _customer_id: Optional[str] = None
    _customer_name: Optional[str] = None
    _issued_at: Optional[datetime] = None
    _expires_at: Optional[datetime] = None
    _max_users: Optional[int] = None
    _max_organizations: Optional[int] = None
    _loaded: bool = False
    _load_error: Optional[str] = None

    @classmethod
    def load_from_file(cls, path: str = './license.key') -> bool:
        """
        從檔案載入並驗證 license

        Returns:
            True 成功載入有效的 EE license
            False 檔案不存在、格式錯誤、簽章無效、已過期 → 維持 Community 狀態
        """
        cls._loaded = True
        cls._load_error = None

        license_path = Path(path)
        if not license_path.exists():
            logger.info(f"No license file found at {path}, running Community Edition")
            return False

        try:
            with open(license_path, 'r', encoding='utf-8') as f:
                license_doc = json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            cls._load_error = f"Failed to parse license file: {e}"
            logger.warning(cls._load_error)
            return False

        # 驗證結構
        if not isinstance(license_doc, dict) or 'payload' not in license_doc or 'signature' not in license_doc:
            cls._load_error = "Invalid license file structure (missing payload/signature)"
            logger.warning(cls._load_error)
            return False

        # 驗證簽章
        if not cls._verify_signature(license_doc['payload'], license_doc['signature']):
            cls._load_error = "License signature verification failed"
            logger.warning(cls._load_error)
            return False

        payload = license_doc['payload']

        # 檢查過期
        expires_at_str = payload.get('expires_at')
        if expires_at_str:
            try:
                expires_at = datetime.fromisoformat(expires_at_str.replace('Z', '+00:00'))
                if expires_at < datetime.now(timezone.utc):
                    cls._load_error = f"License expired at {expires_at_str}"
                    logger.warning(cls._load_error)
                    return False
                cls._expires_at = expires_at
            except ValueError:
                cls._load_error = f"Invalid expires_at format: {expires_at_str}"
                logger.warning(cls._load_error)
                return False

        # 解析 payload
        cls._edition = 'enterprise'
        cls._features = set(payload.get('features', []))
        cls._customer_id = payload.get('customer_id')
        cls._customer_name = payload.get('customer_name')
        cls._max_users = payload.get('max_users')
        cls._max_organizations = payload.get('max_organizations')

        issued_at_str = payload.get('issued_at')
        if issued_at_str:
            try:
                cls._issued_at = datetime.fromisoformat(issued_at_str.replace('Z', '+00:00'))
            except ValueError:
                pass

        logger.info(
            f"License loaded: edition=enterprise, customer={cls._customer_name}, "
            f"features={cls._features}, expires_at={cls._expires_at}"
        )
        return True

    @classmethod
    def _verify_signature(cls, payload: Dict[str, Any], signature_b64: str) -> bool:
        """驗證 Ed25519 簽章"""
        if not LICENSE_PUBLIC_KEY_HEX:
            logger.warning("LICENSE_PUBLIC_KEY_HEX not set, cannot verify any license")
            return False

        try:
            from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
            from cryptography.exceptions import InvalidSignature
        except ImportError:
            logger.error("cryptography library not available for license verification")
            return False

        try:
            public_key_bytes = bytes.fromhex(LICENSE_PUBLIC_KEY_HEX)
            public_key = Ed25519PublicKey.from_public_bytes(public_key_bytes)

            # canonical JSON serialization（與簽發時保持一致）
            payload_bytes = json.dumps(payload, sort_keys=True, separators=(',', ':')).encode('utf-8')
            signature_bytes = base64.urlsafe_b64decode(signature_b64)

            public_key.verify(signature_bytes, payload_bytes)
            return True
        except (InvalidSignature, ValueError, Exception) as e:
            logger.warning(f"Signature verification failed: {e}")
            return False

    @classmethod
    def has(cls, feature: str) -> bool:
        """
        檢查某功能是否啟用

        EE 模組在註冊路由/啟動 hook 前呼叫此方法：
            if not LicenseManager.has('scheduler'):
                return
        """
        return feature in cls._features

    @classmethod
    def info(cls) -> Dict[str, Any]:
        """回傳授權資訊（給前端 API / Dashboard 顯示用）"""
        return {
            'edition': cls._edition,
            'features': sorted(cls._features),
            'customer_id': cls._customer_id,
            'customer_name': cls._customer_name,
            'issued_at': cls._issued_at.isoformat() if cls._issued_at else None,
            'expires_at': cls._expires_at.isoformat() if cls._expires_at else None,
            'max_users': cls._max_users,
            'max_organizations': cls._max_organizations,
            'load_error': cls._load_error,
        }
