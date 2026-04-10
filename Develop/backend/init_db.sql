-- ============================================
-- baseAP 後臺管理基底平台 - 資料庫初始化腳本
-- ============================================
-- 資料庫名稱: baseAP
-- 版本: 1.0.0
-- 說明: 建立後臺管理與租戶組織的基底資料表
--
-- 執行前請先建立資料庫:
--   CREATE DATABASE "baseAP" OWNER admin;
-- ============================================

-- ============================================
-- 1. 組織單位明細檔 (organizations)
-- ============================================

CREATE TABLE IF NOT EXISTS organizations (
    id SERIAL PRIMARY KEY,
    org_code VARCHAR(200) UNIQUE NOT NULL,
    org_name VARCHAR(200) NOT NULL,
    org_type INTEGER NOT NULL CHECK (org_type IN (1, 2, 3)),
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
    updated_at TIMESTAMP
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
    role_cname VARCHAR(200) NOT NULL,
    role_ename VARCHAR(200) NOT NULL,
    description TEXT,
    is_mana BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    edit_by INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_roles_active ON user_roles(is_active);

COMMENT ON TABLE user_roles IS '使用者角色明細檔';
COMMENT ON COLUMN user_roles.role_cname IS '中文名稱';
COMMENT ON COLUMN user_roles.role_ename IS '英文名稱';
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
    func_cname VARCHAR(200) NOT NULL,
    func_ename VARCHAR(200) NOT NULL,
    func_type INTEGER NOT NULL CHECK (func_type IN (1, 2)),
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
COMMENT ON COLUMN system_functions.func_cname IS '中文名稱';
COMMENT ON COLUMN system_functions.func_ename IS '英文名稱';
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
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    is_service BOOLEAN NOT NULL DEFAULT TRUE,
    sys_url VARCHAR(200) NOT NULL,
    sys_ctitle VARCHAR(200) NOT NULL,
    sys_etitle VARCHAR(200) NOT NULL,
    sys_ccopyright VARCHAR(200) NOT NULL,
    sys_ecopyright VARCHAR(200) NOT NULL,
    sys_organization INTEGER NOT NULL DEFAULT 1 REFERENCES organizations(id),
    sys_mana_email VARCHAR(200) NOT NULL,
    sys_timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Taipei',
    edit_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

COMMENT ON TABLE sys_profiles IS '系統設定檔 (唯一一筆)';
COMMENT ON COLUMN sys_profiles.is_service IS '系統狀態 (true:正常, false:維護)';
COMMENT ON COLUMN sys_profiles.sys_url IS '系統網址';
COMMENT ON COLUMN sys_profiles.sys_ctitle IS '系統中文標題';
COMMENT ON COLUMN sys_profiles.sys_etitle IS '系統英文標題';
COMMENT ON COLUMN sys_profiles.sys_ccopyright IS '系統中文版權宣告';
COMMENT ON COLUMN sys_profiles.sys_ecopyright IS '系統英文版權宣告';
COMMENT ON COLUMN sys_profiles.sys_organization IS '系統管理公司';
COMMENT ON COLUMN sys_profiles.sys_mana_email IS '系統管理員電子郵件';
COMMENT ON COLUMN sys_profiles.sys_timezone IS '系統時區';

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
COMMENT ON COLUMN role_rights.func_code IS '功能代碼';

-- ============================================
-- 7. 系統代碼明細檔 (system_codes)
-- ============================================

CREATE TABLE IF NOT EXISTS system_codes (
    id SERIAL PRIMARY KEY,
    code_etype VARCHAR(100) NOT NULL,
    code_ctype VARCHAR(200) NOT NULL,
    code VARCHAR(50) NOT NULL,
    code_cname VARCHAR(300) NOT NULL,
    code_ename VARCHAR(300),
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

CREATE INDEX IF NOT EXISTS idx_system_codes_type ON system_codes(code_etype, code_ctype);
CREATE INDEX IF NOT EXISTS idx_system_codes_code ON system_codes(code);
CREATE INDEX IF NOT EXISTS idx_system_codes_active ON system_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_system_codes_order ON system_codes("order");

COMMENT ON TABLE system_codes IS '系統代碼明細檔';
COMMENT ON COLUMN system_codes.code_etype IS '代碼類別英文名稱';
COMMENT ON COLUMN system_codes.code_ctype IS '代碼類別中文名稱';
COMMENT ON COLUMN system_codes.code IS '代碼編號';
COMMENT ON COLUMN system_codes.code_cname IS '代碼中文名稱';
COMMENT ON COLUMN system_codes.code_ename IS '代碼英文名稱';
COMMENT ON COLUMN system_codes."order" IS '次序';
COMMENT ON COLUMN system_codes.is_active IS '啟用';

-- ============================================
-- 8. 系統通知表 (system_notifications)
-- ============================================

CREATE TABLE IF NOT EXISTS system_notifications (
    id SERIAL PRIMARY KEY,
    notice_csubject VARCHAR(200) NOT NULL,
    notice_esubject VARCHAR(200) NOT NULL,
    notice_cdescription TEXT NOT NULL,
    notice_edescription TEXT NOT NULL,
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
    module_item VARCHAR(50) NOT NULL CHECK (module_item IN ('Create', 'Read', 'Update', 'Delete', 'Print', 'File', 'Login')),
    data_id INTEGER,
    session_id VARCHAR(36),
    look_data JSONB NOT NULL DEFAULT '{}',
    change_data JSONB NOT NULL DEFAULT '{}',
    action_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    err_detail VARCHAR(2000)
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
COMMENT ON COLUMN user_logs.module_item IS '模組項目';
COMMENT ON COLUMN user_logs.data_id IS '資料序號';
COMMENT ON COLUMN user_logs.session_id IS '登入Session識別碼';
COMMENT ON COLUMN user_logs.look_data IS '檢視資料 (JSON)';
COMMENT ON COLUMN user_logs.change_data IS '異動資料 (JSON)';
COMMENT ON COLUMN user_logs.action_at IS '作業時間';
COMMENT ON COLUMN user_logs.err_detail IS '異常紀錄';


-- ============================================
-- 初始資料
-- ============================================

-- 預設組織 (系統管理公司)
INSERT INTO organizations (id, org_code, org_name, org_type, contact_person, contact_email, contact_phone, address, phone, is_mana, is_active, memo, edit_by)
VALUES (1, '00000000', '系統管理公司', 2, '系統管理員', 'admin@system.com', '0000000000', '', '', TRUE, TRUE, '', 1)
ON CONFLICT (id) DO NOTHING;

-- 預設使用者角色
INSERT INTO user_roles (id, role_cname, role_ename, description, is_mana, is_active, edit_by)
VALUES (1, '系統管理員', 'System Administrator', '系統最高管理角色', TRUE, TRUE, 1)
ON CONFLICT (id) DO NOTHING;

-- 預設管理員帳號 (密碼: admin123, bcrypt hash)
INSERT INTO users (id, organization_id, account, username, password, user_role, is_active, edit_by)
VALUES (1, 1, 'admin', '系統管理員', '$2b$12$LJ3m4ys3PxGSwUFJqYFE6.bnDn6rDPjFhHsNx0r/IhcXbLMbXCdcq', '[1]', TRUE, 1)
ON CONFLICT (id) DO NOTHING;

-- 預設系統功能選單 (後台管理)
INSERT INTO system_functions (id, func_code, upper_func_id, func_cname, func_ename, func_type, func_order, func_icon, module_code, module_item, description, is_mana, is_active, edit_by)
VALUES
(1, 'system_mana', 0, '系統管理後台', 'System Management', 1, 10, 'settings', NULL, '[]', '', TRUE, TRUE, 1),
(2, 'sys_profile', 1, '系統設定資料', 'System Profile', 2, 1010, 'settings', 'sys_profile', '["Create","Read","Update","Delete","Print","File"]', '', TRUE, TRUE, 1),
(3, 'organizations', 1, '組織設定', 'Organizations', 2, 1020, 'business', 'organizations', '["Create","Read","Update","Delete","Print","File"]', '', TRUE, TRUE, 1),
(4, 'user_roles', 1, '使用者角色設定', 'User Roles', 2, 1030, 'users', 'user_roles', '["Create","Read","Update","Delete","Print","File"]', '', TRUE, TRUE, 1),
(5, 'users', 1, '使用者設定', 'Users', 2, 1040, 'user', 'users', '["Create","Read","Update","Delete","Print","File"]', '', TRUE, TRUE, 1),
(6, 'system_functions', 1, '系統功能管理', 'System Functions', 2, 1050, 'functions', 'system_functions', '["Create","Read","Update","Delete","Print","File"]', '', TRUE, TRUE, 1),
(7, 'role_rights', 1, '角色權限設定', 'Role Rights', 2, 1060, 'shield', 'role_rights', '["Create","Read","Update","Delete","Print","File"]', '', TRUE, TRUE, 1),
(8, 'system_codes', 1, '系統代碼管理', 'System Codes', 2, 1070, 'code', 'system_codes', '["Create","Read","Update","Delete","Print","File"]', '', TRUE, TRUE, 1),
(9, 'system_notifications', 1, '系統通知管理', 'System Notifications', 2, 1080, 'bell', 'system_notifications', '["Create","Read","Update","Delete","Print","File"]', '', TRUE, TRUE, 1),
(10, 'user_logs', 1, '使用者日誌', 'User Logs', 2, 1090, 'log', 'user_logs', '["Read"]', '', TRUE, TRUE, 1)
ON CONFLICT (id) DO NOTHING;

-- 預設系統設定
INSERT INTO sys_profiles (id, is_service, sys_url, sys_ctitle, sys_etitle, sys_ccopyright, sys_ecopyright, sys_organization, sys_mana_email, sys_timezone, edit_by)
VALUES (1, TRUE, 'http://localhost:10180', '後臺管理基底平台', 'Base AP Management System', '版權所有', 'All Rights Reserved', 1, 'admin@system.com', 'Asia/Taipei', 1)
ON CONFLICT (id) DO NOTHING;

-- 預設角色權限 (系統管理員擁有所有功能的完整權限)
INSERT INTO role_rights (user_role_id, system_function_id, func_code, is_create, is_read, is_update, is_delete, is_print, is_file, edit_by)
SELECT 1, id, func_code, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, 1
FROM system_functions
WHERE func_type = 2
ON CONFLICT DO NOTHING;

-- 重設序列
SELECT setval('organizations_id_seq', (SELECT COALESCE(MAX(id), 0) FROM organizations));
SELECT setval('user_roles_id_seq', (SELECT COALESCE(MAX(id), 0) FROM user_roles));
SELECT setval('users_id_seq', (SELECT COALESCE(MAX(id), 0) FROM users));
SELECT setval('system_functions_id_seq', (SELECT COALESCE(MAX(id), 0) FROM system_functions));

-- ============================================
-- 完成
-- ============================================
