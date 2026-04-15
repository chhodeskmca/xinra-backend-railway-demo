const authService = require('./auth.service');
const { HTTP_STATUS } = require('../../shared/constants/httpStatus');
const { successResponse } = require('../../shared/utils/response');

async function login(req, res, next) {
  try {
    const result = await authService.login(req.body);

    return successResponse(res, result, 'Login successful', HTTP_STATUS.OK);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  login
};
