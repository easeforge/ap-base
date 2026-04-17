"""
SysLanguage Routes
語系管理相關路由
"""

import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.message_codes import raise_msg
from app.models.syslanguage import SysLanguage
from app.models.user import User
from app.schemas.syslanguage import (
    SysLanguageResponse,
    SysLanguageListItem,
    SysLanguageCreate,
    SysLanguageUpdate,
)
from app.services.language_service import LanguageService

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/", response_model=List[SysLanguageListItem], summary="取得語系列表")
async def get_languages(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """取得所有語系列表（不含 lang_data，減少傳輸量）"""
    languages = db.query(SysLanguage).order_by(SysLanguage.lang_code).all()
    return languages


@router.get("/{lang_code}", response_model=SysLanguageResponse, summary="取得語系翻譯資料")
async def get_language(
    lang_code: str,
    db: Session = Depends(get_db),
):
    """取得單一語系的完整翻譯資料（含 lang_data）。公開端點，供前端 i18n 動態載入翻譯。"""
    lang = db.query(SysLanguage).filter(SysLanguage.lang_code == lang_code).first()
    if not lang:
        raise_msg(status.HTTP_404_NOT_FOUND, "ERR020001", entity="語系", id=lang_code)
    return lang


@router.post("/", response_model=SysLanguageResponse, summary="建立語系")
async def create_language(
    lang_data: SysLanguageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """建立新語系"""
    # 檢查是否已存在
    existing = db.query(SysLanguage).filter(SysLanguage.lang_code == lang_data.lang_code).first()
    if existing:
        raise_msg(status.HTTP_400_BAD_REQUEST, "ERR020002", field="語系代碼", value=lang_data.lang_code)

    new_lang = SysLanguage(
        **lang_data.model_dump(),
        edit_by=current_user.id
    )
    db.add(new_lang)
    db.commit()
    db.refresh(new_lang)

    logger.info(f"Language created: {new_lang.lang_code} by user {current_user.id}")
    return new_lang


@router.put("/{lang_code}", response_model=SysLanguageResponse, summary="更新語系翻譯")
async def update_language(
    lang_code: str,
    lang_data: SysLanguageUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """更新語系翻譯內容"""
    lang = db.query(SysLanguage).filter(SysLanguage.lang_code == lang_code).first()
    if not lang:
        raise_msg(status.HTTP_404_NOT_FOUND, "ERR020001", entity="語系", id=lang_code)

    update_data = lang_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(lang, field, value)

    lang.edit_by = current_user.id
    db.commit()
    db.refresh(lang)

    logger.info(f"Language updated: {lang_code} by user {current_user.id}")
    return lang


@router.post("/{lang_code}/backfill", summary="語系補值作業")
async def backfill_language(
    lang_code: str,
    template_lang: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    為指定語系執行補值作業

    以模板語系的值填入所有 JSONB 多語系欄位中尚未存在該語系 key 的資料

    - **lang_code**: 要補值的語系代碼
    - **template_lang**: 模板語系代碼（預設為系統預設語系）
    """
    # 檢查語系是否存在
    lang = db.query(SysLanguage).filter(SysLanguage.lang_code == lang_code).first()
    if not lang:
        raise_msg(status.HTTP_404_NOT_FOUND, "ERR020001", entity="語系", id=lang_code)

    results = LanguageService.backfill_language(db, lang_code, template_lang)

    total = sum(results.values())
    logger.info(f"Backfill completed for {lang_code}: {total} rows updated across {len(results)} tables")

    return {
        "message": f"補值完成: {lang_code}",
        "template_lang": template_lang or "系統預設語系",
        "results": results,
        "total_updated": total
    }


@router.post("/sync-translations", summary="語系翻譯 key 同步補足")
async def sync_translation_keys(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    語系翻譯 key 同步補足

    掃描所有啟用語系的翻譯檔，找出缺少的 key 並自動補足：
    - zh-CN 缺少的 key 從 zh-TW 繁簡轉換
    - zh-TW 缺少的 key 從 zh-CN 簡繁轉換
    - 其他語系從基礎語系(en)複製

    補足後同時更新翻譯檔和資料庫 lang_data
    """
    results = LanguageService.sync_translation_keys(db, base_lang="en")

    if "error" in results:
        raise_msg(status.HTTP_400_BAD_REQUEST, "ERR020004", operation="語系翻譯同步", detail=results["error"])

    total_added = sum(r.get("added", 0) for r in results.values() if isinstance(r, dict))
    logger.info(f"Translation sync completed by user {current_user.id}: {total_added} keys added")

    return {
        "message": f"語系翻譯同步完成，共補足 {total_added} 個 key",
        "details": results
    }
