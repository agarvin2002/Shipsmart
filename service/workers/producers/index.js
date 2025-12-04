const { WorkerJobs } = require('@shipsmart/constants');
const CheckCreationProducer = require('./check-creation-producer');

const producerMapping = {
  [WorkerJobs.CHECK_CREATION]: CheckCreationProducer.getProducer(),
};

module.exports = producerMapping;
