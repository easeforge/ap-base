# Base AP Community Edition — Release Checklist

## v1.0.0 Release Preparation

### Security Audit (Completed)
- [x] 移除 config.py 硬編碼的資料庫/Redis 密碼
- [x] 移除 CLAUDE.md 中的敏感連線資訊
- [x] DEBUG 預設改為 False
- [x] 清除前端 console.log（20+ 筆）
- [x] .env 排除於 .gitignore
- [x] .env.example 建立

### Files (Completed)
- [x] README.md — 完整功能說明
- [x] LICENSE — MIT License
- [x] .env.example — 環境變數範本
- [x] init_db.sql — 資料庫初始化腳本 v2.0.0

### Before Publishing to Public Repository
- [ ] 確認 .env 不在版控中
- [ ] 確認 開發紀錄/ 目錄是否要排除（含內部開發過程）
- [ ] 確認 CLAUDE.md 是否要排除（含內部開發指引）
- [ ] 確認 .claude/ 目錄排除
- [ ] 建立 CONTRIBUTING.md（貢獻指南）
- [ ] 建立 CHANGELOG.md（版本變更紀錄）
- [ ] 建立 GitHub/Gitea Release tag: v1.0.0
- [ ] 測試全新安裝流程（從 clone 到成功登入）

### Optional Enhancements
- [ ] Docker / docker-compose.yml
- [ ] CI/CD pipeline (GitHub Actions / Gitea Actions)
- [ ] 螢幕截圖加入 README
- [ ] Demo 站台
