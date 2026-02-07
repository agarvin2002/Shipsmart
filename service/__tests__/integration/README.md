# Integration Tests

Integration tests verify that multiple components work together correctly, including interactions with external dependencies like databases and Redis.

## What to Test Here

- **API Endpoint Integration**: Full request/response cycles through controllers, services, repositories
- **Database Interactions**: Testing actual database queries and transactions
- **Redis Caching**: Verifying cache behavior with real Redis instance
- **Multi-Layer Integration**: Testing the full 5-layer architecture flow

## Test Structure

```javascript
describe('Rate API Integration', () => {
  beforeAll(async () => {
    // Setup test database, Redis connection
  });

  afterAll(async () => {
    // Cleanup database, close connections
  });

  it('should fetch rates from multiple carriers end-to-end', async () => {
    // Test full flow: route → controller → service → repository → database
  });
});
```

## Running Integration Tests

```bash
yarn test:integration
```

## Best Practices

- Use test database (not production!)
- Clean up test data after each test
- Mock external carrier APIs (unless testing carrier integration specifically)
- Test error scenarios (database failures, timeouts)
- Verify data persists correctly across layers

## See Also

- `/unit/` - For isolated unit tests
- `/e2e/` - For full application end-to-end tests
- `/fixtures/` - For test data
