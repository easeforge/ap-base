"""
System Management Routes
系統管理相關路由
"""

import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.message_codes import raise_msg
from app.models.user import User
from app.models.sysprofile import SysProfile
from app.models.systemfunction import SystemFunction
from app.models.roleright import RoleRight
from app.services.userlog_service import UserLogService
from app.services.language_service import LanguageService

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/profile", summary="取得系統設定")
async def get_system_profile(db: Session = Depends(get_db)):
    """
    取得系統設定資訊

    不需要認證（用於檢查系統維護狀態）
    """
    profile = db.query(SysProfile).filter(SysProfile.id == 1).first()

    if not profile:
        raise_msg(status.HTTP_404_NOT_FOUND, "ERR020001", entity="系統設定", id=1)

    return {
        "id": profile.id,
        "is_service": profile.is_service,
        "sys_url": profile.sys_url,
        "sys_title": profile.sys_title,
        "sys_copyright": profile.sys_copyright,
        "sys_organization": profile.sys_organization,
        "sys_mana_email": profile.sys_mana_email,
        "sys_languages": profile.sys_languages,
        "login_bg": profile.login_bg or "default",
        "color_theme": profile.color_theme or "classic-blue",
        "layout_mode": profile.layout_mode or "vertical"
    }


@router.get("/languages", summary="取得啟用語系")
async def get_active_languages(db: Session = Depends(get_db)):
    """
    取得目前啟用的語系資訊（公開端點，不需登入）

    供前端初始化語系切換器使用
    """
    languages = LanguageService.get_active_languages(db)

    profile = db.query(SysProfile).filter(SysProfile.id == 1).first()
    default_lang = profile.sys_languages[0] if profile and profile.sys_languages else "zh-TW"

    return {
        "default_language": default_lang,
        "languages": languages
    }


@router.get("/license", summary="取得授權資訊")
async def get_license_info():
    """
    回傳當前系統授權資訊（公開端點，不需登入）

    用途：
    - 前端判斷當前 edition（community / enterprise）
    - 判斷哪些 EE 功能已啟用，決定選單/路由是否顯示

    回傳範例（Community）：
        {"edition": "community", "features": [], "customer_name": null, ...}

    回傳範例（Enterprise）：
        {"edition": "enterprise", "features": ["scheduler", "ai"],
         "customer_name": "Example Corp", "expires_at": "2027-04-18T00:00:00+00:00", ...}
    """
    from app.core.license import LicenseManager
    from app.core.plugin import is_ee_loaded
    info = LicenseManager.info()
    info["ee_loaded"] = is_ee_loaded()
    return info


