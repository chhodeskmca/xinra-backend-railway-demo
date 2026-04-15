const { HTTP_STATUS } = require('../constants/httpStatus');
const { errorResponse } = require('../utils/response');

function notFoundHandler(req, res) {
  return errorResponse(res, `Route ${req.originalUrl} not found`, HTTP_STATUS.NOT_FOUND, null);
}

function normalizeError(error) {
  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    return {
      statusCode: HTTP_STATUS.UNAUTHORIZED,
      message: 'Invalid or expired authentication token',
      errors: null
    };
  }

  if (error.code === 'P2002') {
    return {
      statusCode: HTTP_STATUS.CONFLICT,
      message: 'A record with this unique value already exists',
      errors: error.meta?.target || null
    };
  }

  if (error.isOperational) {
    return {
      statusCode: error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR,
      message: error.message,
      errors: error.errors || null
    };
  }

  return {
    statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    message: 'Internal server error',
    errors: null
  };
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const normalizedError = normalizeError(error);

  if (process.env.NODE_ENV !== 'test' && normalizedError.statusCode >= HTTP_STATUS.INTERNAL_SERVER_ERROR) {
    console.error(error);
  }

  return errorResponse(
    res,
    normalizedError.message,
    normalizedError.statusCode,
    normalizedError.errors
  );
}

module.exports = {
  notFoundHandler,
  errorHandler
};
