const WorkerJobs = require('./worker-jobs');

module.exports = {
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
  },
  QUEUE_NAMES: {
    WORKER: 'shipsmart-worker',
  },
  WorkerJobs,
};
