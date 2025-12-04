const workerClient = require('../../worker-client');
const { WorkerJobs } = require('@shipsmart/constants');

class CheckCreationProducer {
  constructor(queue, jobOpt) {
    this.queue = queue;
    this.jobOpt = jobOpt;
  }

  async publishMessage(data) {
    const job = await this.queue.add(data, this.jobOpt);
    return job;
  }

  static getProducer() {
    const queue = workerClient.getQueue(WorkerJobs.CHECK_CREATION);
    const jobOpt = {
      attempts: 2,
      priority: 2,
      backoff: 0,
      removeOnComplete: true,
      removeOnFail: false,
    };
    return new CheckCreationProducer(queue, jobOpt);
  }
}

module.exports = CheckCreationProducer;
