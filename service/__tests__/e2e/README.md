# End-to-End (E2E) Tests

E2E tests verify complete user workflows and system behavior from a black-box perspective, testing the application as users would interact with it.

## What to Test Here

- **Complete User Journeys**: Registration → Login → Create shipment → Get rates → Logout
- **Authentication Flows**: Full auth lifecycle including token refresh, password reset
- **Multi-Step Workflows**: Complex operations spanning multiple API calls
- **System Integration**: All components working together in production-like environment

## Test Structure

```javascript
describe('User Shipment Flow E2E', () => {
  let authToken;
  let userId;
  let addressId;

  it('should register a new user', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send(testUserData);

    expect(response.status).toBe(201);
    userId = response.body.data.user.id;
  });

  it('should login and receive token', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email, password });

    authToken = response.body.data.access_token;
  });

  it('should create shipping address', async () => {
    // Uses authToken from previous test
  });

  // More steps...
});
```

## Running E2E Tests

```bash
yarn test:e2e
```

## Best Practices

- Test real user workflows, not individual endpoints
- Use test database and external service mocks
- Share state between related tests (auth tokens, IDs)
- Test both happy paths and error scenarios
- Clean up test data after suite completes
- Run against production-like environment

## See Also

- `/integration/` - For component integration tests
- `/unit/` - For isolated unit tests
- `/fixtures/` - For test data
