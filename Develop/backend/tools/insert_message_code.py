# -*- coding: utf-8 -*-
"""
系統訊息代碼新增/更新工具

用法：
  1. 單筆新增（命令列）：
     python tools/insert_message_code.py ERR010004 "登入已過期，請重新登入" "登入已过期，请重新登入" "Session expired, please login again" --order 14 --env production --pair ERR510004

  2. 批次新增（在程式中呼叫）：
     from tools.insert_message_code import insert_message_code, insert_batch
     insert_message_code("ERR010004", {"zh-TW": "...", "zh-CN": "...", "en": "..."}, order=14, env="production", pair_code="ERR510004")

  3. 更新既有代碼（同代碼會 UPDATE）：
     insert_message_code("ERR010001", {...}, order=11)  # 自動 upsert

參數說明：
  code      訊息代碼（如 ERR010004）
  zh-TW     繁體中文翻譯
  zh-CN     簡體中文翻譯
  en        英文翻譯
  --order   排序（預設依代碼最末 4 碼）
  --env     production / development（預設 production）
  --pair    對應的另一環境代碼（正式↔開發配對）
"""

import sys
import json
import argparse
import psycopg2

DB_DSN = 'postgresql://admin:DC1qaz2wsx@10.1.0.20:5433/baseAP'

TYPE_NAME = {
    'zh-TW': '系統訊息代碼',
    'zh-CN': '系统讯息代码',
    'en':    'System Message Codes',
}


def insert_message_code(
    code: str,
    translations: dict,
    order: int = None,
    env: str = 'production',
    pair_code: str = None,
    is_active: bool = True,
):
    """
    新增或更新一筆 sys_message_code

    Args:
        code: 訊息代碼（如 ERR010001）
        translations: {"zh-TW": "...", "zh-CN": "...", "en": "..."}
        order: 排序，None 時自動取代碼最末 4 碼
        env: 'production' 或 'development'
        pair_code: 對應的另一環境代碼
        is_active: 啟用狀態
    """
    if order is None:
        # 自動取代碼最末 4 碼為 order
        order = int(code[-4:]) if code[-4:].isdigit() else 0

    conn = psycopg2.connect(DB_DSN, client_encoding='utf8')
    try:
        cur = conn.cursor()

        # 檢查是否已存在
        cur.execute("SELECT id FROM system_codes WHERE code_type = 'sys_message_code' AND code = %s", (code,))
        existing = cur.fetchone()

        type_name_json = json.dumps(TYPE_NAME, ensure_ascii=False)
        code_name_json = json.dumps(translations, ensure_ascii=False)

        if existing:
            # 更新既有
            cur.execute("""
                UPDATE system_codes
                SET code_type_name = %s::jsonb,
                    code_name = %s::jsonb,
                    "order" = %s,
                    is_active = %s,
                    note1 = %s,
                    note2 = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """, (type_name_json, code_name_json, order, is_active, env, pair_code, existing[0]))
            action = 'UPDATED'
        else:
            # 新增
            cur.execute("""
                INSERT INTO system_codes
                    (code_type, code_type_name, code, code_name, "order", is_active, note1, note2, edit_by)
                VALUES (%s, %s::jsonb, %s, %s::jsonb, %s, %s, %s, %s, 1)
            """, ('sys_message_code', type_name_json, code, code_name_json, order, is_active, env, pair_code))
            action = 'INSERTED'

        conn.commit()
        print(f"  [{action}] {code} (order={order}, env={env}, pair={pair_code})")
        for lang, text in translations.items():
            print(f"    {lang}: {text}")
    finally:
        cur.close()
        conn.close()


def insert_batch(codes: list):
    """批次新增多筆訊息代碼"""
    for item in codes:
        insert_message_code(**item)


def main():
    parser = argparse.ArgumentParser(description='新增/更新 sys_message_code')
    parser.add_argument('code', help='訊息代碼，如 ERR010004')
    parser.add_argument('zh_tw', help='繁體中文翻譯')
    parser.add_argument('zh_cn', help='簡體中文翻譯')
    parser.add_argument('en', help='英文翻譯')
    parser.add_argument('--order', type=int, default=None, help='排序（預設取代碼末 4 碼）')
    parser.add_argument('--env', choices=['production', 'development'], default='production')
    parser.add_argument('--pair', dest='pair_code', default=None, help='對應的另一環境代碼')
    parser.add_argument('--inactive', action='store_true', help='設為停用')
    args = parser.parse_args()

    sys.stdout.reconfigure(encoding='utf-8')

    insert_message_code(
        code=args.code,
        translations={'zh-TW': args.zh_tw, 'zh-CN': args.zh_cn, 'en': args.en},
        order=args.order,
        env=args.env,
        pair_code=args.pair_code,
        is_active=not args.inactive,
    )


if __name__ == '__main__':
    main()
