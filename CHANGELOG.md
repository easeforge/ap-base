# Changelog

All notable changes to Base AP (Community Edition) are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Public release on GitHub under MIT license
- `CONTRIBUTING.md`, `SECURITY.md`, `CHANGELOG.md`, GitHub issue templates
- Backend / frontend Dockerfiles
- `.gitignore` rules excluding internal deployment files

### Changed
- Brand finalized as **EaseForge (匠耘有限公司)** — replaces internal codenames in `LICENSE`, footer copyright, English translation
- README rewritten as public-facing English-first document with badges, Quick Start, architecture overview, roadmap

### Security
- Pre-publication scrub of hardcoded credentials, internal hostnames, and NAS IPs
- Environment-variable parameterization of `deploy_to_nas.py`
- `.dockerignore` updated to exclude `license.key`, `*.pem`

---

## Pre-public Development (Phases 1–16)

The following phases shipped before public release. Detailed development logs live in [`開發紀錄/`](開發紀錄/).

### Phase 16 — i18n Cleanup
- Removed 34 unused i18n keys (102 entries across 3 languages)
- Static translations now hold only labels and form text; runtime messages all flow through the system message code system

### Phase 15 — Home Dashboard
- `GET /api/system/stats` returning user / org / login / notification counts plus 10 most recent activities
- Routes consolidated: `DashboardPage` removed, `HomePage` at `/home` is the single entry

### Phase 14 — Horizontal Layout
- `sys_profiles.layout_mode` column (`vertical` / `horizontal`)
- Vertical: existing left sidebar
- Horizontal: top nav bar with hover dropdown menus (nested supported)
- Switchable from `SysProfilePage`; takes effect after reload

### Phase 13 — Toast Notifications
- `MessageContext` + `useMessage()` hook
- Methods: `showSuccess` / `showError` / `showWarning` / `showInfo` / `showApiError`
- `showApiError(err)` parses backend `detail` (string code or `{code, params}` object)
- Replaced all 94 `alert()` calls across pages

### Phase 12 — System Message Code System
- 69 message codes (21 SYS + 48 ERR) stored in `system_codes` table
- 9-digit code format: `{SYS|ERR|DAT}{2-digit category}{4-digit serial}`
- Production codes (categories 01–49) and dev codes (51–99) with environment-aware switching
- Backend helper: `app.core.message_codes.raise_msg(status, code, **params)` with `{name}` / `{entity}` / `{id}` placeholder substitution
- Public endpoint `GET /api/system/message-codes?lang=zh-TW`
- All hardcoded Chinese error strings cleared from routes (86 occurrences across 13 files)

### Phase 11 — `init_db.sql` Rebuild
- Version 2.0.0, 11 tables (including `sys_languages`)
- All JSONB fields seeded with zh-TW / en bilingual values
- Hidden personal functions added (`my_profile`, `change_password`, `logout`)
- Language seed records and `sys_languages` initial data

### Phase 10 — Language Settings UI
- `SysProfilePage` adds a language section (checkbox-driven activation)
- `sys_title` / `sys_copyright` render multilingual input fields based on enabled languages

### Phase 9 — Frontend Dynamic Language Loading
- `i18n.ts` switched to `i18next-http-backend` loading translations from API at runtime
- Static files retained as fallback
- `SystemContext` exposes `availableLanguages` / `defaultLanguage`
- `LanguageSwitcher` reads from `GET /api/system/languages` (1 lang hidden, 2 as buttons, 3+ as dropdown)

### Phase 8 — Frontend JSONB i18n Reading
- `I18nField` type + `getI18nValue()` helper (`src/utils/i18nHelper.ts`)
- 30+ files across `types/`, `services/`, `components/`, `hooks/`, `contexts/`, `pages/` rewritten
- All `cname` / `ename` dual-column reads replaced with single JSONB column
- Form inputs converted to per-language fields

### Phases 1–7 — Foundation
- Extracted base platform from internal P-PA6.4 codebase
- Database JSONB multilingual schema (5 tables: `system_codes`, `system_functions`, `sys_profiles`, `user_roles`, `system_notifications`)
- Backend models / schemas / routes / services rewritten for JSONB
- Language management backend (`sys_languages` table, CRUD API, language file sync, gap-filling)
- ISO 3166-1 country codes (249 countries) + Taiwan administrative regions (390 records)
- Plugin system (`load_ee_if_present`, `register_router`, `register_startup`, `register_shutdown`, `register_menu`)
- Ed25519 license key system (`app.core.license`) for unlocking Enterprise features

---

## Versioning Policy

Until **1.0.0**:
- `main` is the only supported branch
- Breaking changes may land between commits
- API stability is best-effort

After **1.0.0**:
- Semantic versioning enforced
- Breaking changes only in major versions
- Deprecation notices given at least one minor version ahead

---

[Unreleased]: https://github.com/easeforge/ap-base/commits/main
