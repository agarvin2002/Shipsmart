const Joi = require('@hapi/joi');

const excelRateFetchJobSchema = Joi.object({
  fileBuffer: Joi.alternatives().try(
    Joi.binary(),
    Joi.object({
      type: Joi.string().valid('Buffer'),
      data: Joi.array().items(Joi.number())
    })
  ).required(),
  originalFilename: Joi.string().required(),
  userId: Joi.number().integer().positive().required(),
  requestId: Joi.string().required(),
}).required();

module.exports = { excelRateFetchJobSchema };
