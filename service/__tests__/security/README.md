# Security Tests

Security tests verify that the application is protected against common vulnerabilities and follows security best practices.

## What to Test Here

- **Authentication Bypass**: Attempts to access protected endpoints without valid tokens
- **Authorization**: Verify users can't access other users' data (multi-tenancy)
- **SQL Injection**: Test for SQL injection vulnerabilities
- **XSS Protection**: Verify input sanitization
- **CSRF Protection**: Verify CSRF token validation
- **Rate Limiting**: Verify rate limiters work correctly
- **Password Security**: Test password hashing, complexity requirements
- **Sensitive Data Exposure**: Verify no secrets in responses/logs
- **Encryption**: Verify carrier credentials are encrypted at rest

## Test Structure

```javascript
describe('Security: Authentication', () => {
  it('should reject requests without auth token', async () => {
    const response = await request(app)
      .get('/api/users/me')
      .expect(401);
  });

  it('should reject requests with invalid token', async () => {
    const response = await request(app)
      .get('/api/users/me')
      .set('Authorization', 'Bearer invalid_token')
      .expect(401);
  });

  it('should reject requests with expired token', async () => {
    const expiredToken = generateExpiredToken();
    const response = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401);
  });
});

describe('Security: Multi-Tenancy', () => {
  it('should prevent user from accessing another user\'s data', async () => {
    // User A tries to access User B's address
    const response = await request(app)
      .get(`/api/addresses/${userBAddressId}`)
      .set('Authorization', `Bearer ${userAToken}`)
      .expect(404); // Should not expose existence
  });
});
```

## Running Security Tests

```bash
yarn test:security
```

## Security Test Checklist

- [ ] Authentication bypass attempts
- [ ] Authorization boundary tests (cross-user access)
- [ ] SQL injection in all input fields
- [ ] XSS in text inputs
- [ ] Rate limiting on sensitive endpoints (login, register)
- [ ] Password requirements enforced
- [ ] Sensitive data not in error messages
- [ ] Encrypted data not returned decrypted
- [ ] Session management (logout, token expiry)
- [ ] File upload restrictions (if applicable)

## Important Security Standards

Reference `.claude/CLAUDE.md` section "Critical Security Issues to Avoid":
- Never log passwords, tokens, or API keys
- Always filter sensitive fields before logging
- Encrypt carrier credentials at rest
- Multi-tenancy: Always filter by user_id
- Use parameterized queries (Sequelize ORM)

## See Also

- `.claude/CLAUDE.md` - Security standards section
- `/integration/` - For integration tests
- `/unit/` - For unit tests
