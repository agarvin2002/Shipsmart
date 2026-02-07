# @shipsmart/http

HTTP utilities for ShipSmart services including response formatting.

## Usage

```javascript
const { ResponseFormatter } = require('@shipsmart/http');

// Success responses
res.json(ResponseFormatter.formatSuccess(data, requestId));

// Error responses
res.status(400).json(
  ResponseFormatter.formatError('Invalid input', requestId, 400)
);

// Validation errors (Joi)
res.status(400).json(
  ResponseFormatter.formatValidationError(joiError, requestId)
);
```

## Response Format

### Success
```json
{
  "success": true,
  "request_id": "req_abc123",
  "data": { ... }
}
```

### Error
```json
{
  "success": false,
  "request_id": "req_abc123",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [...]
  }
}
```

## Methods

- `formatSuccess(data, requestId)` - Format successful response
- `formatError(message, requestId, statusCode)` - Format error response
- `formatValidationError(error, requestId)` - Format Joi validation errors
