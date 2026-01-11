# Security Policy

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to: @ducngg411

You should receive a response within 48 hours.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Security Best Practices

When deploying this application:

1. **Never commit** `.env` file to Git
2. **Use strong passwords** for database
3. **Enable HTTPS** in production
4. **Validate webhook signatures** (implement based on SePay docs)
5. **Keep dependencies updated**: `npm audit`
6. **Use environment variables** for all secrets
7. **Enable firewall** on VPS deployments
8. **Regular backups** of database
9. **Monitor logs** for suspicious activity
10. **Rate limiting** for production deployments

## Known Security Considerations

### TODO Items

- [ ] Implement SePay webhook signature validation
- [ ] Add rate limiting middleware
- [ ] Implement IP whitelisting for webhooks
- [ ] Add admin 2FA for critical actions
- [ ] Encrypt sensitive data in database

### Current Security Measures

- ✅ Input validation (email, quantity)
- ✅ SQL injection prevention (Prisma ORM)
- ✅ Environment variable validation
- ✅ Error handling (no sensitive data in errors)
- ✅ HTTPS enforcement (deployment guides)
- ✅ Idempotent webhook handling

## Dependencies

We regularly update dependencies to patch security vulnerabilities.

Run `npm audit` to check for known vulnerabilities:

```bash
npm audit
npm audit fix  # Auto-fix if available
```

## Database Security

- Use strong passwords
- Never expose database port to public
- Use SSL/TLS for database connections in production
- Regular backups
- Principle of least privilege for database users

## Secrets Management

**Never hardcode:**
- API keys
- Bot tokens
- Database passwords
- Webhook secrets

**Use:**
- Environment variables
- Secret management services (AWS Secrets Manager, etc.)

## Contact

For security concerns: @ducngg411
