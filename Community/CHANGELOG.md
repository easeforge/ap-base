# Changelog

All notable changes to Base AP will be documented in this file.

## [1.0.0] - 2026-04-12

### Initial Release — Python Edition

**Backend Administration Platform** providing essential infrastructure for management systems.

#### Core Features
- **Authentication**: JWT + CAPTCHA + Transaction Token (X-Txn-Token)
- **Organization Management**: Multi-tenant with 3 org types
- **User Management**: Multi-role assignment, login tracking, password management
- **RBAC**: Role-function permission matrix (Create/Read/Update/Delete/Print/File)
- **System Functions**: Tree-structured menu, dynamic sidebar, function-code routing
- **System Codes**: Configurable code tables with 5 note fields
- **System Notifications**: Scheduled announcements with rich text
- **User Activity Logs**: Full audit trail with before/after data capture
- **System Settings**: Single-record profile with maintenance mode

#### Internationalization (i18n)
- JSONB multi-language fields (base language: English)
- Dynamic language loading via i18next-http-backend
- Language switcher (auto-adapts to 1/2/3+ languages)
- Translation key sync with auto fill (繁→簡 opencc conversion)
- 3 built-in languages: zh-TW, en, zh-CN

#### Pre-loaded Data
- ISO 3166-1 Country Codes (249 countries)
- Taiwan Administrative Areas (390 entries)
- Language codes (zh-TW, en, zh-CN)

#### Tech Stack
- Backend: Python 3.11+ / FastAPI / SQLAlchemy / Pydantic v2
- Frontend: React 18 / TypeScript / Material-UI / i18next
- Database: PostgreSQL 15+ (11 tables with JSONB)
- Cache: Redis

#### Pages (16)
Login, Dashboard, System Profile, Organizations, User Roles, Users, System Functions, Role Rights, System Codes, System Notifications, User Logs, Tenant Profile, Tenant Users, My Profile, Change Password, Maintenance

#### API Endpoints (13 modules)
auth, system, sys_profiles, organizations, users, user_roles, role_rights, system_functions, system_codes, system_notifications, sys_languages, user_logs, permissions
