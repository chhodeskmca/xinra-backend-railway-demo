function successResponse(res, data = null, message = 'Success', statusCode = 200, meta = null) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    meta
  });
}

function errorResponse(res, message = 'Internal server error', statusCode = 500, errors = null) {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
    data: null
  });
}

module.exports = {
  successResponse,
  errorResponse
};
