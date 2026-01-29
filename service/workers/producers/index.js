const { WorkerJobs } = require('@shipsmart/constants');
const CheckCreationProducer = require('./check-creation-producer');
const RateFetchProducer = require('./rate-fetch-producer');
const ApiLogProducer = require('./api-log-producer');
const CarrierApiLogProducer = require('./carrier-api-log-producer');

const producerMapping = {
  [WorkerJobs.CHECK_CREATION]: CheckCreationProducer.getProducer(),
  [WorkerJobs.RATE_FETCH]: RateFetchProducer.getProducer(),
  [WorkerJobs.API_LOG]: ApiLogProducer.getProducer(),
  [WorkerJobs.CARRIER_API_LOG]: CarrierApiLogProducer.getProducer(),
};

module.exports = producerMapping;