@router.get("/stats", summary="取得首頁統計資料")
async def get_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    首頁 dashboard 使用的統計資料

    回傳：
    - users_count: 啟用中的使用者總數
    - organizations_count: 啟用中的組織總數
    - recent_logins_7d: 近 7 日登入次數
    - active_notifications: 目前有效的系統通知數
    - recent_activities: 最近 10 筆操作日誌
    """
    from datetime import datetime, timedelta, timezone
    from app.models.organization import Organization
    from app.models.userlog import UserLog
    from app.models.systemnotification import SystemNotification

    users_count = db.query(User).filter(User.is_active == True).count()
    organizations_count = db.query(Organization).filter(Organization.is_active == True).count()

    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    recent_logins_7d = db.query(UserLog).filter(
        UserLog.module_item == 'Login',
        UserLog.action_at >= seven_days_ago,
        UserLog.err_detail.is_(None)
    ).count()

    now = datetime.now(timezone.utc)
    active_notifications = db.query(SystemNotification).filter(
        SystemNotification.is_active == True,
        SystemNotification.notice_start_at <= now,
        SystemNotification.notice_end_at >= now
    ).count()

    # 最近 10 筆活動（含使用者名稱 + 功能名稱）
    recent_logs = db.query(UserLog).order_by(UserLog.action_at.desc()).limit(10).all()
    recent_activities = []
    for log in recent_logs:
        log_user = db.query(User).filter(User.id == log.user_id).first()
        username = log_user.username if log_user else f'user#{log.user_id}'
        func = db.query(SystemFunction).filter(SystemFunction.id == log.system_function_id).first()
        func_name = func.func_name if func else None

        recent_activities.append({
            'id': log.id,
            'username': username,
            'module_item': log.module_item,
            'func_name': func_name,
            'action_at': log.action_at.isoformat() if log.action_at else None,
            'has_error': bool(log.err_detail)
        })

    return {
        'users_count': users_count,
        'organizations_count': organizations_count,
        'recent_logins_7d': recent_logins_7d,
        'active_notifications': active_notifications,
        'recent_activities': recent_activities
    }


@router.get("/message-codes", summary="取得系統訊息代碼對應表")
async def get_message_codes(
    lang: str = "zh-TW",
    db: Session = Depends(get_db)
):
    """
    取得系統訊息代碼對應表（公開端點，不需登入）

    依指定語系回傳 {訊息代碼: 訊息說明} 的映射字典

    用於前端將後端回傳的系統訊息代碼（SYS######）轉換為可讀的訊息文字
    """
    from app.models.systemcode import SystemCode
    codes = db.query(SystemCode).filter(
        SystemCode.code_type == "sys_message_code",
        SystemCode.is_active == True
    ).order_by(SystemCode.order).all()

    result = {}
    for code in codes:
        code_name = code.code_name or {}
        # 依序嘗試：指定語系 → zh-TW → 第一個可用值 → 代碼本身
        message = (
            code_name.get(lang)
            or code_name.get("zh-TW")
            or next(iter(code_name.values()), None)
            or code.code
        )
        result[code.code] = message

    return result


@router.get("/check", summary="系統檢查")
async def system_check(db: Session = Depends(get_db)):
    """
    系統健康檢查

    檢查：
    - 資料庫連線
    - 系統服務狀態
    """
    try:
        # 檢查資料庫連線
        profile = db.query(SysProfile).filter(SysProfile.id == 1).first()

        if not profile:
            return {
                "status": "error",
                "message": "系統設定不存在",
                "is_service": False
            }

        return {
            "status": "ok",
            "message": "系統運作正常" if profile.is_service else "系統維護中",
            "is_service": profile.is_service
        }

    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "is_service": False
        }


@router.get("/functions", summary="取得系統功能選單")
async def get_system_functions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    取得系統功能選單（依照 func_order 排序，並根據使用者權限過濾）

    需要提供 Bearer Token

    權限邏輯:
    - 只顯示使用者有「讀取」權限的功能
    - 多角色採用聯集(OR)邏輯
    - 節點下若無任何可用功能，則不顯示該節點
    """
    # 查詢所有啟用的功能，按 func_order 排序
    functions = db.query(SystemFunction).filter(
        SystemFunction.is_active == True
    ).order_by(SystemFunction.func_order).all()

    # 取得使用者的所有角色ID
    user_role_ids = current_user.user_role if isinstance(current_user.user_role, list) else []

    # 查詢使用者所有角色的權限設定
    user_rights = db.query(RoleRight).filter(
        RoleRight.user_role_id.in_(user_role_ids),
        RoleRight.is_read == True  # 必須有讀取權限
    ).all()

    # 建立有權限的功能ID集合
    authorized_func_ids = set(right.system_function_id for right in user_rights)

    # 建立功能字典和樹狀結構
    func_dict = {}

    from app.core.func_type import is_node_type, is_menu_type

    # 第一次遍歷：建立字典（只包含有權限的功能）
    for func in functions:
        # 節點類型保留（沒權限概念），其他類型需有讀取權限
        if is_node_type(func.func_type) or func.id in authorized_func_ids:
            func_dict[func.id] = {
                "id": func.id,
                "func_code": func.func_code,
                "func_name": func.func_name,
                "func_type": func.func_type,
                "func_order": func.func_order,
                "func_icon": func.func_icon,
                "module_code": func.module_code,
                "module_item": func.module_item,
                "upper_func_id": func.upper_func_id,
                "description": func.description,
                "is_mana": func.is_mana,
                "children": []
            }

    # 第二次遍歷：建立樹狀結構
    for func_id, func_data in list(func_dict.items()):
        if func_data["upper_func_id"] == 0:
            # 根節點暫時不處理
            pass
        elif func_data["upper_func_id"] in func_dict:
            # 子節點加入父節點
            func_dict[func_data["upper_func_id"]]["children"].append(func_data)

    # 第三次遍歷：保留顯示在選單的類型、以及仍有可見子項的節點
    def filter_empty_nodes(node):
        """
        遞迴過濾：
        - 顯示在選單的葉節點（目前只有 PAGE, shows_in_menu=True）直接保留
        - 節點類型（不是 leaf）要先過濾子項，若無可見子項則移除
        - 其他非選單類型（API_SERVICE / TASK）不顯示於菜單
        """
        t = node["func_type"]
        # 葉節點且要出現在選單 → 保留
        if is_menu_type(t) and not is_node_type(t):
            return True
        # 非節點也非選單項 → 過濾
        if not is_node_type(t):
            return False

        # 節點類型：先過濾子項
        node["children"] = [
            child for child in node["children"]
            if filter_empty_nodes(child)
        ]
        return len(node["children"]) > 0

    # 收集根節點並過濾
    root_functions = []
    for func_id, func_data in func_dict.items():
        if func_data["upper_func_id"] == 0:
            if filter_empty_nodes(func_data):
                root_functions.append(func_data)

    # 按 func_order 排序根節點
    root_functions.sort(key=lambda x: x["func_order"])

    return root_functions
