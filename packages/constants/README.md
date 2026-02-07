# @shipsmart/constants

Shared constants for ShipSmart services.

## Usage

```javascript
const { HTTP_STATUS, WORKER_JOBS, QUEUE_NAMES } = require('@shipsmart/constants');

// HTTP status codes
res.status(HTTP_STATUS.OK).json(data);
res.status(HTTP_STATUS.NOT_FOUND).json(error);

// Worker job types
producer.createJob(WORKER_JOBS.RATE_FETCH, data);

// Queue names
const queue = new Queue(QUEUE_NAMES.RATE_FETCH);
```

## Exports

- `HTTP_STATUS` - HTTP status code constants (OK: 200, CREATED: 201, BAD_REQUEST: 400, etc.)
- `WORKER_JOBS` - Background job type constants
- `QUEUE_NAMES` - Bull queue name constants
