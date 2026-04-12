"""
System Notifications Routes
系統通知管理路由
"""

import logging
from typing import List, Optional
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc, cast, String
from sqlalchemy.dialects.postgresql import JSONB

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.permissions import check_permission
from app.models.user import User
from app.models.systemnotification import SystemNotification, NotificationCloseDate
from app.schemas.systemnotification import (
    SystemNotificationCreate,
    SystemNotificationUpdate,
    SystemNotificationResponse,
    NotificationCloseDateCreate,
    NotificationCloseDateResponse,
    TodayNotificationsResponse,
    DataTablesRequest,
    DataTablesResponse
)
from app.services.userlog_service import UserLogService

logger = logging.getLogger(__name__)
router = APIRouter()


def notification_to_dict(notification: SystemNotification) -> dict:
    """將通知物件轉換為完整字典"""
    return {
        "id": notification.id,
        "notice_subject": notification.notice_subject,
        "notice_description": notification.notice_description,
        "notice_start_at": notification.notice_start_at.isoformat() if notification.notice_start_at else None,
        "notice_end_at": notification.notice_end_at.isoformat() if notification.notice_end_at else None,
        "notice_order": notification.notice_order,
        "is_active": notification.is_active,
        "edit_by": notification.edit_by,
        "created_at": notification.created_at.isoformat() if notification.created_at else None,
        "updated_at": notification.updated_at.isoformat() if notification.updated_at else None
    }


@router.get("/home/notifications", response_model=TodayNotificationsResponse, summary="取得今日應顯示的通知")
async def get_home_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    取得今日應顯示的通知（用於 Home 頁面 Modal）

    - 篩選條件：啟用、在時間範圍內、使用者今日未關閉通知
    - 排序：依照 notice_order 升序

    需要提供 Bearer Token
    """
    now = datetime.now()
    today = date.today()

    logger.info(f"[GET /home/notifications] 使用者 {current_user.id} ({current_user.username}) 查詢通知，日期: {today}")

    # 檢查使用者今日是否已關閉通知
    closed_today = db.query(NotificationCloseDate).filter(
        and_(
            NotificationCloseDate.edit_by == current_user.id,
            NotificationCloseDate.closed_at == today
        )
    ).first()

    # 如果今日已關閉通知，返回空列表
    if closed_today:
        logger.info(f"[GET /home/notifications] 使用者 {current_user.id} 今日已關閉通知 (記錄ID: {closed_today.id})，返回空列表")
        return TodayNotificationsResponse(notifications=[])

    # 查詢今日有效的通知
    notifications = db.query(SystemNotification).filter(
        and_(
            SystemNotification.is_active == True,
            SystemNotification.notice_start_at <= now,
            SystemNotification.notice_end_at >= now
        )
    ).order_by(SystemNotification.notice_order.asc()).all()

    logger.info(f"[GET /home/notifications] 使用者 {current_user.id} 查詢到 {len(notifications)} 則有效通知")

    return TodayNotificationsResponse(notifications=notifications)


@router.get("/", response_model=List[SystemNotificationResponse], summary="取得系統通知列表")
async def get_notifications(
    skip: int = Query(0, ge=0, description="略過筆數"),
    limit: int = Query(100, ge=1, le=1000, description="限制筆數"),
    is_active: Optional[bool] = Query(None, description="篩選：是否啟用"),
    notice_order: Optional[int] = Query(None, description="篩選：訊息次序"),
    search: Optional[str] = Query(None, description="全文檢索：主旨"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    取得系統通知列表

    需要 system_notifications 功能的 read 權限

    - **skip**: 略過筆數
    - **limit**: 限制筆數
    - **is_active**: 篩選是否啟用
    - **notice_order**: 篩選訊息次序
    - **search**: 全文檢索（中英文主旨）

    需要提供 Bearer Token 及 X-Txn-Token Header
    """
    # Token 已驗證 read 權限

    # 記錄 View 日誌（功能瀏覽記錄）
    try:
        function_id = UserLogService.get_function_id_by_code(db, "system_notifications")
        if function_id:
            UserLogService.log_view(
                db=db,
                user_id=current_user.id,
                function_id=function_id,
                viewed_data={
                    "action": "view_list",
                    "filters": {
                        "skip": skip,
                        "limit": limit,
                        "is_active": is_active,
                        "notice_order": notice_order,
                        "search": search
                    }
                },
                current_user=current_user
            )
    except Exception as e:
        logger.error(f"日誌記錄失敗: {e}")

    # 查詢
    query = db.query(SystemNotification)

    if is_active is not None:
        query = query.filter(SystemNotification.is_active == is_active)

    if notice_order is not None:
        query = query.filter(SystemNotification.notice_order == notice_order)

    if search:
        query = query.filter(
            cast(SystemNotification.notice_subject, JSONB).cast(String).ilike(f"%{search}%")
        )

    # 排序：依照 id, notice_start_at, notice_end_at, notice_order
    notifications = query.order_by(
        SystemNotification.id.desc()
    ).offset(skip).limit(limit).all()

    return notifications


