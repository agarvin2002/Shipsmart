global.logger = require('@shipsmart/logger').application('worker');

const workerClient = require('./worker-client');
const { WorkerJobs } = require('@shipsmart/constants');
const CheckCreationConsumer = require('./workers/consumers/check-creation-consumer');
const RateFetchConsumer = require('./workers/consumers/rate-fetch-consumer');

const SHUTDOWN_TIMEOUT = 30000;
let isShuttingDown = false;

const start = async () => {
  require('events').EventEmitter.defaultMaxListeners = 15;
  require('./models');

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

  const gracefulShutdown = async (signal) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info(`${signal} received, starting graceful shutdown...`);

    const forceExitTimeout = setTimeout(() => {
      logger.error('Graceful shutdown timeout, forcing exit');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT);

    try {
      const queues = [
        workerClient.getQueue(WorkerJobs.CHECK_CREATION),
        workerClient.getQueue(WorkerJobs.RATE_FETCH)
      ];

      // Pause queues to stop accepting new jobs
      logger.info('Pausing all queues...');
      await Promise.all(queues.map(q => q.pause(true, true)));

      // Wait for active jobs to complete
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

      await workerClient.close();
      clearTimeout(forceExitTimeout);
      logger.info('Worker shut down gracefully');
      process.exit(0);
    } catch (err) {
      logger.error(`Shutdown error: ${err.message}`);
      clearTimeout(forceExitTimeout);
      process.exit(1);
    }
  };

  process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.once('SIGINT', () => gracefulShutdown('SIGINT'));
};

start().catch((error) => {
  logger.error(`Worker failed to start: ${error.message}`, { stack: error.stack });
  process.exit(1);
});
