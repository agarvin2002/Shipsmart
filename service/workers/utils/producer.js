const producerMapping = require('../producers');

const getWorkerProducer = (job) => producerMapping[job];

module.exports = { getWorkerProducer };