@router.get("/{notification_id}", response_model=SystemNotificationResponse, summary="取得單一系統通知")
async def get_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    取得單一系統通知資訊

    需要 system_notifications 功能的 read 權限

    - **notification_id**: 通知 ID

    需要提供 Bearer Token 及 X-Txn-Token Header
    """
    # Token 已驗證 read 權限

    notification = db.query(SystemNotification).filter(
        SystemNotification.id == notification_id
    ).first()

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="找不到系統通知"
        )

    # 記錄 Read 日誌（資料檢視記錄）
    try:
        function_id = UserLogService.get_function_id_by_code(db, "system_notifications")
        if function_id:
            UserLogService.log_read(
                db=db,
                user_id=current_user.id,
                function_id=function_id,
                viewed_data=notification_to_dict(notification),
                current_user=current_user
            )
    except Exception as e:
        logger.error(f"日誌記錄失敗: {e}")

    return notification


@router.post("/", response_model=SystemNotificationResponse, status_code=status.HTTP_201_CREATED, summary="建立系統通知")
async def create_notification(
    notification_data: SystemNotificationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    建立系統通知

    需要 system_notifications 功能的 create 權限

    需要提供 Bearer Token 及 X-Txn-Token Header
    """
    # Token 已驗證 create 權限

    # 驗證時間範圍
    if notification_data.notice_end_at <= notification_data.notice_start_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="結束時間必須晚於開始時間"
        )

    # 建立通知
    notification = SystemNotification(
        **notification_data.model_dump(),
        edit_by=current_user.id
    )

    db.add(notification)

    try:
        db.commit()
        db.refresh(notification)

        # 記錄 Create 日誌
        try:
            function_id = UserLogService.get_function_id_by_code(db, "system_notifications")
            if function_id:
                UserLogService.log_create(
                    db=db,
                    user_id=current_user.id,
                    function_id=function_id,
                    created_data=notification_to_dict(notification),
                    current_user=current_user
                )
        except Exception as e:
            logger.error(f"日誌記錄失敗: {e}")

        return notification

    except Exception as e:
        db.rollback()
        logger.error(f"建立系統通知失敗: {e}")

        # 記錄錯誤日誌
        try:
            function_id = UserLogService.get_function_id_by_code(db, "system_notifications")
            if function_id:
                UserLogService.log_error(
                    db=db,
                    user_id=current_user.id,
                    function_id=function_id,
                    module_item="Create",
                    error_message=str(e),
                    change_data=notification_data.model_dump(),
                    current_user=current_user
                )
        except Exception as log_error:
            logger.error(f"錯誤日誌記錄失敗: {log_error}")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"建立系統通知失敗: {str(e)}"
        )


