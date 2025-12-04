const config = require('@shipsmart/env');
const express = require('express');
const cookieParser = require('cookie-parser');
const addRequestId = require('express-request-id')();
const bodyParser = require('body-parser');

global.logger = require('@shipsmart/logger').application('service');

const db = require('./models');

const app = express();

db.sequelize.sync()
  .then(() => {
    logger.info('Database synchronized successfully');
  })
  .catch((error) => {
    logger.error(`Error synchronizing database: ${error.stack}`);
  });

const apiRouter = require('./routes');
const requestLogger = require('./middleware/request-logger');

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(addRequestId);
app.use(bodyParser.urlencoded({ extended: true, limit: '20mb' }));
app.use(bodyParser.json({ limit: '20mb' }));
app.use(requestLogger);

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

app.use('/api/', apiRouter);

const ErrorFormatter = require('./helpers/error-formatter');

app.use((err, req, res, next) => {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  if (err) {
    logger.error(`[${req.id}] Exception occurred while processing the request. ${err.stack}`);
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Unexpected Error occurred.';
    return res.status(statusCode).json(ErrorFormatter.formatError(message, req.id, statusCode));
  }

  return res.status(404).json(ErrorFormatter.formatError('Not Found', req.id, 404));
});

module.exports = app;
