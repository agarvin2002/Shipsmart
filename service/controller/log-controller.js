/* global logger */

const LogQueryService = require('../services/log-query-service');
const { ResponseFormatter } = require('@shipsmart/http');

/**
 * LogController
 *
 * HTTP handlers for API and carrier log query endpoints.
 * Provides access to logged request/response data for AI agents and analytics.
 *
 * All endpoints require authentication and enforce multi-tenancy (user_id filtering).
 */
class LogController {
  /**
   * GET /api/v1/logs/shipment/:shipmentId
   * Get complete trace for a specific shipment (API + carrier requests)
   *
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   * @param {Function} next - Express next middleware
   */
  async getShipmentTrace(req, res, next) {
    try {
      const { shipmentId } = req.params;
      const context = {
        currentUser: req.user,
        requestId: req.id
      };

      logger.info('[LogController] Getting shipment trace', {
        shipmentId,
        userId: context.currentUser.userId,
        requestId: context.requestId
      });

      const trace = await LogQueryService.getShipmentTrace(shipmentId, context);

      // Check if user has access to this shipment's logs (multi-tenancy)
      if (trace.api_request && trace.api_request.user_id !== context.currentUser.userId) {
        logger.warn('[LogController] Unauthorized access attempt', {
          shipmentId,
          requestingUserId: context.currentUser.userId,
          actualUserId: trace.api_request.user_id
        });

        return res.status(403).json(
          ResponseFormatter.formatError(
            'Access denied: You do not have permission to view this shipment',
            req.id,
            403
          )
        );
      }

      return res.json(
        ResponseFormatter.formatSuccess(trace, req.id)
      );

    } catch (error) {
      logger.error('[LogController] Failed to get shipment trace', {
        shipmentId: req.params.shipmentId,
        error: error.message,
        stack: error.stack
      });
      next(error);
    }
  }

  /**
   * GET /api/v1/logs/errors
   * Get failed requests for analysis
   *
   * Query params:
   * - carrier: Filter by carrier (optional)
   * - startDate: ISO 8601 date string (optional)
   * - endDate: ISO 8601 date string (optional)
   * - limit: Max results (default: 50)
   *
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   * @param {Function} next - Express next middleware
   */
  async getFailedRequests(req, res, next) {
    try {
      const { carrier, startDate, endDate, limit } = req.query;
      const userId = req.user.userId;

      logger.info('[LogController] Getting failed requests', {
        userId,
        carrier,
        startDate,
        endDate,
        limit,
        requestId: req.id
      });

      const options = {
        userId, // CRITICAL: Enforce multi-tenancy
        carrier,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        limit: limit ? parseInt(limit, 10) : 50
      };

      const errors = await LogQueryService.getFailedRequests(options);

      return res.json(
        ResponseFormatter.formatSuccess(errors, req.id)
      );

    } catch (error) {
      logger.error('[LogController] Failed to get failed requests', {
        error: error.message,
        stack: error.stack
      });
      next(error);
    }
  }

  /**
   * GET /api/v1/logs/carrier-stats/:carrier
   * Get performance statistics for a specific carrier
   *
   * Query params:
   * - startDate: ISO 8601 date string (optional)
   * - endDate: ISO 8601 date string (optional)
   *
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   * @param {Function} next - Express next middleware
   */
  async getCarrierStats(req, res, next) {
    try {
      const { carrier } = req.params;
      const { startDate, endDate } = req.query;

      logger.info('[LogController] Getting carrier stats', {
        carrier,
        startDate,
        endDate,
        userId: req.user.userId,
        requestId: req.id
      });

      const stats = await LogQueryService.getCarrierStats(
        carrier.toLowerCase(),
        startDate ? new Date(startDate) : null,
        endDate ? new Date(endDate) : null
      );

      return res.json(
        ResponseFormatter.formatSuccess(stats, req.id)
      );

    } catch (error) {
      logger.error('[LogController] Failed to get carrier stats', {
        carrier: req.params.carrier,
        error: error.message,
        stack: error.stack
      });
      next(error);
    }
  }

  /**
   * GET /api/v1/logs/search
   * Search logs with complex filters
   *
   * Query params:
   * - carrier: Filter by carrier (optional)
   * - operation: Filter by operation (optional)
   * - status: Filter by HTTP status code (optional)
   * - startDate: ISO 8601 date string (optional)
   * - endDate: ISO 8601 date string (optional)
   * - errorOnly: Only return errors (default: false)
   * - limit: Max results (default: 100)
   *
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   * @param {Function} next - Express next middleware
   */
  async searchLogs(req, res, next) {
    try {
      const {
        carrier,
        operation,
        status,
        startDate,
        endDate,
        errorOnly,
        limit
      } = req.query;

      const userId = req.user.userId;

      logger.info('[LogController] Searching logs', {
        userId,
        carrier,
        operation,
        status,
        errorOnly,
        limit,
        requestId: req.id
      });

      const query = {
        userId, // CRITICAL: Enforce multi-tenancy
        carrier,
        operation,
        status: status ? parseInt(status, 10) : null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        errorOnly: errorOnly === 'true',
        limit: limit ? parseInt(limit, 10) : 100
      };

      const results = await LogQueryService.searchLogs(query);

      return res.json(
        ResponseFormatter.formatSuccess(
          {
            count: results.length,
            results
          },
          req.id
        )
      );

    } catch (error) {
      logger.error('[LogController] Search failed', {
        error: error.message,
        stack: error.stack
      });
      next(error);
    }
  }

  /**
   * GET /api/v1/logs/my-logs
   * Get current user's recent API logs with pagination
   *
   * Query params:
   * - limit: Max results (default: 50)
   * - offset: Offset for pagination (default: 0)
   * - startDate: ISO 8601 date string (optional)
   * - endDate: ISO 8601 date string (optional)
   *
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   * @param {Function} next - Express next middleware
   */
  async getMyLogs(req, res, next) {
    try {
      const { limit, offset, startDate, endDate } = req.query;
      const userId = req.user.userId;

      logger.info('[LogController] Getting user logs', {
        userId,
        limit,
        offset,
        startDate,
        endDate,
        requestId: req.id
      });

      const options = {
        limit: limit ? parseInt(limit, 10) : 50,
        offset: offset ? parseInt(offset, 10) : 0,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null
      };

      const logs = await LogQueryService.getLogsByUser(userId, options);

      return res.json(
        ResponseFormatter.formatSuccess(
          {
            count: logs.length,
            limit: options.limit,
            offset: options.offset,
            logs
          },
          req.id
        )
      );

    } catch (error) {
      logger.error('[LogController] Failed to get user logs', {
        userId: req.user.userId,
        error: error.message,
        stack: error.stack
      });
      next(error);
    }
  }
}

module.exports = new LogController();
