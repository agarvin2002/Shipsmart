const config = require('@shipsmart/env');
const Bull = require('bull');

class WorkerClient {
  constructor() {
    this.bullConfig = config.get('bull');
    this.queues = {};
  }

  initialize() {
    const redisConf = this.bullConfig.default_redis;
    this.redisConfig = {
      redis: {
        port: redisConf.port,
        host: redisConf.host,
        password: redisConf.password || undefined,
        ...(redisConf.tls) ? { tls: {} } : {},
      },
    };
    return this;
  }

  getQueue(queueName) {
    if (!this.queues[queueName]) {
      this.queues[queueName] = new Bull(queueName, this.redisConfig);
      this.setupQueueEvents(this.queues[queueName], queueName);
    }
    return this.queues[queueName];
  }

  setupQueueEvents(queue, queueName) {
    /* global logger */

    queue.on('error', (error) => {
      logger.error(`[Bull: ${queueName}] Error: ${error.message}`);
    });

    queue.on('active', (job) => {
      const requestId = job.data.requestId || 'unknown';
      logger.info(`[${requestId}] [Bull: ${queueName}] [Job:${job.name}:${job.id}] is active. Started at ${new Date().toISOString()}`);
    });

    queue.on('stalled', (job) => {
      const requestId = job.data.requestId || 'unknown';
      logger.warn(`[${requestId}] [Bull: ${queueName}] [Job:${job.name}:${job.id}] is stalled.`);
    });

    queue.on('failed', (job, err) => {
      const requestId = job.data.requestId || 'unknown';
      logger.error(`[${requestId}] [Bull: ${queueName}] [Job:${job.name}:${job.id}] failed with error: ${err.message}`, { stack: err.stack });
    });

    queue.on('completed', (job) => {
      const requestId = job.data.requestId || 'unknown';
      logger.info(`[${requestId}] [Bull: ${queueName}] [Job:${job.name}:${job.id}] completed successfully at ${new Date().toISOString()}`);
    });

    queue.on('progress', (job, progress) => {
      const requestId = job.data.requestId || 'unknown';
      logger.info(`[${requestId}] [Bull: ${queueName}] [Job:${job.name}:${job.id}] progress: ${progress}%`);
    });

    queue.on('paused', () => {
      logger.info(`[Bull: ${queueName}] Queue has been paused.`);
    });

    queue.on('resumed', () => {
      logger.info(`[Bull: ${queueName}] Queue has been resumed.`);
    });

    queue.on('cleaned', (jobs, type) => {
      logger.info(`[Bull: ${queueName}] Cleaned ${jobs.length} ${type} jobs.`);
    });

    queue.on('drained', () => {
      logger.info(`[Bull: ${queueName}] Queue has been drained.`);
    });

    queue.on('removed', (job) => {
      const requestId = job.data.requestId || 'unknown';
      logger.info(`[${requestId}] [Bull: ${queueName}] [Job:${job.name}:${job.id}] has been removed.`);
    });

    queue.on('waiting', async (jobId) => {
      try {
        const job = await queue.getJob(jobId);
        const requestId = job && job.data && job.data.requestId ? job.data.requestId : 'unknown';
        logger.info(`[${requestId}] [Bull: ${queueName}] [Job:${jobId}] is waiting.`);
      } catch (error) {
        logger.info(`[Bull: ${queueName}] [Job:${jobId}] is waiting.`);
      }
    });
  }

  async close() {
    const closePromises = Object.values(this.queues).map(queue => queue.close());
    await Promise.all(closePromises);
    logger.info('All Bull queues closed.');
  }
}

const workerClient = new WorkerClient().initialize();

module.exports = workerClient;
