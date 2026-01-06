const { WorkerJobs } = require('@shipsmart/constants');
const CheckCreationProducer = require('./check-creation-producer');
const RateFetchProducer = require('./rate-fetch-producer');

const producerMapping = {
  [WorkerJobs.CHECK_CREATION]: CheckCreationProducer.getProducer(),
  [WorkerJobs.RATE_FETCH]: RateFetchProducer.getProducer(),
};

module.exports = producerMapping;
