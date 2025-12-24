const cls = require('cls-hooked');

// Get the existing namespace created in models/index.js
const namespace = cls.getNamespace('shipsmart_sequel_trans');

function contextManager(req, res, next) {
  namespace.run(() => {
    // Set request ID in namespace context
    namespace.set('requestId', req.id);
    next();
  });
}

module.exports = contextManager;
