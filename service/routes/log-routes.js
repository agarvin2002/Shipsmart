const express = require('express');
const router = express.Router();
const LogController = require('../controller/log-controller');
const authMiddleware = require('../middleware/auth-middleware');

/**
 * Log Query Routes
 *
 * Provides endpoints for querying API and carrier logs.
 * All endpoints require authentication and enforce multi-tenancy.
 *
 * Use cases:
 * - AI agents querying shipment traces
 * - Error analysis and debugging
 * - Performance monitoring
 * - Analytics dashboards
 */

/**
 * GET /logs/my-logs
 * Get current user's recent API logs with pagination
 *
 * Query params:
 * - limit: Max results (default: 50, max: 200)
 * - offset: Offset for pagination (default: 0)
 * - startDate: ISO 8601 date string (optional)
 * - endDate: ISO 8601 date string (optional)
 */
router.get('/logs/my-logs', authMiddleware, LogController.getMyLogs);

/**
 * GET /logs/shipment/:shipmentId
 * Get complete trace for a specific shipment
 *
 * Returns:
 * - API request/response data
 * - All carrier API requests/responses
 * - Summary statistics
 */
router.get('/logs/shipment/:shipmentId', authMiddleware, LogController.getShipmentTrace);

/**
 * GET /logs/errors
 * Get failed requests for analysis
 *
 * Query params:
 * - carrier: Filter by carrier (fedex, ups, usps, dhl) (optional)
 * - startDate: ISO 8601 date string (optional)
 * - endDate: ISO 8601 date string (optional)
 * - limit: Max results (default: 50, max: 200)
 */
router.get('/logs/errors', authMiddleware, LogController.getFailedRequests);

/**
 * GET /logs/carrier-stats/:carrier
 * Get performance statistics for a specific carrier
 *
 * Path params:
 * - carrier: Carrier name (fedex, ups, usps, dhl)
 *
 * Query params:
 * - startDate: ISO 8601 date string (optional)
 * - endDate: ISO 8601 date string (optional)
 */
router.get('/logs/carrier-stats/:carrier', authMiddleware, LogController.getCarrierStats);

/**
 * GET /logs/search
 * Search logs with complex filters
 *
 * Query params:
 * - carrier: Filter by carrier (optional)
 * - operation: Filter by operation (authenticate, get_rates, etc.) (optional)
 * - status: Filter by HTTP status code (optional)
 * - startDate: ISO 8601 date string (optional)
 * - endDate: ISO 8601 date string (optional)
 * - errorOnly: Only return errors (true/false, default: false)
 * - limit: Max results (default: 100, max: 500)
 */
router.get('/logs/search', authMiddleware, LogController.searchLogs);

module.exports = router;
