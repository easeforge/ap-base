# Contributing to Base AP

Thank you for your interest in contributing to Base AP!

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/base-ap.git`
3. Create a branch: `git checkout -b feature/my-feature`
4. Follow the [Quick Start](../README.md#quick-start) guide to set up your development environment

## Development Guidelines

### Code Style
- **Backend (Python)**: Follow PEP 8, use type hints
- **Frontend (TypeScript)**: Follow existing code patterns, use functional components with hooks
- **Naming**: English for code, JSONB for user-facing names

### Multi-language Support
- All user-facing names must use JSONB multi-language fields
- Use `getI18nValue()` for reading JSONB fields in frontend
- Add translation keys to all locale files (zh-TW, en, zh-CN minimum)
- Run "Sync Translation Keys" after adding new keys

### Commit Messages
Follow conventional commits:
```
feat: add new feature
fix: fix a bug
refactor: code refactoring
docs: documentation changes
chore: maintenance tasks
```

### Pull Request Process
1. Ensure TypeScript compiles without errors: `npx tsc --noEmit`
2. Ensure production build succeeds: `npx react-scripts build`
3. Test all affected pages manually
4. Update documentation if needed
5. Submit PR with clear description

## Reporting Issues

Please use GitHub Issues with:
- Clear title describing the problem
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Browser/OS version

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
