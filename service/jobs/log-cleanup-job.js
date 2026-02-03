/* global logger */

const cron = require('node-cron');
const LogCleanupService = require('../services/log-cleanup-service');
const config = require('@shipsmart/env');

/**
 * Log Cleanup Job
 *
 * Scheduled job that runs daily to clean up old API and carrier logs.
 * Default schedule: Every day at 3:00 AM
 * Default retention: 90 days (configurable via environment)
 */

// Get retention days from config or default to 90
const retentionDays = config.get('logs:retention_days') || 90;

// Schedule: Run every day at 3:00 AM
// Cron format: second minute hour day month weekday
// '0 3 * * *' = At 03:00:00 every day
const schedule = '0 3 * * *';

logger.info('[LogCleanupJob] Initializing log cleanup job', {
  schedule,
  retentionDays,
  description: 'Runs daily at 3:00 AM'
});

// Schedule the cleanup job
const cleanupTask = cron.schedule(schedule, async () => {
  logger.info('[LogCleanupJob] Starting scheduled cleanup');

  try {
    // Get stats before cleanup (optional, for monitoring)
    const statsBefore = await LogCleanupService.getCleanupStats();
    logger.info('[LogCleanupJob] Logs before cleanup', statsBefore);

    // Perform cleanup
    const result = await LogCleanupService.cleanupOldLogs(retentionDays);

    logger.info('[LogCleanupJob] Scheduled cleanup completed successfully', {
      apiLogsDeleted: result.apiLogsDeleted,
      carrierLogsDeleted: result.carrierLogsDeleted,
      totalDeleted: result.totalDeleted,
      durationMs: result.durationMs,
      retentionDays
    });

  } catch (error) {
    logger.error('[LogCleanupJob] Scheduled cleanup failed', {
      error: error.message,
      stack: error.stack,
      retentionDays
    });
  }
}, {
  scheduled: true,
  timezone: 'America/New_York' // Adjust timezone as needed
});

logger.info('[LogCleanupJob] Log cleanup job scheduled successfully');

// Export task for graceful shutdown
module.exports = {
  cleanupTask,
  stop: () => {
    if (cleanupTask) {
      cleanupTask.stop();
      logger.info('[LogCleanupJob] Cron task stopped');
    }
  }
};
