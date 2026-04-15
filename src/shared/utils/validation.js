const { HTTP_STATUS } = require('../constants/httpStatus');
const { AppError } = require('./appError');

function formatZodIssues(error) {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || null,
    message: issue.message
  }));
}

function validateSchema(schema, payload) {
  const result = schema.safeParse(payload);

  if (!result.success) {
    throw new AppError('Validation failed', HTTP_STATUS.BAD_REQUEST, formatZodIssues(result.error));
  }

  return result.data;
}

module.exports = {
  validateSchema
};
