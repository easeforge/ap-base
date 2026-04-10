"""
CAPTCHA Service
驗證碼產生與驗證服務（使用 Redis 儲存）
"""

import random
import string
import uuid
import logging
from typing import Optional, Tuple

from app.core.redis_client import get_redis

logger = logging.getLogger(__name__)

# CAPTCHA 設定
CAPTCHA_LENGTH = 4
CAPTCHA_TTL = 300  # 5 分鐘過期
CAPTCHA_PREFIX = "captcha:"
# 排除容易混淆的字元: 0/O, 1/I/l
CAPTCHA_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"


def _generate_code() -> str:
    """產生隨機驗證碼"""
    return ''.join(random.choices(CAPTCHA_CHARS, k=CAPTCHA_LENGTH))


def _generate_svg(code: str) -> str:
    """產生 SVG 驗證碼圖片"""
    width = 140
    height = 50

    svg_parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}">'
        f'<rect width="100%" height="100%" fill="#f0f0f0"/>'
    ]

    # 加入干擾線
    for _ in range(4):
        x1 = random.randint(0, width)
        y1 = random.randint(0, height)
        x2 = random.randint(0, width)
        y2 = random.randint(0, height)
        color = f"rgb({random.randint(100,200)},{random.randint(100,200)},{random.randint(100,200)})"
        svg_parts.append(
            f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" '
            f'stroke="{color}" stroke-width="1"/>'
        )

    # 加入干擾點
    for _ in range(20):
        cx = random.randint(0, width)
        cy = random.randint(0, height)
        color = f"rgb({random.randint(100,200)},{random.randint(100,200)},{random.randint(100,200)})"
        svg_parts.append(
            f'<circle cx="{cx}" cy="{cy}" r="1.5" fill="{color}"/>'
        )

    # 渲染文字
    char_width = width // (CAPTCHA_LENGTH + 1)
    for i, char in enumerate(code):
        x = char_width * (i + 0.5) + random.randint(-5, 5)
        y = height // 2 + random.randint(-5, 8)
        font_size = random.randint(24, 32)
        rotate = random.randint(-20, 20)
        color = f"rgb({random.randint(0,80)},{random.randint(0,80)},{random.randint(0,80)})"
        svg_parts.append(
            f'<text x="{x}" y="{y}" font-size="{font_size}" '
            f'font-family="Arial,sans-serif" font-weight="bold" fill="{color}" '
            f'transform="rotate({rotate},{x},{y})">{char}</text>'
        )

    svg_parts.append('</svg>')
    return ''.join(svg_parts)


def generate_captcha() -> Tuple[str, str]:
    """
    產生 CAPTCHA 並存入 Redis

    Returns:
        (captcha_key, svg_string)
    """
    code = _generate_code()
    captcha_key = str(uuid.uuid4())

    redis = get_redis()
    if redis:
        redis.setex(f"{CAPTCHA_PREFIX}{captcha_key}", CAPTCHA_TTL, code.upper())
        logger.debug(f"CAPTCHA 已產生: key={captcha_key[:8]}...")
    else:
        logger.warning("Redis 不可用，CAPTCHA 驗證將被跳過")

    svg = _generate_svg(code)
    return captcha_key, svg


def verify_captcha(captcha_key: str, captcha_code: str) -> bool:
    """
    驗證 CAPTCHA

    Args:
        captcha_key: CAPTCHA 識別碼
        captcha_code: 使用者輸入的驗證碼

    Returns:
        驗證是否成功
    """
    if not captcha_key or not captcha_code:
        return False

    redis = get_redis()
    if not redis:
        logger.warning("Redis 不可用，跳過 CAPTCHA 驗證")
        return True  # Redis 不可用時放行

    redis_key = f"{CAPTCHA_PREFIX}{captcha_key}"
    stored_code = redis.get(redis_key)

    if not stored_code:
        return False

    # 驗證後立即刪除（一次性使用）
    redis.delete(redis_key)

    if isinstance(stored_code, bytes):
        stored_code = stored_code.decode('utf-8')

    return stored_code.upper() == captcha_code.upper()
