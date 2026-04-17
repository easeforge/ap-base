# -*- coding: utf-8 -*-
"""批次建立開發環境代碼 ERR510001~ERR510006"""
import sys
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, '.')

from tools.insert_message_code import insert_message_code

dev_codes = [
    {
        'code': 'ERR510001',
        'translations': {
            'zh-TW': '密碼驗證失敗：bcrypt hash 比對不符（帳號={account}）',
            'zh-CN': '密码验证失败：bcrypt hash 比对不符（帐号={account}）',
            'en':    'Password verification failed: bcrypt hash mismatch (account={account})',
        },
        'env': 'development',
        'pair_code': 'ERR010001',
    },
    {
        'code': 'ERR510002',
        'translations': {
            'zh-TW': 'CAPTCHA 驗證失敗：Redis key 不存在或已過期（key={key}）',
            'zh-CN': 'CAPTCHA 验证失败：Redis key 不存在或已过期（key={key}）',
            'en':    'CAPTCHA verification failed: Redis key not found or expired (key={key})',
        },
        'env': 'development',
        'pair_code': 'ERR010002',
    },
    {
        'code': 'ERR510003',
        'translations': {
            'zh-TW': '帳號已停用：is_active=false（user_id={id}）',
            'zh-CN': '帐号已停用：is_active=false（user_id={id}）',
            'en':    'Account disabled: is_active=false (user_id={id})',
        },
        'env': 'development',
        'pair_code': 'ERR010003',
    },
    {
        'code': 'ERR510004',
        'translations': {
            'zh-TW': 'Redis Session 不存在或已過期（session_id={id}）',
            'zh-CN': 'Redis Session 不存在或已过期（session_id={id}）',
            'en':    'Redis Session not found or expired (session_id={id})',
        },
        'env': 'development',
        'pair_code': 'ERR010004',
    },
    {
        'code': 'ERR510005',
        'translations': {
            'zh-TW': 'JWT 解碼失敗：token 格式錯誤、簽章無效或已過期',
            'zh-CN': 'JWT 解码失败：token 格式错误、签章无效或已过期',
            'en':    'JWT decode failed: invalid format, signature or expired',
        },
        'env': 'development',
        'pair_code': 'ERR010005',
    },
    {
        'code': 'ERR510006',
        'translations': {
            'zh-TW': 'Redis Session 建立失敗：{detail}',
            'zh-CN': 'Redis Session 建立失败：{detail}',
            'en':    'Redis Session creation failed: {detail}',
        },
        'env': 'development',
        'pair_code': 'ERR010006',
    },
]

for item in dev_codes:
    insert_message_code(**item)

print('\nDone! 6 development codes inserted/updated.')
