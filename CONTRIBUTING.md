# Contributing to Base AP

Thanks for considering a contribution! This project is the Community Edition of an admin platform foundation, and we welcome bug reports, feature requests, documentation improvements, and code contributions.

> **Language**: Issues, PRs, and commit messages may be in **English** or **Traditional Chinese (繁體中文)**.

---

## Quick Links

- 🐛 **Bug?** → [Open an issue](https://github.com/easeforge/ap-base/issues/new?template=bug_report.md)
- 💡 **Feature idea?** → [Open an issue](https://github.com/easeforge/ap-base/issues/new?template=feature_request.md)
- 🔒 **Security issue?** → See [SECURITY.md](SECURITY.md) — **do NOT open a public issue**
- 💬 **Question / discussion?** → [Discussions](https://github.com/easeforge/ap-base/discussions)

---

## Reporting Bugs

Before opening a bug report:

1. **Search** existing [issues](https://github.com/easeforge/ap-base/issues?q=is%3Aissue) — it may already be reported.
2. Include the following:
   - Base AP version / commit hash
   - OS, Python version, Node.js version, PostgreSQL version
   - Minimal steps to reproduce
   - Expected vs. actual behavior
   - Relevant logs or screenshots

The bug report template will guide you.

---

## Suggesting Features

We love feature ideas, but please:

- **Open an issue first** before writing code — we may have plans, constraints, or alternative directions.
- Explain the **use case** (what problem does this solve?), not just the implementation.
- Consider whether it fits the **CE scope**:
  - ✅ CE: foundational admin functionality (auth, RBAC, i18n, logging, layouts)
  - ❌ Likely EE: AI integration, schedulers, SSO, advanced analytics, audit reporting

If a feature is EE-only, we'll mark it as such and may close the issue or move it to internal planning.

---

## Pull Requests

### Before You Start

1. **Open an issue** to discuss non-trivial changes (anything bigger than a typo / docstring fix).
2. Fork the repo and create a branch from `main`:
   ```bash
   git checkout -b fix/your-bug-description
   git checkout -b feat/your-feature-name
   ```

### Branch Naming

| Prefix | Use For |
|--------|---------|
| `fix/` | Bug fixes |
| `feat/` | New features |
| `refactor/` | Refactoring without behavior change |
| `docs/` | Documentation only |
| `chore/` | Build, deps, tooling |

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/) loosely:

```
<type>(<scope>): <short summary>

[optional body explaining the why]
```

Examples:
- `fix(backend): 修正 bcrypt 雜湊長度導致登入失敗`
- `feat(ui): 新增使用者頁面排序功能`
- `docs: clarify Quick Start prerequisites`

### Code Style

**Backend (Python)**:
- Format: PEP 8, 4-space indent
- Type hints encouraged
- No new `print()` — use `logger`
- Don't hardcode user-facing strings — use the **message code system** (see CLAUDE.md → 系統訊息分類設計.md)

**Frontend (TypeScript / React)**:
- Format: 2-space indent
- Functional components + hooks
- No `alert()` — use `useMessage()` hook (Toast notifications)
- i18n: don't hardcode display text — use `t()` from react-i18next

### Tests

- Backend: add tests under `Develop/backend/tests/` if your change touches business logic
- Frontend: manually verify the affected pages run

### Submitting

1. Push your branch
2. Open a PR against `main`
3. Fill in the PR description (what / why / how tested)
4. Link related issue: `Closes #123`
5. Be patient — maintainers review when time allows

---

## Development Setup

See the [Quick Start](README.md#quick-start-5-minutes) section in README.

For deeper architectural context: [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Code of Conduct

Be respectful. Disagree with ideas, not people. We'll add a formal Code of Conduct if the community grows.

---

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).

If you've added significant features, you'll be credited in CHANGELOG.md.

---

## Questions?

Drop them in [Discussions](https://github.com/easeforge/ap-base/discussions) or reach out via the contact email in [SECURITY.md](SECURITY.md).
