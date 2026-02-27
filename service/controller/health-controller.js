const healthService = require('../services/health-service');
const { ResponseFormatter } = require('@shipsmart/http');

class HealthController {
  async getHealth(req, res, next) {
    try {
      const health = await healthService.getHealthStatus();

      // Always return 200 so ALB health checks pass even when DB/Redis are degraded.
      // The health status details are in the response body.
      return res.status(200).json(health);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new HealthController();
