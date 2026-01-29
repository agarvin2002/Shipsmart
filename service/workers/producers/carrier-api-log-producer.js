const workerClient = require('../../worker-client');
const { WorkerJobs } = require('@shipsmart/constants');

/**
 * CarrierApiLogProducer
 *
 * Queues carrier API request/response logs for async database storage.
 * Lower priority than critical jobs (rate fetch, etc.)
 */
class CarrierApiLogProducer {
  constructor(queue, jobOpt) {
    this.queue = queue;
    this.jobOpt = jobOpt;
  }

  async publishMessage(logData) {
    const job = await this.queue.add(logData, this.jobOpt);
    return job;
  }

  static getProducer() {
    const queue = workerClient.getQueue(WorkerJobs.CARRIER_API_LOG);
    const jobOpt = {
      attempts: 2,
      priority: 5, // Lower priority than critical jobs
      backoff: {
        type: 'exponential',
        delay: 2000  // 2s first retry, 4s second retry
      },
      removeOnComplete: 100, // Keep last 100 completed jobs
      removeOnFail: 1000,    // Keep last 1000 failed jobs (for debugging)
      timeout: 30000,        // 30 seconds (database writes should be fast)
    };
    return new CarrierApiLogProducer(queue, jobOpt);
  }
}

module.exports = CarrierApiLogProducer;
