const tipReviewService = require('./tipReview.service');
const { HTTP_STATUS } = require('../../shared/constants/httpStatus');
const { successResponse } = require('../../shared/utils/response');

async function submitTipReview(req, res, next) {
  try {
    const result = await tipReviewService.submitTipReview(req.body);

    return successResponse(res, result, 'Tip/review submitted successfully', HTTP_STATUS.CREATED);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  submitTipReview
};
