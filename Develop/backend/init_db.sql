-- ============================================
-- baseAP 後臺管理基底平台 - 資料庫初始化腳本
-- ============================================
-- 資料庫名稱: baseAP
-- 版本: 2.0.0 (JSONB 多語系版)
-- 說明: 建立後臺管理與租戶組織的基底資料表
--       所有名稱欄位改為 JSONB 多語系格式
--       新增 sys_languages 語系管理表
--
-- 執行前請先建立資料庫:
--   CREATE DATABASE "baseAP" OWNER admin;
--
-- 翻譯資料（lang_data）不包含在此腳本中，
-- 請另行使用 import_translations.py 匯入。
-- ============================================

-- ============================================
-- 1. 組織單位明細檔 (organizations)
-- ============================================

CREATE TABLE IF NOT EXISTS organizations (
    id SERIAL PRIMARY KEY,
    org_code VARCHAR(200) UNIQUE NOT NULL,
    org_name VARCHAR(200) NOT NULL,
    org_type INTEGER NOT NULL,
    contact_person VARCHAR(200) NOT NULL,
    contact_email VARCHAR(200) NOT NULL,
    contact_phone VARCHAR(200) NOT NULL,
    address VARCHAR(200),
    phone VARCHAR(200),
    is_mana BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    memo VARCHAR(1000),
    edit_by INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    CONSTRAINT chk_org_type CHECK (org_type IN (1, 2, 3))
);

CREATE INDEX IF NOT EXISTS idx_organizations_code ON organizations(org_code);
CREATE INDEX IF NOT EXISTS idx_organizations_active ON organizations(is_active);
CREATE INDEX IF NOT EXISTS idx_organizations_mana ON organizations(is_mana);

COMMENT ON TABLE organizations IS '組織單位明細檔';
COMMENT ON COLUMN organizations.org_code IS '組織統編/代碼';
COMMENT ON COLUMN organizations.org_name IS '組織名稱';
COMMENT ON COLUMN organizations.org_type IS '組織型態 (1:政府機關, 2:公司行號, 3:個人)';
COMMENT ON COLUMN organizations.contact_person IS '連絡人';
COMMENT ON COLUMN organizations.contact_email IS '連絡人郵件';
COMMENT ON COLUMN organizations.contact_phone IS '連絡人電話';
COMMENT ON COLUMN organizations.address IS '組織地址';
COMMENT ON COLUMN organizations.phone IS '組織代表號';
COMMENT ON COLUMN organizations.is_mana IS '系統管理公司 (只有一家可設為 TRUE)';
COMMENT ON COLUMN organizations.is_active IS '啟用';
COMMENT ON COLUMN organizations.memo IS '備註';
COMMENT ON COLUMN organizations.edit_by IS '編輯者';

-- ============================================
-- 2. 使用者角色明細檔 (user_roles)
-- ============================================

CREATE TABLE IF NOT EXISTS user_roles (
    id SERIAL PRIMARY KEY,
    role_name JSONB NOT NULL DEFAULT '{}',
    description TEXT,
    is_mana BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    edit_by INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_roles_active ON user_roles(is_active);

COMMENT ON TABLE user_roles IS '使用者角色明細檔';
COMMENT ON COLUMN user_roles.role_name IS '角色名稱（JSONB 多語系，如 {"zh-TW":"管理員","en":"Admin"}）';
COMMENT ON COLUMN user_roles.description IS '說明';
COMMENT ON COLUMN user_roles.is_mana IS '系統管理角色';
COMMENT ON COLUMN user_roles.is_active IS '啟用';

-- ============================================
-- 3. 使用者明細檔 (users)
-- ============================================

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id),
    account VARCHAR(100) UNIQUE NOT NULL,
    username VARCHAR(200) NOT NULL,
    password VARCHAR(200) NOT NULL,
    department VARCHAR(200),
    job_title VARCHAR(200),
    phone VARCHAR(200),
    user_role JSONB NOT NULL DEFAULT '[]',
    last_login_at TIMESTAMP,
    last_login_ip VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    edit_by INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_account ON users(account);
CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

COMMENT ON TABLE users IS '使用者明細檔';
COMMENT ON COLUMN users.organization_id IS '組織編號';
COMMENT ON COLUMN users.account IS '登入帳號';
COMMENT ON COLUMN users.username IS '使用者名稱';
COMMENT ON COLUMN users.password IS '使用者密碼 (bcrypt hash)';
COMMENT ON COLUMN users.department IS '所屬部門';
COMMENT ON COLUMN users.job_title IS '職稱';
COMMENT ON COLUMN users.phone IS '連絡電話';
COMMENT ON COLUMN users.user_role IS '所屬角色 JSON 陣列 [user_role.id]';
COMMENT ON COLUMN users.is_active IS '啟用';

-- ============================================
-- 4. 系統功能設定表 (system_functions)
-- ============================================

CREATE TABLE IF NOT EXISTS system_functions (
    id SERIAL PRIMARY KEY,
    func_code VARCHAR(200) NOT NULL,
    upper_func_id INTEGER NOT NULL DEFAULT 0,
    func_name JSONB NOT NULL DEFAULT '{}',
    func_type INTEGER NOT NULL,
    func_order INTEGER NOT NULL,
    func_icon VARCHAR(200),
    module_code VARCHAR(200),
    module_item JSONB NOT NULL DEFAULT '[]',
    description TEXT,
    is_mana BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    edit_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    CONSTRAINT chk_system_functions_type CHECK (func_type IN (1, 2)),
    CONSTRAINT chk_system_functions_module CHECK (
        (func_type = 1 AND module_code IS NULL) OR
        (func_type = 2 AND module_code IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_system_functions_code ON system_functions(func_code);
CREATE INDEX IF NOT EXISTS idx_system_functions_upper ON system_functions(upper_func_id);
CREATE INDEX IF NOT EXISTS idx_system_functions_type ON system_functions(func_type);
CREATE INDEX IF NOT EXISTS idx_system_functions_active ON system_functions(is_active);
CREATE INDEX IF NOT EXISTS idx_system_functions_order ON system_functions(func_order);
CREATE INDEX IF NOT EXISTS idx_system_functions_module ON system_functions(module_code);

COMMENT ON TABLE system_functions IS '系統功能設定表';
COMMENT ON COLUMN system_functions.func_code IS '功能代碼';
COMMENT ON COLUMN system_functions.upper_func_id IS '上層功能 (0為根節點)';
COMMENT ON COLUMN system_functions.func_name IS '功能名稱（JSONB 多語系）';
COMMENT ON COLUMN system_functions.func_type IS '功能類型 (1:節點, 2:功能)';
COMMENT ON COLUMN system_functions.func_order IS '功能次序';
COMMENT ON COLUMN system_functions.func_icon IS '功能圖示';
COMMENT ON COLUMN system_functions.module_code IS '模組代碼';
COMMENT ON COLUMN system_functions.module_item IS '可設定權限項目 JSON 陣列';
COMMENT ON COLUMN system_functions.description IS '說明';
COMMENT ON COLUMN system_functions.is_mana IS '系統管理功能';
COMMENT ON COLUMN system_functions.is_active IS '啟用';

-- ============================================
-- 5. 系統設定檔 (sys_profiles)
-- ============================================

CREATE TABLE IF NOT EXISTS sys_profiles (
    id INTEGER PRIMARY KEY DEFAULT 1,
    is_service BOOLEAN NOT NULL DEFAULT TRUE,
    sys_url VARCHAR(200) NOT NULL,
    sys_title JSONB NOT NULL DEFAULT '{}',
    sys_copyright JSONB NOT NULL DEFAULT '{}',
    sys_organization INTEGER NOT NULL DEFAULT 1 REFERENCES organizations(id),
    sys_mana_email VARCHAR(200) NOT NULL,
    sys_timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Taipei',
    sys_languages JSONB NOT NULL DEFAULT '["zh-TW"]',
    login_bg VARCHAR(50) NOT NULL DEFAULT 'default',
    color_theme VARCHAR(50) NOT NULL DEFAULT 'classic-blue',
    layout_mode VARCHAR(50) NOT NULL DEFAULT 'vertical',
    edit_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    CONSTRAINT chk_sys_profile_id CHECK (id = 1)
);

COMMENT ON TABLE sys_profiles IS '系統設定檔 (唯一一筆)';
COMMENT ON COLUMN sys_profiles.is_service IS '系統狀態 (true:正常, false:維護)';
COMMENT ON COLUMN sys_profiles.sys_url IS '系統網址';
COMMENT ON COLUMN sys_profiles.sys_title IS '系統標題（JSONB 多語系）';
COMMENT ON COLUMN sys_profiles.sys_copyright IS '版權宣告（JSONB 多語系）';
COMMENT ON COLUMN sys_profiles.sys_organization IS '系統管理公司';
COMMENT ON COLUMN sys_profiles.sys_mana_email IS '系統管理員電子郵件';
COMMENT ON COLUMN sys_profiles.sys_timezone IS '系統時區';
COMMENT ON COLUMN sys_profiles.sys_languages IS '啟用的語系代碼陣列（JSONB）';
COMMENT ON COLUMN sys_profiles.login_bg IS '登入頁背景圖代碼';
COMMENT ON COLUMN sys_profiles.color_theme IS '內頁配色主題代碼';
COMMENT ON COLUMN sys_profiles.layout_mode IS '版面模式：vertical 或 horizontal';

-- ============================================
-- 6. 角色權限設定表 (role_rights)
-- ============================================

CREATE TABLE IF NOT EXISTS role_rights (
    id SERIAL PRIMARY KEY,
    user_role_id INTEGER NOT NULL REFERENCES user_roles(id) ON DELETE CASCADE,
    system_function_id INTEGER NOT NULL REFERENCES system_functions(id) ON DELETE CASCADE,
    func_code VARCHAR(200) NOT NULL,
    is_create BOOLEAN NOT NULL DEFAULT FALSE,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    is_update BOOLEAN NOT NULL DEFAULT FALSE,
    is_delete BOOLEAN NOT NULL DEFAULT FALSE,
    is_print BOOLEAN NOT NULL DEFAULT FALSE,
    is_file BOOLEAN NOT NULL DEFAULT FALSE,
    edit_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_role_rights_role ON role_rights(user_role_id);
CREATE INDEX IF NOT EXISTS idx_role_rights_function ON role_rights(system_function_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_role_rights_unique ON role_rights(user_role_id, system_function_id);

COMMENT ON TABLE role_rights IS '角色權限設定表';
COMMENT ON COLUMN role_rights.user_role_id IS '角色編號';
COMMENT ON COLUMN role_rights.system_function_id IS '功能編號';
COMMENT ON COLUMN role_rights.func_code IS '功��代碼';

-- ============================================
-- 7. 系統代碼明細檔 (system_codes)
-- ============================================

CREATE TABLE IF NOT EXISTS system_codes (
    id SERIAL PRIMARY KEY,
    code_type VARCHAR(100) NOT NULL,
    code_type_name JSONB NOT NULL DEFAULT '{}',
    code VARCHAR(50) NOT NULL,
    code_name JSONB NOT NULL DEFAULT '{}',
    "order" INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    note1 VARCHAR(500),
    note2 VARCHAR(500),
    note3 VARCHAR(500),
    note4 VARCHAR(500),
    note5 VARCHAR(500),
    edit_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_system_codes_type ON system_codes(code_type);
CREATE INDEX IF NOT EXISTS idx_system_codes_code ON system_codes(code);
CREATE INDEX IF NOT EXISTS idx_system_codes_active ON system_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_system_codes_order ON system_codes("order");

COMMENT ON TABLE system_codes IS '系統代碼明細檔';
COMMENT ON COLUMN system_codes.code_type IS '代碼類別識別碼（程式用）';
COMMENT ON COLUMN system_codes.code_type_name IS '代碼類別名稱（JSONB 多語系）';
COMMENT ON COLUMN system_codes.code IS '代碼編號';
COMMENT ON COLUMN system_codes.code_name IS '代碼名稱（JSONB 多語系）';
COMMENT ON COLUMN system_codes."order" IS '次序';
COMMENT ON COLUMN system_codes.is_active IS '啟用';

-- ============================================
-- 8. 系統通知表 (system_notifications)
-- ============================================

CREATE TABLE IF NOT EXISTS system_notifications (
    id SERIAL PRIMARY KEY,
    notice_subject JSONB NOT NULL DEFAULT '{}',
    notice_description JSONB NOT NULL DEFAULT '{}',
    notice_start_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notice_end_at TIMESTAMP NOT NULL,
    notice_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    edit_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_active ON system_notifications(is_active);
CREATE INDEX IF NOT EXISTS idx_notifications_time ON system_notifications(notice_start_at, notice_end_at);
CREATE INDEX IF NOT EXISTS idx_notifications_order ON system_notifications(notice_order);

COMMENT ON TABLE system_notifications IS '系統通知表';
COMMENT ON COLUMN system_notifications.notice_subject IS '通知主旨（JSONB 多語系）';
COMMENT ON COLUMN system_notifications.notice_description IS '通知說明（JSONB 多語系，富文本格式）';

-- ============================================
-- 9. 系統通知關閉日期記錄表 (notification_closedates)
-- ============================================

CREATE TABLE IF NOT EXISTS notification_closedates (
    id SERIAL PRIMARY KEY,
    closed_at DATE NOT NULL DEFAULT CURRENT_DATE,
    edit_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notification_closedates_edit_by ON notification_closedates(edit_by);
CREATE INDEX IF NOT EXISTS idx_notification_closedates_closed_at ON notification_closedates(closed_at);
CREATE INDEX IF NOT EXISTS idx_notification_closedates_edit_by_closed_at ON notification_closedates(edit_by, closed_at);

COMMENT ON TABLE notification_closedates IS '系統通知關閉日期記錄表';

-- ============================================
-- 10. 使用者作業紀錄表 (user_logs)
-- ============================================

CREATE TABLE IF NOT EXISTS user_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    system_function_id INTEGER NOT NULL,
    module_item VARCHAR(50) NOT NULL,
    data_id INTEGER,
    session_id VARCHAR(36),
    look_data JSONB NOT NULL DEFAULT '{}',
    change_data JSONB NOT NULL DEFAULT '{}',
    action_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    err_detail VARCHAR(2000),
    CONSTRAINT chk_user_logs_module_item CHECK (module_item IN ('Create', 'Read', 'Update', 'Delete', 'Print', 'File', 'Login'))
);

CREATE INDEX IF NOT EXISTS idx_user_logs_user ON user_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_logs_function ON user_logs(system_function_id);
CREATE INDEX IF NOT EXISTS idx_user_logs_action_at ON user_logs(action_at);
CREATE INDEX IF NOT EXISTS idx_user_logs_module ON user_logs(module_item);
CREATE INDEX IF NOT EXISTS idx_user_logs_session ON user_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_user_logs_data_id ON user_logs(data_id);

COMMENT ON TABLE user_logs IS '使用者作業紀錄表';
COMMENT ON COLUMN user_logs.user_id IS '作業人員';
COMMENT ON COLUMN user_logs.system_function_id IS '作業功能';
COMMENT ON COLUMN user_logs.module_item IS '模組項目 (Create/Read/Update/Delete/Print/File/Login)';
COMMENT ON COLUMN user_logs.data_id IS '資料序號';
COMMENT ON COLUMN user_logs.session_id IS '登入Session識別碼';
COMMENT ON COLUMN user_logs.look_data IS '檢視資料 (JSON)';
COMMENT ON COLUMN user_logs.change_data IS '異動資料 (JSON)';
COMMENT ON COLUMN user_logs.action_at IS '作業時間';
COMMENT ON COLUMN user_logs.err_detail IS '異常紀錄';

-- ============================================
-- 11. 語系管理表 (sys_languages)
-- ============================================

CREATE TABLE IF NOT EXISTS sys_languages (
    id SERIAL PRIMARY KEY,
    lang_code VARCHAR(10) UNIQUE NOT NULL,
    lang_cname VARCHAR(100) NOT NULL,
    lang_ename VARCHAR(100) NOT NULL,
    lang_data JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    edit_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sys_languages_code ON sys_languages(lang_code);
CREATE INDEX IF NOT EXISTS idx_sys_languages_active ON sys_languages(is_active);

COMMENT ON TABLE sys_languages IS '語系管理表';
COMMENT ON COLUMN sys_languages.lang_code IS '語系代碼（IETF 標籤，如 zh-TW, en）';
COMMENT ON COLUMN sys_languages.lang_cname IS '語系中文名稱';
COMMENT ON COLUMN sys_languages.lang_ename IS '語系英文名稱';
COMMENT ON COLUMN sys_languages.lang_data IS '完整翻譯 JSON 資料（前端 translation.json 內容）';
COMMENT ON COLUMN sys_languages.is_active IS '啟用';


-- ============================================
-- 初始資料
-- ============================================

-- 1. 預設組織 (系統管理公司)
INSERT INTO organizations (id, org_code, org_name, org_type, contact_person, contact_email, contact_phone, address, phone, is_mana, is_active, memo, edit_by)
VALUES (1, '00000000', '系統管理公司', 2, '系統管理員', 'admin@system.com', '0000000000', '', '', TRUE, TRUE, '', 1)
ON CONFLICT (id) DO NOTHING;

-- 2. 預設使用者角色
INSERT INTO user_roles (id, role_name, description, is_mana, is_active, edit_by)
VALUES (1, '{"zh-TW":"系統管理員","en":"System Administrator"}', '系統最高管理角色', TRUE, TRUE, 1)
ON CONFLICT (id) DO NOTHING;

-- 3. 預設管理員帳號 (密碼: admin123, bcrypt hash)
INSERT INTO users (id, organization_id, account, username, password, user_role, is_active, edit_by)
VALUES (1, 1, 'admin', '系統管理員', '$2b$12$BjTX831P1VnmDOagITw/He9wfHDai1qeK.W0d2OiSFyH8WF7GQd/C', '[1]', TRUE, 1)
ON CONFLICT (id) DO NOTHING;

-- 4. 預設系統功能選單
INSERT INTO system_functions (id, func_code, upper_func_id, func_name, func_type, func_order, func_icon, module_code, module_item, description, is_mana, is_active, edit_by)
VALUES
-- 隱藏功能 (func_order 1~9，不在 Sidebar 顯示)
(14, 'my_profile',       0, '{"zh-TW":"個人資料","en":"My Profile"}',         2, 1, 'AccountCircle', 'my_profile',       '["Read","Update"]', '個人資料維護', FALSE, TRUE, 1),
(15, 'change_password',  0, '{"zh-TW":"密碼變更","en":"Change Password"}',    2, 2, 'VpnKey',        'change_password',  '["Read","Update"]', '密碼變更',     FALSE, TRUE, 1),
(16, 'logout',           0, '{"zh-TW":"登出","en":"Logout"}',                 2, 3, NULL,            'logout',           '["Read"]',          '登出系統',     FALSE, TRUE, 1),
(18, 'home',             0, '{"zh-TW":"首頁","en":"Home"}',                   2, 4, 'Home',          'home',             '["Read"]',          '系統首頁',     FALSE, TRUE, 1),
-- 系統管理後台 (節點)
(1,  'system_mana',      0, '{"zh-TW":"系統管理後台","en":"System Management"}',          1, 10,   '🗂️', NULL,                   '[]', '', TRUE, TRUE, 1),
(2,  'sys_profile',      1, '{"zh-TW":"系統設定資料","en":"System Profile"}',              2, 1010, '🏷️', 'sys_profile',          '["Create","Read","Update","Delete","Print","File"]', '', TRUE, TRUE, 1),
(3,  'organizations',    1, '{"zh-TW":"組織設定","en":"Organizations"}',                   2, 1020, '🏷️', 'organizations',        '["Create","Read","Update","Delete","Print","File"]', '', TRUE, TRUE, 1),
(4,  'user_roles',       1, '{"zh-TW":"使用者角色設定","en":"User Roles"}',                2, 1030, '🏷️', 'user_roles',           '["Create","Read","Update","Delete","Print","File"]', '', TRUE, TRUE, 1),
(5,  'users',            1, '{"zh-TW":"使用者設定","en":"Users"}',                         2, 1040, '🏷️', 'users',                '["Create","Read","Update","Delete","Print","File"]', '', TRUE, TRUE, 1),
(6,  'system_functions', 1, '{"zh-TW":"系統功能管理","en":"System Functions"}',            2, 1050, '🏷️', 'system_functions',     '["Create","Read","Update","Delete","Print","File"]', '', TRUE, TRUE, 1),
(7,  'role_rights',      1, '{"zh-TW":"角色權限設定","en":"Role Rights"}',                 2, 1060, '🏷️', 'role_rights',          '["Create","Read","Update","Delete","Print","File"]', '', TRUE, TRUE, 1),
(8,  'system_codes',     1, '{"zh-TW":"系統代碼管理","en":"System Codes"}',                2, 1070, '🏷️', 'system_codes',         '["Create","Read","Update","Delete","Print","File"]', '', TRUE, TRUE, 1),
(9,  'system_notifications', 1, '{"zh-TW":"系統通知管理","en":"System Notifications"}',    2, 1080, '🏷️', 'system_notifications', '["Create","Read","Update","Delete","Print","File"]', '', TRUE, TRUE, 1),
(10, 'user_logs',        1, '{"zh-TW":"使用者日誌","en":"User Logs"}',                     2, 1090, '🏷️', 'user_logs',            '["Read"]', '', TRUE, TRUE, 1),
-- 租戶管理 (節點)
(11, 'tenant_mana',      0, '{"zh-TW":"租戶管理","en":"Tenant Management"}',              1, 20,   '🗂️', NULL,                   '[]', '', FALSE, TRUE, 1),
(12, 'tenant_profile',  11, '{"zh-TW":"組織資料維護","en":"Tenant Profile"}',              2, 2010, '🏷️', 'tenant_profile',       '["Create","Read","Update","Delete","Print","File"]', '', FALSE, TRUE, 1),
(13, 'tenant_users',    11, '{"zh-TW":"組織使用者管理","en":"Tenant Users"}',              2, 2020, '🏷️', 'tenant_users',         '["Create","Read","Update","Delete","Print","File"]', '', FALSE, TRUE, 1)
ON CONFLICT (id) DO NOTHING;

-- 5. 預設系統設定
INSERT INTO sys_profiles (id, is_service, sys_url, sys_title, sys_copyright, sys_organization, sys_mana_email, sys_timezone, sys_languages, login_bg, color_theme, layout_mode, edit_by)
VALUES (1, TRUE, 'http://localhost:10180',
    '{"zh-TW":"後臺管理基底平台","en":"Base AP Management System"}',
    '{"zh-TW":"版權所有","en":"All Rights Reserved"}',
    1, 'admin@system.com', 'Asia/Taipei',
    '["zh-TW","en"]', 'default', 'classic-blue', 'vertical', 1)
ON CONFLICT (id) DO NOTHING;

-- 6. 預設角色權限 (系統管理員擁有所有功能的完整權限)
INSERT INTO role_rights (user_role_id, system_function_id, func_code, is_create, is_read, is_update, is_delete, is_print, is_file, edit_by)
SELECT 1, id, func_code, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, 1
FROM system_functions
WHERE func_type = 2
ON CONFLICT DO NOTHING;

-- 7. 語系管理初始資料（lang_data 為空，需另行匯入翻譯資料）
INSERT INTO sys_languages (id, lang_code, lang_cname, lang_ename, lang_data, is_active, edit_by)
VALUES
(1, 'zh-TW', '繁體中文', 'Traditional Chinese', '{}', TRUE, 1),
(2, 'en',    '英文',     'English',             '{}', TRUE, 1)
ON CONFLICT (lang_code) DO NOTHING;

-- 8. Language 語系代碼（system_codes）
INSERT INTO system_codes (code_type, code_type_name, code, code_name, "order", is_active, note1, edit_by)
VALUES
('Language', '{"zh-TW":"語系","en":"Language"}', 'zh-TW', '{"zh-TW":"繁體中文","en":"Traditional Chinese"}', 1, TRUE, '繁中', 1),
('Language', '{"zh-TW":"語系","en":"Language"}', 'en',    '{"zh-TW":"英文","en":"English"}',                 2, TRUE, 'EN',   1)
ON CONFLICT DO NOTHING;

-- 9. 系統錯誤代碼（ERROR_CODES）
INSERT INTO system_codes (code_type, code_type_name, code, code_name, "order", is_active, edit_by)
VALUES
('ERROR_CODES', '{"zh-TW":"系統錯誤代碼","en":"System Error Codes"}', 'CAPTCHA_INVALID',       '{"zh-TW":"驗證碼錯誤或已過期","en":"Verification code is incorrect or expired"}',   1, TRUE, 1),
('ERROR_CODES', '{"zh-TW":"系統錯誤代碼","en":"System Error Codes"}', 'INVALID_CREDENTIALS',   '{"zh-TW":"帳號或密碼錯誤","en":"Invalid account or password"}',                     2, TRUE, 1),
('ERROR_CODES', '{"zh-TW":"系統錯誤代碼","en":"System Error Codes"}', 'ACCOUNT_DISABLED',      '{"zh-TW":"帳號已停用","en":"Account has been disabled"}',                          3, TRUE, 1),
('ERROR_CODES', '{"zh-TW":"系統錯誤代碼","en":"System Error Codes"}', 'SESSION_EXPIRED',       '{"zh-TW":"Session 已過期，請重新登入","en":"Session expired, please login again"}', 4, TRUE, 1),
('ERROR_CODES', '{"zh-TW":"系統錯誤代碼","en":"System Error Codes"}', 'AUTH_INVALID',          '{"zh-TW":"無法驗證認證資訊","en":"Authentication failed"}',                         5, TRUE, 1),
('ERROR_CODES', '{"zh-TW":"系統錯誤代碼","en":"System Error Codes"}', 'SESSION_CREATE_FAILED', '{"zh-TW":"系統錯誤：無法建立 Session","en":"System error: failed to create session"}', 6, TRUE, 1)
ON CONFLICT DO NOTHING;

-- 重設序列
SELECT setval('organizations_id_seq', (SELECT COALESCE(MAX(id), 0) FROM organizations));
SELECT setval('user_roles_id_seq', (SELECT COALESCE(MAX(id), 0) FROM user_roles));
SELECT setval('users_id_seq', (SELECT COALESCE(MAX(id), 0) FROM users));
SELECT setval('system_functions_id_seq', (SELECT COALESCE(MAX(id), 0) FROM system_functions));
SELECT setval('sys_languages_id_seq', (SELECT COALESCE(MAX(id), 0) FROM sys_languages));
SELECT setval('system_codes_id_seq', (SELECT COALESCE(MAX(id), 0) FROM system_codes));

-- ============================================
-- 完成
-- ============================================
