const statsService = require('./stats.service');
const { HTTP_STATUS } = require('../../shared/constants/httpStatus');
const { successResponse } = require('../../shared/utils/response');

async function getDashboardStats(req, res, next) {
  try {
    const stats = await statsService.getDashboardStats(req.user);

    return successResponse(res, stats, 'Dashboard stats fetched successfully', HTTP_STATUS.OK);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getDashboardStats
};
