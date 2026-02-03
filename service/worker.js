global.logger = require('@shipsmart/logger').application('worker');

const workerClient = require('./worker-client');
const { WorkerJobs } = require('@shipsmart/constants');
const CheckCreationConsumer = require('./workers/consumers/check-creation-consumer');
const RateFetchConsumer = require('./workers/consumers/rate-fetch-consumer');
const ApiLogConsumer = require('./workers/consumers/api-log-consumer');
const CarrierApiLogConsumer = require('./workers/consumers/carrier-api-log-consumer');

const SHUTDOWN_TIMEOUT = 30000;
let isShuttingDown = false;

const start = async () => {
  require('events').EventEmitter.defaultMaxListeners = 15;
  const db = require('./models');

  // Initialize scheduled jobs
  const logCleanupJob = require('./jobs/log-cleanup-job');

  const checkConcurrency = 2;
  const rateFetchConcurrency = 5;

  const queue = workerClient.getQueue(WorkerJobs.CHECK_CREATION);
  queue.process(checkConcurrency, async (job) => {
    return await CheckCreationConsumer.perform(job);
  });

  logger.info(`Worker subscribed to ${WorkerJobs.CHECK_CREATION} queue with concurrency ${checkConcurrency}`);

  const rateFetchQueue = workerClient.getQueue(WorkerJobs.RATE_FETCH);
  rateFetchQueue.process(rateFetchConcurrency, async (job) => {
    return await RateFetchConsumer.perform(job);
  });

  logger.info(`Worker subscribed to ${WorkerJobs.RATE_FETCH} queue with concurrency ${rateFetchConcurrency}`);

  // API logging queues (lower priority, lower concurrency)
  const apiLogConcurrency = 3;
  const apiLogQueue = workerClient.getQueue(WorkerJobs.API_LOG);
  apiLogQueue.process(apiLogConcurrency, async (job) => {
    return await ApiLogConsumer.perform(job);
  });

  logger.info(`Worker subscribed to ${WorkerJobs.API_LOG} queue with concurrency ${apiLogConcurrency}`);

  const carrierApiLogConcurrency = 3;
  const carrierApiLogQueue = workerClient.getQueue(WorkerJobs.CARRIER_API_LOG);
  carrierApiLogQueue.process(carrierApiLogConcurrency, async (job) => {
    return await CarrierApiLogConsumer.perform(job);
  });

  logger.info(`Worker subscribed to ${WorkerJobs.CARRIER_API_LOG} queue with concurrency ${carrierApiLogConcurrency}`);

  const gracefulShutdown = async (signal) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info(`${signal} received, starting graceful shutdown...`);

    const forceExitTimeout = setTimeout(() => {
      logger.error('Graceful shutdown timeout, forcing exit');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT);

    try {
      // Step 1: Stop scheduled cron jobs first
      logger.info('Stopping scheduled jobs...');
      logCleanupJob.stop();

      const queues = [
        workerClient.getQueue(WorkerJobs.CHECK_CREATION),
        workerClient.getQueue(WorkerJobs.RATE_FETCH),
        workerClient.getQueue(WorkerJobs.API_LOG),
        workerClient.getQueue(WorkerJobs.CARRIER_API_LOG)
      ];

      // Step 2: Pause queues to stop accepting new jobs
      logger.info('Pausing all queues...');
      await Promise.all(queues.map(q => q.pause(true, true)));

      // Step 3: Wait for active jobs to complete
      logger.info('Waiting for active jobs...');
      await Promise.all(queues.map(async (queue) => {
        let activeJobs = await queue.getActiveCount();
        const waitStart = Date.now();

        while (activeJobs > 0 && Date.now() - waitStart < SHUTDOWN_TIMEOUT - 5000) {
          logger.info(`${activeJobs} active jobs in ${queue.name}...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          activeJobs = await queue.getActiveCount();
        }
      }));

      // Step 4: Close Bull queues and Redis connections
      await workerClient.close();

      // Step 5: Close database connections
      logger.info('Closing database connections...');
      await db.sequelize.close();
      logger.info('Database connections closed');

      clearTimeout(forceExitTimeout);
      logger.info('Worker shut down gracefully');

      // Wait for Winston to flush logs, then ensure clean terminal exit
      await new Promise(resolve => setImmediate(resolve));
      await new Promise(resolve => setTimeout(resolve, 150));

      // Write final newline to ensure clean shell prompt
      process.stdout.write('\n');

      //Allow final write to complete
      await new Promise(resolve => setImmediate(resolve));
      process.exit(0);
    } catch (err) {
      logger.error(`Shutdown error: ${err.message}`);
      clearTimeout(forceExitTimeout);

      // Wait for Winston to flush logs before exit
      await new Promise(resolve => setTimeout(resolve, 200));
      process.exit(1);
    }
  };

  process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.once('SIGINT', () => gracefulShutdown('SIGINT'));
};

start().catch(async (error) => {
  logger.error(`Worker failed to start: ${error.message}`, { stack: error.stack });

  // Wait for Winston to flush logs before exit
  await new Promise(resolve => setTimeout(resolve, 200));
  process.exit(1);
});
