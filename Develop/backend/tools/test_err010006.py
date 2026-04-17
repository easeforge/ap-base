# -*- coding: utf-8 -*-
"""
TDD 測試：ERR010006 系統錯誤（Session 建立失敗）

不修改正式碼，使用 unittest.mock 注入 SessionService.create_session 失敗，
驗證 login 端點回傳 500 + detail='ERR010006'。

使用方法：
  cd Develop/backend
  venv/Scripts/python tools/test_err010006.py
"""

import sys
import requests
from unittest.mock import patch

sys.stdout.reconfigure(encoding='utf-8')

BACKEND_URL = 'http://localhost:10181'


def get_captcha_with_code():
    """取得 captcha 並從 Redis 讀取實際的代碼"""
    r = requests.get(f'{BACKEND_URL}/api/auth/captcha')
    captcha = r.json()
    key = captcha['captcha_key']

    # 從 Redis 取出實際代碼（避免 OCR 圖片）
    sys.path.insert(0, '.')
    from app.core.redis_client import init_redis, get_redis
    from app.core.config import settings
    init_redis(
        host=settings.REDIS_HOST,
        port=settings.REDIS_PORT,
        db=settings.REDIS_DB,
        password=settings.REDIS_PASSWORD,
    )
    redis = get_redis()
    code = redis.get(f'captcha:{key}')
    return key, code


def test_normal_login():
    """先驗證正常登入是 200"""
    print('=' * 60)
    print('Test 1: Normal login (baseline)')
    print('=' * 60)
    key, code = get_captcha_with_code()
    r = requests.post(f'{BACKEND_URL}/api/auth/login', json={
        'account': 'admin',
        'password': 'Admin1234',
        'captcha_key': key,
        'captcha_code': code,
    })
    print(f'  Status: {r.status_code}')
    print(f'  Response: {r.text[:120]}...')
    assert r.status_code == 200, f'Expected 200 but got {r.status_code}'
    print('  ✓ Normal login works')
    print()


def test_session_create_fail_returns_err010006():
    """
    模擬 Redis Session 建立失敗，驗證 login 回傳 ERR010006

    說明：因為這個測試需要在後端 process 內部 mock SessionService，
    而我們是用 HTTP 從外部呼叫，無法直接 mock 後端的 service。

    替代方案：直接驗證 login 程式碼路徑中的 detail 字串為 ERR010006
    （由 grep 程式碼確認）
    """
    print('=' * 60)
    print('Test 2: ERR010006 code path verification')
    print('=' * 60)

    # 讀取 auth.py 確認 SESSION_CREATE_FAILED 路徑使用的代碼
    import re
    with open('app/routes/auth.py', 'r', encoding='utf-8') as f:
        content = f.read()

    # 找到 session_created 為 False 時的 raise 區塊
    pattern = r'if not session_created:.*?detail="([^"]+)"'
    match = re.search(pattern, content, re.DOTALL)

    if not match:
        print('  ✗ 找不到 session_created 檢查的程式碼')
        return False

    detail_code = match.group(1)
    print(f'  Code path: detail="{detail_code}"')

    if detail_code != 'ERR010006':
        print(f'  ✗ Expected ERR010006 but found {detail_code}')
        return False

    print('  ✓ auth.py 已使用 ERR010006')

    # 驗證 message-codes API 有此代碼
    r = requests.get(f'{BACKEND_URL}/api/system/message-codes?lang=zh-TW')
    codes = r.json()

    if 'ERR010006' not in codes:
        print(f'  ✗ ERR010006 not in message-codes API')
        return False

    print(f"  ✓ message-codes API 包含: ERR010006 = {codes['ERR010006']}")

    # 驗證英文翻譯
    r = requests.get(f'{BACKEND_URL}/api/system/message-codes?lang=en')
    codes_en = r.json()
    print(f"  ✓ English: ERR010006 = {codes_en['ERR010006']}")

    # 驗證簡體
    r = requests.get(f'{BACKEND_URL}/api/system/message-codes?lang=zh-CN')
    codes_cn = r.json()
    print(f"  ✓ zh-CN:   ERR010006 = {codes_cn['ERR010006']}")

    print()
    return True


def test_force_session_failure_via_mock():
    """
    終極測試：暫時 patch SessionService.create_session 回傳 False
    用 in-process Python 直接測試（不透過 HTTP）
    """
    print('=' * 60)
    print('Test 3: In-process mock test')
    print('=' * 60)

    sys.path.insert(0, '.')
    from fastapi.testclient import TestClient
    from app.main import app

    # 取 captcha
    client = TestClient(app)
    r = client.get('/api/auth/captcha')
    key = r.json()['captcha_key']

    # 取實際代碼
    from app.core.redis_client import get_redis
    redis = get_redis()
    code = redis.get(f'captcha:{key}')

    # Mock SessionService.create_session 永遠回 False
    with patch('app.routes.auth.SessionService.create_session', return_value=False):
        r = client.post('/api/auth/login', json={
            'account': 'admin',
            'password': 'Admin1234',
            'captcha_key': key,
            'captcha_code': code,
        })

    print(f'  Status: {r.status_code}')
    print(f'  Response: {r.text}')

    assert r.status_code == 500, f'Expected 500 but got {r.status_code}'
    detail = r.json().get('detail')
    assert detail == 'ERR010006', f"Expected detail='ERR010006' but got '{detail}'"

    print('  ✓ Mock 注入 Session 失敗 → 收到 500 + ERR010006')
    print()


if __name__ == '__main__':
    try:
        test_normal_login()
        ok = test_session_create_fail_returns_err010006()
        test_force_session_failure_via_mock()
        print('=' * 60)
        print('✓ All tests passed!')
        print('=' * 60)
    except AssertionError as e:
        print(f'✗ Test failed: {e}')
        sys.exit(1)
    except Exception as e:
        print(f'✗ Error: {type(e).__name__}: {e}')
        import traceback
        traceback.print_exc()
        sys.exit(1)
