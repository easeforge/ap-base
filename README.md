# Base AP — Backend Administration Platform

> **化繁為簡，匠心為先 · Craft simplified.**

A production-ready backend administration platform providing essential infrastructure for management systems. Designed as a reusable foundation — fork it, extend it, ship your product.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791.svg)](https://www.postgresql.org/)

By **EaseForge (匠耘有限公司)**

---

## Why Base AP

Building yet another admin dashboard from scratch wastes weeks. Base AP gives you the **boring-but-essential** foundation already done:

- ✅ Auth with CAPTCHA + JWT + Redis sessions + transaction tokens
- ✅ Multi-tenant organization & user management
- ✅ Role-based access control with per-function permission matrix
- ✅ Three-language support (zh-TW / zh-CN / en) via JSONB
- ✅ System-wide message code system (no hardcoded strings)
- ✅ Toast notification system with i18n
- ✅ Vertical sidebar / horizontal top-nav switching
- ✅ Activity logging on every CRUD
- ✅ Plugin system for adding commercial extensions

**Plug your business modules in. The plumbing is done.**

---

## Quick Start (5 minutes)

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 15+
- Redis 7+

### 1. Clone
```bash
git clone https://github.com/easeforge/ap-base.git
cd ap-base
```

### 2. Database
```sql
CREATE DATABASE "baseAP" OWNER admin;
\c baseAP
\i Develop/backend/init_db.sql
```

### 3. Backend
```bash
cd Develop/backend
python -m venv venv
source venv/bin/activate          # macOS/Linux
# venv\Scripts\activate           # Windows

pip install -r requirements.txt

# Copy and edit env
cp .env.example .env              # set DATABASE_URL, REDIS_HOST, etc.

uvicorn app.main:app --host 0.0.0.0 --port 10181 --reload
```

### 4. Frontend
```bash
cd Develop/frontend
npm install --legacy-peer-deps
npm start                          # http://localhost:10180
```

### 5. Login
- Account: `admin`
- Password: `Admin1234`
- ⚠️ **Change this in production!**

---

## Features

### Authentication & Security
- JWT-based auth with access token + Redis session
- Image CAPTCHA on login
- Transaction token (X-Txn-Token) — per-function permission verification for write operations
- bcrypt password hashing (version-pinned)
- CORS configuration

### Organization & Multi-tenancy
- Organization (tenant) management
- Tenant-scoped user management
- Three org types: Government / Company / Individual
- System administration designation (`is_mana`)

### Role-Based Access Control (RBAC)
- Multi-role assignment per user (JSONB array)
- Per-function permission matrix: Create / Read / Update / Delete / Print / File
- Multi-role union (OR) logic
- Frontend `usePermission` hook + backend token verification

### Internationalization (i18n)
- **JSONB multi-language fields** — `{"zh-TW": "...", "en": "...", "zh-CN": "..."}`
- **Three languages out of the box**: Traditional Chinese, Simplified Chinese, English
- **Dynamic language loading** — `i18next-http-backend` from API + static fallback
- **Adaptive language switcher** — auto: 1 lang hidden, 2 buttons, 3+ dropdown
- **Auto translation key sync** — fill missing keys (zh-CN auto-converts from zh-TW via opencc)

### Message Code System
- **All system messages** unified through `sys_message_code` table
- Format: `{SYS|ERR|DAT}{2-digit category}{4-digit number}` (e.g., `ERR010001`)
- Production codes (01~49) return safe messages; development codes (51~99) include details
- Backend `raise_msg(status, code, **params)` helper with parameter substitution
- Frontend `useMessage()` hook with toast notification (MUI Snackbar)
- 60+ pre-defined codes for auth, CRUD, and validation

### Layout Modes
- **Vertical** (default): collapsible sidebar with drag-to-resize
- **Horizontal**: top navigation bar with hover dropdowns
- Switchable via System Settings (admin only)

### System Functions
- Tree-structured menu (`func_type`: Node / Page / API / Background Task)
- Dynamic sidebar from database
- Function code (`func_code`) maps to frontend route
- Hidden functions (order < 10) for header user dropdown

### System Codes
- Flexible code management for dropdowns / lookup tables
- 5 auxiliary `note` fields per code
- Pre-loaded: ISO 3166-1 country codes (249) + Taiwan administrative areas (390)

### System Notifications
- Scheduled announcements with start/end time
- JSONB multi-language subject + rich text description
- Login modal with paginated viewing
- "Don't show today" with per-user dismissal tracking

### Activity Logging
- Auto-log every CRUD operation
- Before/after data capture (look_data / change_data JSONB)
- Per-function, per-action filtering
- Session ID correlation
- Filterable log viewer

### Home Dashboard
- Live statistics: users / organizations / 7-day logins / active notifications
- Recent 10 activity log entries with status badges
- Welcome card with user info + organization
- System notification modal

### CE / EE Plugin Architecture
- Open-source Community Edition includes plugin hooks
- Optional commercial Enterprise Edition adds: scheduling, AI integration, SSO, etc.
- License-key based feature activation (Ed25519 signed)
- See [ARCHITECTURE.md](ARCHITECTURE.md) for details

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11+ / FastAPI / SQLAlchemy 2 / Pydantic v2 |
| Frontend | React 18 / TypeScript 5 / Material-UI 7 / i18next |
| Database | PostgreSQL 15+ (JSONB for i18n) |
| Cache | Redis 7+ (session + captcha) |
| Auth | JWT + Transaction Token + CAPTCHA |
| Build | Docker + docker-compose |

---

## Architecture

```
┌─────────────────────────────────────────────┐
│  Frontend (React + TypeScript)              │
│  ├── i18next (3 languages)                  │
│  ├── MessageContext (Toast)                 │
│  ├── SystemContext (license, layout, ...)   │
│  └── 14 admin pages                         │
└──────────────────┬──────────────────────────┘
                   │ HTTP/JSON
┌──────────────────▼──────────────────────────┐
│  Backend (FastAPI)                          │
│  ├── /api/auth      — JWT + CAPTCHA         │
│  ├── /api/system    — public endpoints      │
│  ├── /api/...       — CRUD modules          │
│  └── /api/ee/...    — EE modules (if EE)    │
└──────────────────┬──────────────────────────┘
                   │
        ┌──────────┴──────────┐
┌───────▼────────┐    ┌───────▼────────┐
│  PostgreSQL    │    │  Redis         │
│  • 11 tables   │    │  • sessions    │
│  • JSONB i18n  │    │  • captchas    │
└────────────────┘    └────────────────┘
```

Detailed architecture: [ARCHITECTURE.md](ARCHITECTURE.md)

---

## Database Schema

11 tables, JSONB for multi-language fields:

| Table | Description |
|-------|-------------|
| organizations | Tenants |
| users | User accounts (with `user_role` JSONB array) |
| user_roles | Role definitions |
| system_functions | Menu & function registry |
| sys_profiles | Singleton system settings |
| role_rights | Role × function permission matrix |
| system_codes | Configurable code tables (incl. `sys_message_code`) |
| system_notifications | Scheduled announcements |
| notification_closedates | "Don't show today" tracking |
| user_logs | Activity audit trail |
| sys_languages | Language definitions + full translation JSON |

---

## Project Structure

```
ap-base/
├── LICENSE                      # MIT
├── README.md                    # This file
├── ARCHITECTURE.md              # CE/EE architecture
├── 系統設計/                    # Design specs (Chinese)
├── 開發紀錄/                    # Dev logs (Chinese)
└── Develop/
    ├── backend/
    │   ├── app/
    │   │   ├── core/            # Config, db, auth, license, plugin
    │   │   ├── models/          # SQLAlchemy models
    │   │   ├── schemas/         # Pydantic schemas
    │   │   ├── routes/          # FastAPI routes
    │   │   └── services/        # Business logic
    │   ├── tools/               # CLI helpers (insert codes, sign license)
    │   ├── init_db.sql          # DB initialization
    │   └── Dockerfile
    └── frontend/
        ├── src/
        │   ├── api/             # Axios + service modules
        │   ├── components/      # Reusable UI
        │   ├── contexts/        # React contexts
        │   ├── hooks/           # Custom hooks
        │   ├── locales/         # zh-TW / zh-CN / en
        │   ├── pages/           # 14 admin pages
        │   ├── services/        # API services
        │   ├── styles/          # CSS
        │   ├── types/           # TS types
        │   └── utils/           # Helpers
        └── Dockerfile
```

---

## Pages

| Page | Route | Purpose |
|------|-------|---------|
| Login | `/login` | Authentication with CAPTCHA |
| Home | `/home` | Dashboard with stats + notifications |
| System Profile | `/sys_profile` | System settings (admin only) |
| Organizations | `/organizations` | Tenant management (admin) |
| User Roles | `/user_roles` | Role definitions |
| Users | `/users` | User management (admin) |
| System Functions | `/system_functions` | Function registry (admin) |
| Role Rights | `/role_rights` | Permission matrix (admin) |
| System Codes | `/system_codes` | Code table management |
| System Notifications | `/system_notifications` | Announcement management |
| User Logs | `/user_logs` | Activity audit viewer |
| Tenant Profile | `/tenant_profile` | Org self-service (tenant) |
| Tenant Users | `/tenant_users` | Member management (tenant) |
| My Profile | `/my_profile` | Personal profile |
| Change Password | `/change_password` | Self-service password change |

---

## Extending the Platform

### Adding a Business Module

1. **Backend** — create model, schema, route, (optional) service under `app/`
2. **Frontend** — create service, page component, add route to `App.tsx`
3. **Register** — add to `system_functions` (via UI or migration)
4. **Authorize** — assign permission via Role Rights page

The sidebar menu, breadcrumbs, permission checks, and activity logging are derived automatically.

### Using the Message Code System

```python
# backend
from app.core.message_codes import raise_msg

if not user:
    raise_msg(status.HTTP_404_NOT_FOUND, "ERR020001",
              entity="使用者", id=user_id)
```

```typescript
// frontend
const { showSuccess, showApiError } = useMessage();

try {
  await createOrganization(formData);
  showSuccess('SYS020001', { name: pageTitle });
} catch (err) {
  showApiError(err);
}
```

See [系統設計/系統訊息分類設計.md](系統設計/系統訊息分類設計.md) for full code list.

### Adding a New Language

1. Add to `sys_languages` table
2. Enable in System Settings (checkbox)
3. Click "Sync Translation Keys" to fill from English base

---

## Roadmap

| Phase | Status | Description |
|-------|--------|-------------|
| 1~11 | ✅ | Core platform, JSONB i18n, function registry |
| 12 | ✅ | Message code system (60+ codes, 3 languages) |
| 13 | ✅ | Toast notification system |
| 14 | ✅ | Horizontal layout mode |
| 15 | ✅ | Home dashboard with live data |
| 16 | ✅ | Plugin system for CE/EE separation |
| EE | 🚧 | Scheduler, AI integration, SSO (Enterprise Edition) |

---

## Contributing

We welcome issues, PRs, and feedback. Please see:
- [CONTRIBUTING.md](CONTRIBUTING.md) — how to contribute
- [SECURITY.md](SECURITY.md) — vulnerability reporting
- [CHANGELOG.md](CHANGELOG.md) — version history

For Chinese-language design discussion, see [系統設計/](系統設計/).

---

## License

[MIT](LICENSE) — Copyright (c) 2026 匠耘有限公司 (EaseForge)

Use it freely for any purpose, including commercial products. We'd love to hear how you use it — open an issue or discussion to share!

The Enterprise Edition (extra modules: scheduling, AI, SSO) is distributed under a separate commercial license. See [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Acknowledgements

Built with ❤️ in Taipei, leveraging:
- [FastAPI](https://fastapi.tiangolo.com/) by Sebastián Ramírez
- [SQLAlchemy](https://www.sqlalchemy.org/)
- [React](https://react.dev/)
- [Material-UI](https://mui.com/)
- [i18next](https://www.i18next.com/)
- [PostgreSQL](https://www.postgresql.org/)
- [Redis](https://redis.io/)

Special thanks to the open-source community.
