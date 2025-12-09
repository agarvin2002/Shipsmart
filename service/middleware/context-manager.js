const cls = require('cls-hooked');

// Get the existing namespace created in models/index.js
const namespace = cls.getNamespace('shipsmart_sequel_trans');

/**
 * Context Manager Middleware
 *
 * Wraps each HTTP request in the CLS namespace and sets the request ID.
 * This makes the request ID automatically available to all downstream code
 * (services, Redis, S3, database operations, etc.) without passing it as a parameter.
 *
 * Must be used after express-request-id middleware.
 */
function contextManager(req, res, next) {
  namespace.run(() => {
    // Set request ID in namespace context
    namespace.set('requestId', req.id);
    next();
  });
}

module.exports = contextManager;
