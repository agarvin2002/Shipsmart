const workerClient = require('../../worker-client');
const { WorkerJobs, CARRIER_DEFAULTS, TIMEOUTS } = require('@shipsmart/constants');

class ExcelRateFetchProducer {
  constructor(queue, jobOpt) {
    this.queue = queue;
    this.jobOpt = jobOpt;
  }

  async publishMessage(data) {
    const job = await this.queue.add(data, this.jobOpt);
    return job;
  }

  static getProducer() {
    const queue = workerClient.getQueue(WorkerJobs.EXCEL_RATE_FETCH);
    const jobOpt = {
      attempts: CARRIER_DEFAULTS.MAX_RETRIES,
      priority: CARRIER_DEFAULTS.PRIORITY,
      backoff: {
        type: 'exponential',
        delay: 2000 // 2s first retry, 4s second retry
      },
      removeOnComplete: 300, // Keep completed jobs for 5 minutes
      removeOnFail: 1000,    // Keep last 1000 failed jobs
      timeout: TIMEOUTS.EXCEL_JOB_DEFAULT, // 10 minutes (60s per shipment * 10 max)
    };
    return new ExcelRateFetchProducer(queue, jobOpt);
  }
}

module.exports = ExcelRateFetchProducer;
