"""
系統訊息代碼工具

依當前 ENVIRONMENT 設定決定回傳正式碼或開發碼：
- production：直接回傳正式碼（01~49 區間）
- development / 其他：自動換算對應的開發碼（51~99 區間，分類碼 +50）

代碼格式：{PREFIX}{分類碼 2 碼}{訊息碼 4 碼}
例如：ERR010001 → 正式碼，分類 01
      ERR510001 → 開發碼，分類 51（01 + 50）

API 回應格式：
- 不帶參數：{"detail": "ERR010001"}                     ← 字串
- 帶參數：  {"detail": {"code": "ERR510001",
                       "params": {"account": "admin"}}} ← 物件
"""

from typing import Optional, Dict, Any
from fastapi import HTTPException
from app.core.config import settings


def to_env_code(prod_code: str) -> str:
    """
    依 ENVIRONMENT 設定，回傳正式碼或對應的開發碼

    Args:
        prod_code: 正式環境代碼（如 ERR010001）

    Returns:
        production → 原樣回傳
        其他環境 → 換算為開發碼（如 ERR510001）

    範例：
        # 在 production 環境
        to_env_code("ERR010001")  # → "ERR010001"

        # 在 development 環境
        to_env_code("ERR010001")  # → "ERR510001"
    """
    if settings.ENVIRONMENT == "production":
        return prod_code

    # 開發環境：分類碼 +50
    # 格式驗證：3 碼前綴 + 2 碼分類 + 4 碼訊息 = 9 碼
    if len(prod_code) != 9:
        return prod_code

    prefix = prod_code[:3]
    category = prod_code[3:5]
    message = prod_code[5:]

    if not category.isdigit() or not message.isdigit():
        return prod_code

    cat_num = int(category)
    if cat_num < 1 or cat_num > 49:
        # 已經是開發碼或超出正式區間，原樣回傳
        return prod_code

    dev_category = cat_num + 50
    return f"{prefix}{dev_category:02d}{message}"


def raise_msg(
    status_code: int,
    prod_code: str,
    headers: Optional[Dict[str, str]] = None,
    **params: Any,
):
    """
    依 ENVIRONMENT 換算為正式或開發代碼，組裝 HTTPException 並 raise。

    Args:
        status_code: HTTP 狀態碼
        prod_code:   正式環境代碼（如 ERR010001）
        headers:     回傳的 HTTP headers（如 WWW-Authenticate）
        **params:    替換訊息中佔位符的參數（如 account="admin"）

    範例：
        # 不帶參數（detail 為純字串，與舊版相容）
        raise_msg(401, "ERR010001")
        # → {"detail": "ERR010001"}（production）
        # → {"detail": "ERR510001"}（development）

        # 帶參數（detail 為物件）
        raise_msg(401, "ERR010001", account="admin", attempt=3)
        # → {"detail": {"code": "ERR510001", "params": {"account": "admin", "attempt": 3}}}
    """
    code = to_env_code(prod_code)

    if params:
        # 將 int/None 等型別轉成字串，方便前端做佔位符替換
        str_params = {k: str(v) if v is not None else "" for k, v in params.items()}
        detail: Any = {"code": code, "params": str_params}
    else:
        detail = code

    raise HTTPException(status_code=status_code, detail=detail, headers=headers)
