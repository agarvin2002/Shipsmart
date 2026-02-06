/**
 * Sentry Error Tracking Helper
 *
 * Initializes Sentry for error tracking in production/staging environments.
 * Skips initialization if SENTRY_DSN is not configured.
 */

const Sentry = require('@sentry/node');
const config = require('@shipsmart/env');

class SentryHelper {
  static isInitialized = false;

  /**
   * Initialize Sentry with Express integration
   * @param {Express} app - Express application instance
   */
  static init(app) {
    const dsn = config.get('sentry:dsn') || process.env.SENTRY_DSN;
    const environment = config.get('environment') || process.env.NODE_ENV || 'development';

    // Skip initialization if no DSN or in test environment
    if (!dsn || environment === 'test') {
      if (global.logger) {
        global.logger.info('Sentry disabled - no DSN configured or test environment');
      }
      return;
    }

    Sentry.init({
      dsn,
      environment,
      release: process.env.APP_VERSION || '1.0.0',

      // Performance monitoring (sample 10% in production, 100% in staging)
      tracesSampleRate: environment === 'production' ? 0.1 : 1.0,

      // Don't send PII by default
      sendDefaultPii: false,

      // Filter sensitive data from breadcrumbs
      beforeBreadcrumb(breadcrumb) {
        if (breadcrumb.category === 'http') {
          // Remove Authorization headers from HTTP breadcrumbs
          if (breadcrumb.data && breadcrumb.data.headers) {
            delete breadcrumb.data.headers.authorization;
            delete breadcrumb.data.headers.Authorization;
          }
        }
        return breadcrumb;
      },

      // Filter sensitive data from events
      beforeSend(event) {
        // Remove sensitive headers
        if (event.request && event.request.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.Authorization;
          delete event.request.headers.cookie;
        }
        return event;
      }
    });

    this.isInitialized = true;

    if (global.logger) {
      global.logger.info('Sentry initialized', { environment });
    }
  }

  /**
   * Capture an exception and send to Sentry
   * @param {Error} error - Error to capture
   * @param {Object} context - Additional context
   */
  static captureException(error, context = {}) {
    if (!this.isInitialized) return;

    Sentry.withScope((scope) => {
      if (context.user) {
        scope.setUser({ id: context.user.id, email: context.user.email });
      }
      if (context.requestId) {
        scope.setTag('request_id', context.requestId);
      }
      if (context.tags) {
        Object.entries(context.tags).forEach(([key, value]) => {
          scope.setTag(key, value);
        });
      }
      if (context.extra) {
        Object.entries(context.extra).forEach(([key, value]) => {
          scope.setExtra(key, value);
        });
      }
      Sentry.captureException(error);
    });
  }

  /**
   * Express error handler middleware for Sentry
   */
  static errorHandler() {
    return (err, req, res, next) => {
      if (this.isInitialized) {
        this.captureException(err, {
          user: req.user,
          requestId: req.id,
          tags: {
            path: req.path,
            method: req.method
          },
          extra: {
            query: req.query,
            params: req.params
          }
        });
      }
      next(err);
    };
  }

  /**
   * Flush pending events (call before shutdown)
   * @param {number} timeout - Timeout in ms
   */
  static async flush(timeout = 2000) {
    if (this.isInitialized) {
      await Sentry.close(timeout);
    }
  }
}

module.exports = SentryHelper;
