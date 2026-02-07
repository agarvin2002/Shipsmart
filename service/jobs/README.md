# Scheduled Jobs (Cron Tasks)

This directory contains **cron-based scheduled tasks** that run on a time schedule.

## Distinction from Workers

- **`/jobs/`** - Time-based cron tasks (e.g., daily cleanup at 3 AM)
- **`/workers/`** - Queue-based async jobs (Bull queues for background processing)

## Current Jobs

### log-cleanup-job.js
- **Purpose**: Cleans up old API and carrier logs from database
- **Schedule**: Daily at 3:00 AM (America/New_York timezone)
- **Retention**: 90 days (configurable via `logs:retention_days` config)
- **Service**: Calls `LogCleanupService` for business logic
- **Usage**: Auto-loaded by `worker.js` on startup

## Adding New Scheduled Jobs

1. Create a new file: `[job-name]-job.js`
2. Use `node-cron` for scheduling
3. Call appropriate service for business logic (keep jobs thin)
4. Export task with `stop()` method for graceful shutdown
5. Import and initialize in `worker.js`

## Example Pattern

```javascript
const cron = require('node-cron');
const SomeService = require('../services/some-service');

const task = cron.schedule('0 2 * * *', async () => {
  logger.info('[JobName] Starting scheduled task');
  await SomeService.doWork();
});

module.exports = {
  task,
  stop: () => task.stop()
};
```

## See Also

- `/workers/` - For async queue-based background jobs
- `/services/` - For business logic (called by jobs)
