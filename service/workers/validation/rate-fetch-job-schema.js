const Joi = require('@hapi/joi');
const { getRatesSchema } = require('../../validators/validation-schema/rate-schema');

const rateFetchJobSchema = Joi.object({
  shipmentData: getRatesSchema.required(),
  userId: Joi.number().integer().positive().required(),
  requestId: Joi.string().required(),
  options: Joi.object({
    forceRefresh: Joi.boolean().optional(),
  }).optional().default({}),
}).required();

module.exports = { rateFetchJobSchema };
