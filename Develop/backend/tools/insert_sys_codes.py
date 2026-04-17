# -*- coding: utf-8 -*-
"""批次建立 SYS 成功/狀態訊息代碼（正式 + 開發環境）"""
import sys
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, '.')

from tools.insert_message_code import insert_message_code

sys_codes = [
    # === 01 / 51：認證/登入 ===
    ('SYS010001', {'zh-TW':'登入成功', 'zh-CN':'登入成功', 'en':'Login successful'}, 'production', 'SYS510001'),
    ('SYS010002', {'zh-TW':'登出成功', 'zh-CN':'登出成功', 'en':'Logout successful'}, 'production', 'SYS510002'),
    ('SYS010003', {'zh-TW':'密碼變更成功', 'zh-CN':'密码变更成功', 'en':'Password changed successfully'}, 'production', 'SYS510003'),
    ('SYS510001', {'zh-TW':'登入成功（user_id={user_id}, session_id={session_id}）',
                   'zh-CN':'登入成功（user_id={user_id}, session_id={session_id}）',
                   'en':'Login successful (user_id={user_id}, session_id={session_id})'}, 'development', 'SYS010001'),
    ('SYS510002', {'zh-TW':'登出成功（user_id={user_id}, session_id={session_id}）',
                   'zh-CN':'登出成功（user_id={user_id}, session_id={session_id}）',
                   'en':'Logout successful (user_id={user_id}, session_id={session_id})'}, 'development', 'SYS010002'),
    ('SYS510003', {'zh-TW':'密碼變更成功（user_id={user_id}）',
                   'zh-CN':'密码变更成功（user_id={user_id}）',
                   'en':'Password changed successfully (user_id={user_id})'}, 'development', 'SYS010003'),

    # === 02 / 52：通用 CRUD 成功 ===
    ('SYS020001', {'zh-TW':'{name}新增成功', 'zh-CN':'{name}新增成功', 'en':'{name} created successfully'}, 'production', 'SYS520001'),
    ('SYS020002', {'zh-TW':'{name}修改成功', 'zh-CN':'{name}修改成功', 'en':'{name} updated successfully'}, 'production', 'SYS520002'),
    ('SYS020003', {'zh-TW':'{name}刪除成功', 'zh-CN':'{name}删除成功', 'en':'{name} deleted successfully'}, 'production', 'SYS520003'),
    ('SYS020004', {'zh-TW':'{name}儲存成功', 'zh-CN':'{name}储存成功', 'en':'{name} saved successfully'}, 'production', 'SYS520004'),
    ('SYS520001', {'zh-TW':'{name}新增成功（id={id}）', 'zh-CN':'{name}新增成功（id={id}）', 'en':'{name} created (id={id})'}, 'development', 'SYS020001'),
    ('SYS520002', {'zh-TW':'{name}修改成功（id={id}）', 'zh-CN':'{name}修改成功（id={id}）', 'en':'{name} updated (id={id})'}, 'development', 'SYS020002'),
    ('SYS520003', {'zh-TW':'{name}刪除成功（id={id}）', 'zh-CN':'{name}删除成功（id={id}）', 'en':'{name} deleted (id={id})'}, 'development', 'SYS020003'),
    ('SYS520004', {'zh-TW':'{name}儲存成功（id={id}）', 'zh-CN':'{name}储存成功（id={id}）', 'en':'{name} saved (id={id})'}, 'development', 'SYS020004'),

    # === 10 / 60：使用者/組織 ===
    ('SYS100001', {'zh-TW':'使用者資料已更新', 'zh-CN':'用户资料已更新', 'en':'User profile updated'}, 'production', 'SYS600001'),
    ('SYS600001', {'zh-TW':'使用者資料已更新（user_id={user_id}）',
                   'zh-CN':'用户资料已更新（user_id={user_id}）',
                   'en':'User profile updated (user_id={user_id})'}, 'development', 'SYS100001'),

    # === 20 / 70：系統管理 ===
    ('SYS200001', {'zh-TW':'系統設定已儲存', 'zh-CN':'系统设定已储存', 'en':'System settings saved'}, 'production', 'SYS700001'),
    ('SYS200002', {'zh-TW':'語系翻譯同步完成，共補足 {count} 個 key',
                   'zh-CN':'语系翻译同步完成，共补足 {count} 个 key',
                   'en':'Translation sync completed, {count} keys added'}, 'production', 'SYS700002'),
    ('SYS700001', {'zh-TW':'系統設定已儲存（fields={fields}）',
                   'zh-CN':'系统设定已储存（fields={fields}）',
                   'en':'System settings saved (fields={fields})'}, 'development', 'SYS200001'),
    ('SYS700002', {'zh-TW':'語系翻譯同步完成，共補足 {count} 個 key，處理 {tables} 個資料表',
                   'zh-CN':'语系翻译同步完成，共补足 {count} 个 key，处理 {tables} 个资料表',
                   'en':'Translation sync completed, {count} keys added across {tables} tables'}, 'development', 'SYS200002'),
]

for code, translations, env, pair in sys_codes:
    insert_message_code(code=code, translations=translations, env=env, pair_code=pair)

print(f'\nDone! {len(sys_codes)} SYS codes inserted/updated.')
