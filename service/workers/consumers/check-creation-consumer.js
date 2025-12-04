/* global logger */
const CheckService = require('../../services/check-service');
const { namespace } = require('../../models');

class CheckCreationConsumer {
  static async perform(job) {
    const { checkData, requestId } = job.data;

    return namespace.run(async () => {
      namespace.set('requestId', requestId);

      try {
        logger.info(`[${requestId}] Processing check creation job. Data: ${JSON.stringify(checkData)}`);

        const checkService = new CheckService();
        const check = await checkService.createCheck(checkData);

        logger.info(`[${requestId}] Successfully created check with id: ${check.id}`);

        return { success: true, checkId: check.id };
      } catch (error) {
        logger.error(`[${requestId}] Error creating check: ${error.message}`, { stack: error.stack });
        throw error;
      }
    });
  }
}

module.exports = CheckCreationConsumer;
