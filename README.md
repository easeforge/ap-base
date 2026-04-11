# Base AP - Backend Administration Platform

**Version 1.0.0** | Python Edition

A production-ready backend administration platform providing essential infrastructure for management systems. Designed as a reusable foundation — fork it, extend it, ship your product.

---

## Features

### Authentication & Security
- JWT-based authentication with access token
- CAPTCHA verification on login
- Transaction token (X-Txn-Token) for write operations — per-function permission validation
- Session management with login tracking
- Password hashing (bcrypt)
- CORS configuration

### Organization & Multi-tenancy
- Organization (tenant) management with CRUD
- Organization types: Government / Company / Individual
- System management company designation (is_mana)
- Tenant-scoped user management
- Tenant profile self-service

### User Management
- User CRUD with organization association
- Multi-role assignment (JSONB array)
- Department / Job title / Phone fields
- Login history tracking (last login time & IP)
- Account activation/deactivation
- Password change (self-service)
- Personal profile editing

### Role-Based Access Control (RBAC)
- Role management with CRUD
- System admin role designation (is_mana)
- Per-function permission matrix: Create / Read / Update / Delete / Print / File
- Permission inheritance through multi-role assignment (OR logic)
- Frontend permission hook (`usePermission`)
- Backend token-based permission verification

### System Functions
- Tree-structured function menu (Node / Function types)
- Dynamic sidebar menu generation from database
- Function code-based routing (`func_code` maps to frontend route)
- Module code for permission grouping
- Configurable permission items per function
- Hidden functions (func_order 1-9) for user menu items
- Personal function node for user dropdown menu

### Internationalization (i18n)
- **JSONB multi-language fields** — all display names stored as `{"zh-TW": "...", "en": "...", "zh-CN": "..."}`
- **Base language: English** — fallback when translation is missing
- **Dynamic language loading** — i18next-http-backend loads translations from API
- **Static file fallback** — bundled translations for offline/API-unavailable scenarios
- **Language switcher** — auto-adapts: hidden (1 lang), buttons (2 langs), dropdown (3+ langs)
- **Translation key sync** — one-click scan & fill missing keys across all languages
  - zh-CN: auto Traditional-to-Simplified conversion (opencc)
  - Other languages: copy from English base
- **System settings** — enable/disable languages with checkbox, dynamic input fields per enabled language
- **5 JSONB tables**: system_codes, system_functions, sys_profiles, user_roles, system_notifications

### System Codes
- Flexible code management for dropdown lists, categories, classifications
- Code type + code structure (e.g., Language, Country_Codes_2, TWN_Area)
- JSONB multi-language names for code types and code values
- 5 auxiliary note fields (note1-5) for additional metadata
- Pre-loaded: ISO 3166-1 Country Codes (249 countries) + Taiwan Administrative Areas (390 entries)
- Keyword search across all fields

### System Notifications
- Announcement management with start/end time scheduling
- JSONB multi-language subject and description (rich text)
- Priority ordering
- Dashboard notification modal with pagination (previous/next)
- "Don't show today" feature with close date tracking
- Active/inactive toggle

### User Activity Logs
- Automatic logging for all CRUD operations
- Per-function, per-action tracking (Create/Read/Update/Delete/Print/File/Login)
- Before/after data capture for update operations
- Session ID correlation
- Error detail recording
- Filterable log viewer (by user, function, operation, date range, status)

### System Settings
- Single-record system profile (id=1)
- Service status toggle (maintenance mode)
- System URL, title, copyright (JSONB multi-language)
- Organization assignment
- Admin email
- Timezone configuration
- Language settings (enable/disable with checkbox)
- Translation key sync button

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11+ / FastAPI / SQLAlchemy / Pydantic v2 |
| Frontend | React 18 / TypeScript / Material-UI / i18next |
| Database | PostgreSQL 15+ (JSONB for multi-language fields) |
| Cache | Redis (session management) |
| Auth | JWT (access token) + Transaction token + CAPTCHA |

---

## Database Schema

11 tables with JSONB multi-language support:

| Table | Description | JSONB Fields |
|-------|-------------|-------------|
| organizations | Tenant/organization management | - |
| users | User accounts | user_role (role ID array) |
| user_roles | Role definitions | role_name |
| system_functions | Menu & function registry | func_name, module_item |
| sys_profiles | System settings (single record) | sys_title, sys_copyright, sys_languages |
| role_rights | Role-function permission matrix | - |
| system_codes | Configurable code tables | code_type_name, code_name |
| system_notifications | System announcements | notice_subject, notice_description |
| notification_closedates | Notification dismissal tracking | - |
| user_logs | User activity audit trail | look_data, change_data |
| sys_languages | Language management & translations | lang_data (full translation JSON) |

