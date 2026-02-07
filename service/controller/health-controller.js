const healthService = require('../services/health-service');
const { ResponseFormatter } = require('@shipsmart/http');

class HealthController {
  async getHealth(req, res, next) {
    try {
      const health = await healthService.getHealthStatus();

      // Set HTTP status code based on health status
      const statusCode = health.status === 'OK' ? 200 : 503;

      return res.status(statusCode).json(health);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new HealthController();