@router.put("/{notification_id}", response_model=SystemNotificationResponse, summary="更新系統通知")
async def update_notification(
    notification_id: int,
    notification_data: SystemNotificationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    更新系統通知

    需要 system_notifications 功能的 update 權限

    需要提供 Bearer Token 及 X-Txn-Token Header
    """
    # Token 已驗證 update 權限

    notification = db.query(SystemNotification).filter(
        SystemNotification.id == notification_id
    ).first()

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="找不到系統通知"
        )

    # 保存原始資料（用於日誌）
    original_data = notification_to_dict(notification)

    # 更新欄位
    update_data = notification_data.model_dump(exclude_unset=True)

    # 驗證時間範圍（如果有更新時間欄位）
    start_time = update_data.get('notice_start_at', notification.notice_start_at)
    end_time = update_data.get('notice_end_at', notification.notice_end_at)
    if end_time and start_time and end_time <= start_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="結束時間必須晚於開始時間"
        )

    for key, value in update_data.items():
        setattr(notification, key, value)

    notification.edit_by = current_user.id
    notification.updated_at = datetime.now()

    try:
        db.commit()
        db.refresh(notification)

        # 保存更新後資料
        updated_data = notification_to_dict(notification)

        # 記錄 Update 日誌
        try:
            function_id = UserLogService.get_function_id_by_code(db, "system_notifications")
            if function_id:
                UserLogService.log_update(
                    db=db,
                    user_id=current_user.id,
                    function_id=function_id,
                    original_data=original_data,
                    updated_data=updated_data,
                    current_user=current_user
                )
        except Exception as e:
            logger.error(f"日誌記錄失敗: {e}")

        return notification

    except Exception as e:
        db.rollback()
        logger.error(f"更新系統通知失敗: {e}")

        # 記錄錯誤日誌
        try:
            function_id = UserLogService.get_function_id_by_code(db, "system_notifications")
            if function_id:
                UserLogService.log_error(
                    db=db,
                    user_id=current_user.id,
                    function_id=function_id,
                    module_item="Update",
                    error_message=str(e),
                    look_data=original_data,
                    change_data=update_data,
                    current_user=current_user
                )
        except Exception as log_error:
            logger.error(f"錯誤日誌記錄失敗: {log_error}")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"更新系統通知失敗: {str(e)}"
        )


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT, summary="刪除系統通知")
async def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    刪除系統通知

    需要 system_notifications 功能的 delete 權限
    此操作為一次性使用，Token 使用後立即失效

    需要提供 Bearer Token 及 X-Txn-Token Header
    """
    # Token 已驗證 delete 權限，且使用後立即失效

    notification = db.query(SystemNotification).filter(
        SystemNotification.id == notification_id
    ).first()

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="找不到系統通知"
        )

    # 保存刪除資料（用於日誌）
    deleted_data = notification_to_dict(notification)

    try:
        db.delete(notification)
        db.commit()

        # 記錄 Delete 日誌
        try:
            function_id = UserLogService.get_function_id_by_code(db, "system_notifications")
            if function_id:
                UserLogService.log_delete(
                    db=db,
                    user_id=current_user.id,
                    function_id=function_id,
                    deleted_data=deleted_data,
                    current_user=current_user
                )
        except Exception as e:
            logger.error(f"日誌記錄失敗: {e}")

        return None

    except Exception as e:
        db.rollback()
        logger.error(f"刪除系統通知失敗: {e}")

        # 記錄錯誤日誌
        try:
            function_id = UserLogService.get_function_id_by_code(db, "system_notifications")
            if function_id:
                UserLogService.log_error(
                    db=db,
                    user_id=current_user.id,
                    function_id=function_id,
                    module_item="Delete",
                    error_message=str(e),
                    look_data=deleted_data,
                    current_user=current_user
                )
        except Exception as log_error:
            logger.error(f"錯誤日誌記錄失敗: {log_error}")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"刪除系統通知失敗: {str(e)}"
        )


@router.patch("/{notification_id}/toggle-active", response_model=SystemNotificationResponse, summary="切換通知啟用狀態")
async def toggle_notification_active(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    切換通知的啟用狀態（用於 DataTables 點選切換）

    需要 system_notifications 功能的 update 權限

    需要提供 Bearer Token 及 X-Txn-Token Header
    """
    # Token 已驗證 update 權限

    notification = db.query(SystemNotification).filter(
        SystemNotification.id == notification_id
    ).first()

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="找不到系統通知"
        )

    # 保存原始資料
    original_data = notification_to_dict(notification)

    # 切換狀態
    notification.is_active = not notification.is_active
    notification.edit_by = current_user.id
    notification.updated_at = datetime.now()

    try:
        db.commit()
        db.refresh(notification)

        # 保存更新後資料
        updated_data = notification_to_dict(notification)

        # 記錄 Update 日誌
        try:
            function_id = UserLogService.get_function_id_by_code(db, "system_notifications")
            if function_id:
                UserLogService.log_update(
                    db=db,
                    user_id=current_user.id,
                    function_id=function_id,
                    original_data=original_data,
                    updated_data=updated_data,
                    current_user=current_user
                )
        except Exception as e:
            logger.error(f"日誌記錄失敗: {e}")

        return notification

    except Exception as e:
        db.rollback()
        logger.error(f"切換通知狀態失敗: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"切換通知狀態失敗: {str(e)}"
        )


@router.post("/close-today", status_code=status.HTTP_204_NO_CONTENT, summary="標記今日不再顯示通知")
async def close_notifications_today(
    close_data: NotificationCloseDateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    標記今日不再顯示任何通知

    需要提供 Bearer Token
    """
    # 使用提供的日期或預設今日
    closed_at = close_data.closed_at if close_data.closed_at else date.today()

    # 檢查今日是否已標記
    existing = db.query(NotificationCloseDate).filter(
        and_(
            NotificationCloseDate.edit_by == current_user.id,
            NotificationCloseDate.closed_at == closed_at
        )
    ).first()

    if existing:
        # 已標記，直接返回
        return None

    # 建立關閉日期記錄
    close_record = NotificationCloseDate(
        edit_by=current_user.id,
        closed_at=closed_at
    )

    db.add(close_record)

    try:
        db.commit()
        db.refresh(close_record)

        logger.info(f"使用者 {current_user.id} 標記 {closed_at} 不再顯示通知")
        return None
    except Exception as e:
        db.rollback()
        logger.error(f"標記今日關閉通知失敗: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"標記失敗: {str(e)}"
        )
