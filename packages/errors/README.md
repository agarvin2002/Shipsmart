# @shipsmart/errors

Custom error classes for ShipSmart services with HTTP status code integration.

## Usage

```javascript
const {
  ApplicationError,
  ValidationError,
  AuthenticationError,
  NotFoundError
} = require('@shipsmart/errors');

// Validation errors (400)
throw new ValidationError('Invalid email format');

// Authentication errors (401)
throw new AuthenticationError('Invalid credentials');

// Not found errors (404)
throw new NotFoundError('User not found');

// Custom application errors
throw new ApplicationError('Custom error', 500, { details: 'info' });
```

## Error Classes

| Class | Status Code | Use Case |
|-------|-------------|----------|
| `ApplicationError` | Configurable | Base error class |
| `ValidationError` | 400 | Input validation failures |
| `AuthenticationError` | 401 | Authentication failures |
| `NotFoundError` | 404 | Resource not found |
| `RedisError` | 500 | Redis operation failures |
| `S3Error` | 500 | S3 operation failures |

All errors include:
- `message` - Error message
- `statusCode` - HTTP status code
- `data` - Additional error context (optional)