---

## Project Structure

```
Develop/
├── backend/
│   ├── app/
│   │   ├── core/           # Config, database, auth, timezone, dependencies
│   │   ├── models/         # SQLAlchemy models (11 tables)
│   │   ├── schemas/        # Pydantic request/response schemas
│   │   ├── routes/         # FastAPI route handlers
│   │   └── services/       # Business logic services
│   ├── init_db.sql         # Database initialization script (v2.0.0)
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── api/            # Axios instance & system API
│   │   ├── components/     # Reusable UI components
│   │   ├── contexts/       # React contexts (Auth, System)
│   │   ├── hooks/          # Custom hooks (permission, functionName, etc.)
│   │   ├── locales/        # Translation files (zh-TW, en, zh-CN)
│   │   ├── pages/          # Page components (14 pages)
│   │   ├── services/       # API service layer
│   │   ├── styles/         # CSS stylesheets
│   │   ├── types/          # TypeScript type definitions
│   │   └── utils/          # Helper utilities (i18n, session, userLog)
│   └── package.json
```

---

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 15+
- Redis

### Database Setup
```sql
CREATE DATABASE "baseAP" OWNER admin;
\c baseAP
\i Develop/backend/init_db.sql
```

### Backend
```bash
cd Develop/backend
python -m venv venv
venv/Scripts/activate        # Windows
# source venv/bin/activate   # Linux/Mac
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 10181 --reload
```

### Frontend
```bash
cd Develop/frontend
npm install
npm start    # Development server on port 10180
```

### Default Login
- Account: `admin`
- Password: `admin123`

---

## API Documentation

After starting the backend, visit:
- Swagger UI: http://localhost:10181/docs
- ReDoc: http://localhost:10181/redoc

### API Endpoints Overview

| Prefix | Module | Description |
|--------|--------|-------------|
| /api/auth | Authentication | Login, logout, CAPTCHA, transaction token |
| /api/system | System | Profile, health check, functions menu, languages |
| /api/sys_profiles | System Profile | System settings CRUD |
| /api/organizations | Organizations | Organization CRUD |
| /api/users | Users | User management + my profile + password change |
| /api/user_roles | User Roles | Role CRUD |
| /api/role_rights | Role Rights | Permission matrix management |
| /api/system_functions | System Functions | Function registry CRUD + tree |
| /api/system_codes | System Codes | Code table CRUD + type query |
| /api/system_notifications | Notifications | Notification CRUD + home notifications |
| /api/sys_languages | Languages | Language management + translation sync |
| /api/user_logs | User Logs | Activity log query |
| /api/permissions | Permissions | Transaction token verification |

---

## Pages

| Page | Route | Description |
|------|-------|-------------|
| Login | /login | User login with CAPTCHA |
| Dashboard | /dashboard | Welcome page with notification modal |
| System Profile | /sys_profile | System settings & language configuration |
| Organizations | /organizations | Organization management (admin) |
| User Roles | /user_roles | Role management |
| Users | /users | User management (admin) |
| System Functions | /system_functions | Function menu registry |
| Role Rights | /role_rights | Role-function permission matrix |
| System Codes | /system_codes | Code table management |
| System Notifications | /system_notifications | Announcement management |
| User Logs | /user_logs | Activity log viewer |
| Tenant Profile | /tenant_profile | Organization self-service (tenant) |
| Tenant Users | /tenant_users | Member management (tenant) |
| My Profile | /my_profile | Personal profile editing |
| Change Password | /change_password | Password change |
| Maintenance | /maintenance | System maintenance page |

---

## Extending the Platform

### Adding a New Business Module

1. **Backend**: Create model, schema, route, (optional) service under `app/`
2. **Frontend**: Create service, page component, add route in `App.tsx`
3. **Register**: Add to system_functions via UI — set function code, name, permissions
4. **Authorize**: Set role permissions via Role Rights page

The sidebar menu, breadcrumb, permission checks, and activity logging will work automatically.

### Adding a New Language

1. Create translation file: `src/locales/{lang_code}/translation.json`
2. Add to database: `sys_languages` record + `system_codes` Language entry
3. Enable in System Settings (checkbox)
4. Click "Sync Translation Keys" to fill missing keys from English base
5. Refine translations through language management

---

## Design Decisions

- **JSONB for i18n** — Small data volume, high flexibility, no JOIN needed
- **Base language: English** — All code and fallback values in English
- **Business tables don't need i18n** — Users write content in their target language
- **Language data: add-only** — Disable = hide, never delete
- **Transaction token** — Write operations require function-specific permission token
- **Function-driven architecture** — Sidebar, permissions, logging all derive from system_functions table

---

## License

Copyright (c) 2026 JiangYun Co., Ltd. All rights reserved.
