const { WorkerJobs } = require('@shipsmart/constants');
const RateFetchProducer = require('./rate-fetch-producer');
const ApiLogProducer = require('./api-log-producer');
const CarrierApiLogProducer = require('./carrier-api-log-producer');
const ExcelRateFetchProducer = require('./excel-rate-fetch-producer');

const producerMapping = {
  [WorkerJobs.RATE_FETCH]: RateFetchProducer.getProducer(),
  [WorkerJobs.API_LOG]: ApiLogProducer.getProducer(),
  [WorkerJobs.CARRIER_API_LOG]: CarrierApiLogProducer.getProducer(),
  [WorkerJobs.EXCEL_RATE_FETCH]: ExcelRateFetchProducer.getProducer(),
};

module.exports = producerMapping;
