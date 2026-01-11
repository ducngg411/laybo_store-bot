# Contributing to LayBo Store Bot

Thank you for your interest in contributing! 🎉

## Development Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/laybo-store-bot.git`
3. Install dependencies: `npm install`
4. Setup `.env` file (see `.env.example`)
5. Run migrations: `npm run db:migrate`
6. Seed database: `npm run db:seed`
7. Start development: `npm run dev`

## Code Style

- We use **ESLint** and **Prettier**
- Run `npm run lint` before committing
- Run `npm run format` to auto-format code
- Follow existing code patterns

## Commit Messages

Use conventional commits:

```
feat: add new payment provider
fix: resolve order expiry bug
docs: update README
refactor: improve order service
test: add webhook tests
```

## Pull Request Process

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Run linter: `npm run lint`
4. Test locally: `npm run dev`
5. Commit with descriptive message
6. Push to your fork
7. Create Pull Request to `main` branch

## Testing

Before submitting PR:

- [ ] Test bot commands manually
- [ ] Test webhook with `node test-webhook.js`
- [ ] Check database migrations work
- [ ] Verify no TypeScript errors: `npm run build`
- [ ] Run linter: `npm run lint`

## Adding New Features

### New Product Type

1. Update Prisma schema if needed
2. Create handler in `src/bot/handlers/`
3. Add constants in `src/shared/constants.ts`
4. Update seed script
5. Document in README

### New Service Integration

1. Create service in `src/services/`
2. Add config to `src/shared/config.ts`
3. Update `.env.example`
4. Add API docs in `API.md`

## Code Review Checklist

- [ ] Code follows existing patterns
- [ ] No hardcoded values (use constants/config)
- [ ] Error handling implemented
- [ ] Logging added for important operations
- [ ] TypeScript types are correct
- [ ] Documentation updated

## Questions?

Contact @ducngg411 or open an issue.

## License

By contributing, you agree that your contributions will be licensed under the ISC License.
