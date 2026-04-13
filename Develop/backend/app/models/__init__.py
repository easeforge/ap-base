"""
Database Models
資料庫模型
"""

# ============================================
# 基底平台 Model（Base AP — 請勿修改此區塊）
# ============================================
from app.models.organization import Organization
from app.models.userrole import UserRole
from app.models.user import User
from app.models.systemfunction import SystemFunction
from app.models.sysprofile import SysProfile
from app.models.syslanguage import SysLanguage
from app.models.userlog import UserLog
from app.models.systemcode import SystemCode
from app.models.roleright import RoleRight
from app.models.systemnotification import SystemNotification

__all__ = [
    "Organization",
    "UserRole",
    "User",
    "SystemFunction",
    "SysProfile",
    "SysLanguage",
    "UserLog",
    "SystemCode",
    "RoleRight",
    "SystemNotification",
]

# ============================================
# 應用專案 Model（自動掃描 ap 開頭的模組）
# ============================================
import importlib
import pkgutil
import app.models as _models_pkg

for _, _name, _ in pkgutil.iter_modules(_models_pkg.__path__):
    if _name.startswith("ap"):
        _mod = importlib.import_module(f"app.models.{_name}")
        # 自動將模組中的 SQLAlchemy Model 類別加入 __all__
        for _attr in dir(_mod):
            _obj = getattr(_mod, _attr)
            if isinstance(_obj, type) and hasattr(_obj, "__tablename__"):
                globals()[_attr] = _obj
                __all__.append(_attr)
