# -*- coding: utf-8 -*-
"""
建立通用 CRUD 代碼 + 模組特定業務規則代碼

設計思路：
- 大部分錯誤情境（找不到、已存在、無權限、操作失敗）跨模組重複
- 使用通用代碼 ERR02xxxx + 參數，避免每個模組各自建一份
- 模組特定的業務規則（如時區無效、時間順序）才用 ERR1xxxxx / ERR2xxxxx
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, '.')

from tools.insert_message_code import insert_message_code

# === 分類 02 / 52：通用資料操作（CRUD common errors） ===
generic_codes = [
    # 正式環境（簡潔）
    ('ERR020001', {'zh-TW': '找不到{entity}',           'zh-CN': '找不到{entity}',           'en': '{entity} not found'},                     'production', 'ERR520001'),
    ('ERR020002', {'zh-TW': '{field}已存在',            'zh-CN': '{field}已存在',            'en': '{field} already exists'},                 'production', 'ERR520002'),
    ('ERR020003', {'zh-TW': '無權限執行此操作',         'zh-CN': '无权限执行此操作',         'en': 'Permission denied'},                      'production', 'ERR520003'),
    ('ERR020004', {'zh-TW': '操作失敗',                 'zh-CN': '操作失败',                 'en': 'Operation failed'},                       'production', 'ERR520004'),
    ('ERR020005', {'zh-TW': '此資料已被使用，無法刪除', 'zh-CN': '此资料已被使用，无法删除', 'en': 'Data is in use and cannot be deleted'},   'production', 'ERR520005'),
    ('ERR020006', {'zh-TW': '資料驗證失敗',             'zh-CN': '资料验证失败',             'en': 'Validation failed'},                      'production', 'ERR520006'),
    ('ERR020007', {'zh-TW': '{entity}尚有 {count} 筆關聯資料，無法刪除',
                   'zh-CN': '{entity}尚有 {count} 笔关联资料，无法删除',
                   'en':    '{entity} has {count} related records, cannot delete'},                                                            'production', 'ERR520007'),

    # 開發環境（含細節）
    ('ERR520001', {'zh-TW': '找不到{entity}（id={id}）',
                   'zh-CN': '找不到{entity}（id={id}）',
                   'en':    '{entity} not found (id={id})'},                                                                                   'development', 'ERR020001'),
    ('ERR520002', {'zh-TW': '{field}已存在（值={value}）',
                   'zh-CN': '{field}已存在（值={value}）',
                   'en':    '{field} already exists (value={value})'},                                                                         'development', 'ERR020002'),
    ('ERR520003', {'zh-TW': '無權限：{action}（user_id={user_id}）',
                   'zh-CN': '无权限：{action}（user_id={user_id}）',
                   'en':    'Permission denied: {action} (user_id={user_id})'},                                                                'development', 'ERR020003'),
    ('ERR520004', {'zh-TW': '{operation}失敗：{detail}',
                   'zh-CN': '{operation}失败：{detail}',
                   'en':    '{operation} failed: {detail}'},                                                                                   'development', 'ERR020004'),
    ('ERR520005', {'zh-TW': '此資料已被 {usage} 使用（{count} 筆），無法刪除',
                   'zh-CN': '此资料已被 {usage} 使用（{count} 笔），无法删除',
                   'en':    'Data is used by {usage} ({count} records), cannot delete'},                                                       'development', 'ERR020005'),
    ('ERR520006', {'zh-TW': '資料驗證失敗：{field} - {detail}',
                   'zh-CN': '资料验证失败：{field} - {detail}',
                   'en':    'Validation failed: {field} - {detail}'},                                                                          'development', 'ERR020006'),
    ('ERR520007', {'zh-TW': '{entity}（id={id}）尚有 {count} 筆 {relation} 關聯，無法刪除',
                   'zh-CN': '{entity}（id={id}）尚有 {count} 笔 {relation} 关联，无法删除',
                   'en':    '{entity} (id={id}) has {count} {relation} records, cannot delete'},                                               'development', 'ERR020007'),

    # 系統未預期錯誤（general_exception_handler 使用）
    ('ERR020008', {'zh-TW': '系統發生未預期錯誤，請稍後再試',
                   'zh-CN': '系统发生未预期错误，请稍后再试',
                   'en':    'An unexpected server error occurred, please try again later'},                                                   'production',  'ERR520008'),
    ('ERR520008', {'zh-TW': '系統發生未預期錯誤：{type}: {detail}',
                   'zh-CN': '系统发生未预期错误：{type}: {detail}',
                   'en':    'Unexpected server error: {type}: {detail}'},                                                                     'development', 'ERR020008'),
]

# === 分類 20 / 70：系統管理/設定 業務規則特定 ===
sys_codes = [
    ('ERR200001', {'zh-TW': '無效的時區設定',           'zh-CN': '无效的时区设定',           'en': 'Invalid timezone setting'},               'production', 'ERR700001'),
    ('ERR200002', {'zh-TW': '結束時間必須晚於開始時間', 'zh-CN': '结束时间必须晚于开始时间', 'en': 'End time must be after start time'},      'production', 'ERR700002'),
    ('ERR200003', {'zh-TW': '此功能下還有子功能，無法刪除',
                   'zh-CN': '此功能下还有子功能，无法删除',
                   'en':    'Cannot delete: function has child functions'},                                                                    'production', 'ERR700003'),
    ('ERR700001', {'zh-TW': '無效的時區設定：{tz}',     'zh-CN': '无效的时区设定：{tz}',     'en': 'Invalid timezone: {tz}'},                'development', 'ERR200001'),
    ('ERR700002', {'zh-TW': '結束時間 {end} 必須晚於開始時間 {start}',
                   'zh-CN': '结束时间 {end} 必须晚于开始时间 {start}',
                   'en':    'End time {end} must be after start time {start}'},                                                                'development', 'ERR200002'),
    ('ERR700003', {'zh-TW': '此功能（id={id}）尚有 {count} 個子功能，無法刪除',
                   'zh-CN': '此功能（id={id}）尚有 {count} 个子功能，无法删除',
                   'en':    'Function (id={id}) has {count} child functions, cannot delete'},                                                  'development', 'ERR200003'),
]

# === 分類 10 / 60：使用者/組織管理 業務規則特定 ===
user_codes = [
    ('ERR100001', {'zh-TW': '無法變更{field}',          'zh-CN': '无法变更{field}',          'en': 'Cannot change {field}'},                  'production', 'ERR600001'),
    ('ERR600001', {'zh-TW': '無法變更{field}（user_id={user_id}）',
                   'zh-CN': '无法变更{field}（user_id={user_id}）',
                   'en':    'Cannot change {field} (user_id={user_id})'},                                                                      'development', 'ERR100001'),
]

all_codes = generic_codes + sys_codes + user_codes

for code, translations, env, pair in all_codes:
    insert_message_code(code=code, translations=translations, env=env, pair_code=pair)

print(f'\nDone! {len(all_codes)} codes inserted/updated.')
