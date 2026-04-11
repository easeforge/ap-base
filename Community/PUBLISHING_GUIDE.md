# Base AP Community Edition — Publishing Guide

## 發布到 Public Repository 的步驟

### 1. 準備公開版本

從 ap.base 建立乾淨的公開版：

```bash
# 方法 A: 建立新的 public repo，只推送需要的檔案
cd /path/to/workspace
mkdir base-ap-community
cd base-ap-community
git init

# 從 ap.base 複製需要的檔案
cp -r /path/to/ap.base/Develop ./
cp /path/to/ap.base/README.md ./
cp /path/to/ap.base/LICENSE ./
cp /path/to/ap.base/.gitignore ./
cp /path/to/ap.base/Community/CHANGELOG.md ./
cp /path/to/ap.base/Community/CONTRIBUTING.md ./

# 不要複製的檔案：
# - CLAUDE.md（內部開發指引）
# - 開發紀錄/（內部開發過程）
# - .claude/（Claude Code 設定）
# - Community/（發布指南本身）
# - Develop/backend/.env（敏感設定）
```

### 2. 排除敏感檔案清單

以下檔案/目錄**不應**出現在公開版本中：

| 排除項目 | 原因 |
|---------|------|
| `CLAUDE.md` | 含內部開發指引和架構細節 |
| `開發紀錄/` | 內部開發歷程 |
| `.claude/` | Claude Code 工具設定 |
| `Community/` | 發布指南（不需對外） |
| `Develop/backend/.env` | 含實際連線密碼 |
| `Develop/backend/venv/` | Python 虛擬環境 |
| `Develop/frontend/node_modules/` | npm 套件 |
| `Develop/frontend/build/` | 編譯產出 |

### 3. GitHub 發布

```bash
# 設定遠端
git remote add origin https://github.com/your-org/base-ap.git

# 初始提交
git add -A
git commit -m "feat: Base AP v1.0.0 - Backend Administration Platform"

# 推送
git push -u origin main

# 建立 Release tag
git tag -a v1.0.0 -m "Base AP v1.0.0 - Python Edition"
git push origin v1.0.0
```

### 4. Gitea 發布

```bash
# 設定遠端
git remote add gitea https://your-gitea-server/your-org/base-ap.git

# 推送
git push -u gitea main
git push gitea v1.0.0
```

### 5. 雙平台策略

| 平台 | 用途 | Repo 類型 |
|------|------|----------|
| Gitea (自架) | 內部開發主線，含敏感設定 | Private |
| GitHub | Community 版發布 | Public |

同步方式：
- 開發在 Gitea 進行
- 發布時從 Gitea 推送到 GitHub（排除敏感檔案）
- 可使用 CI/CD 自動化同步

### 6. GitHub Repository 設定建議

- **Description**: Backend Administration Platform — Authentication, RBAC, Multi-tenancy, i18n (JSONB), System Codes, Notifications, Activity Logs
- **Topics**: `fastapi`, `react`, `typescript`, `admin-panel`, `rbac`, `i18n`, `multi-tenant`, `postgresql`
- **License**: MIT
- **Enable**: Issues, Discussions
- **Disable**: Wiki (用 README 即可)
