global.logger = require('@shipsmart/logger').application('worker');

const workerClient = require('./worker-client');
const { WorkerJobs } = require('@shipsmart/constants');
const CheckCreationConsumer = require('./workers/consumers/check-creation-consumer');

const start = async () => {
  require('events').EventEmitter.defaultMaxListeners = 15;
  require('./models');

  const queue = workerClient.getQueue(WorkerJobs.CHECK_CREATION);
  queue.process(1, async (job) => {
    return await CheckCreationConsumer.perform(job);
  });

  logger.info(`Worker subscribed to ${WorkerJobs.CHECK_CREATION} queue`);

  process.once('SIGTERM', async () => {
    try {
      await workerClient.close();
      logger.info('Worker closed gracefully');
    } catch (err) {
      logger.error(`Worker shutdown error: ${err.message}`);
    }
    process.exit(0);
  });

  process.once('SIGINT', async () => {
    try {
      await workerClient.close();
      logger.info('Worker closed gracefully');
    } catch (err) {
      logger.error(`Worker shutdown error: ${err.message}`);
    }
    process.exit(0);
  });
};

start().catch((error) => {
  logger.error(`Worker failed to start: ${error.message}`, { stack: error.stack });
  process.exit(1);
});
