const workerClient = require('../../worker-client');
const { WorkerJobs } = require('@shipsmart/constants');

class RateFetchProducer {
  constructor(queue, jobOpt) {
    this.queue = queue;
    this.jobOpt = jobOpt;
  }

  async publishMessage(data) {
    const job = await this.queue.add(data, this.jobOpt);
    return job;
  }

  static getProducer() {
    const queue = workerClient.getQueue(WorkerJobs.RATE_FETCH);
    const jobOpt = {
      attempts: 2,
      priority: 3,
      backoff: {
        type: 'exponential',
        delay: 2000  // 2s first retry, 4s second retry
      },
      removeOnComplete: 300, // Keep completed jobs for 5 minutes (300 seconds)
      removeOnFail: 1000,    // Keep last 1000 failed jobs (prevents unbounded growth)
      timeout: 60000,        // 60 seconds (increased for international shipments)
    };
    return new RateFetchProducer(queue, jobOpt);
  }
}

module.exports = RateFetchProducer;
