# Security Policy

## Supported Versions

Base AP is currently in **early public release** (Phase 1). Until 1.0, only the latest commit on `main` receives security patches.

| Version | Supported |
|---------|-----------|
| `main` (rolling) | ✅ |
| Pre-1.0 tags | ❌ |

After 1.0, we will publish a formal support matrix.

---

## Reporting a Vulnerability

**Please do NOT open a public GitHub issue for security vulnerabilities.**

Instead, report privately:

📧 **Email**: `porsche.chen@gmail.com`
🔐 **Subject prefix**: `[SECURITY] Base AP — <short description>`

Please include:

1. **Description** — what's the vulnerability?
2. **Impact** — what can an attacker do?
3. **Reproduction** — minimal steps / proof-of-concept
4. **Affected version / commit hash**
5. **Your contact** (optional, for follow-up)
6. **Disclosure timeline preference** (we recommend 90 days)

### What to Expect

| Stage | Timeline |
|-------|----------|
| Acknowledgment | within **3 business days** |
| Initial assessment | within **7 business days** |
| Fix development | depends on severity (critical: ASAP; high: <2 weeks; medium: <1 month) |
| Public disclosure | coordinated with reporter, typically after fix is released |

We follow **coordinated disclosure** — please give us a reasonable window before going public.

---

## Scope

In scope:

- ✅ Code in this repository (`easeforge/ap-base`)
- ✅ Documented configuration / deployment patterns
- ✅ Authentication, authorization, session management, input validation
- ✅ SQL injection, XSS, CSRF, SSRF, RCE, path traversal
- ✅ Cryptographic issues (token generation, password hashing)

Out of scope:

- ❌ Issues in third-party dependencies (please report to the upstream project; we'll bump versions when available)
- ❌ Issues only reproducible with debug mode enabled (`DEBUG=True`) — debug mode is for development, never production
- ❌ Issues requiring physical access to the server
- ❌ Social engineering, phishing
- ❌ Denial of service via volumetric attacks (out of scope for application-layer security)

---

## Security Hardening Recommendations

If you deploy Base AP in production:

1. **Always set strong values** for `SECRET_KEY` in `.env` (32+ random bytes, never the default)
2. **Disable** `DEBUG` mode in production
3. **Use HTTPS** in front of the backend (reverse proxy: nginx / Caddy / Traefik)
4. **Rotate** JWT secrets and database credentials periodically
5. **Restrict** PostgreSQL and Redis to private networks (don't expose 5432 / 6379 publicly)
6. **Update** dependencies regularly (`pip install -U`, `npm audit fix`)
7. **Enable** CAPTCHA in production (it's on by default; don't disable)
8. **Review** the user activity logs (`user_logs` table) periodically for suspicious actions

---

## Hall of Fame

Security researchers who responsibly disclose vulnerabilities will be credited here (with permission).

*Currently empty — be the first!* 🛡️

---

## Questions

For non-security questions, see [CONTRIBUTING.md](CONTRIBUTING.md) or open a [Discussion](https://github.com/easeforge/ap-base/discussions).
