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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="系統設定不存在"
        )

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
        "color_theme": profile.color_theme or "classic-blue"
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

    # 第一次遍歷：建立字典（只包含有權限的功能）
    for func in functions:
        # 節點類型(func_type=1)或有讀取權限的功能才加入
        if func.func_type == 1 or func.id in authorized_func_ids:
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

    # 第三次遍歷：移除沒有子功能的節點
    def filter_empty_nodes(node):
        """遞迴過濾空節點"""
        if node["func_type"] == 2:
            # 功能類型，保留
            return True

        # 節點類型，先過濾子節點
        node["children"] = [
            child for child in node["children"]
            if filter_empty_nodes(child)
        ]

        # 如果節點下沒有子功能，則移除
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
