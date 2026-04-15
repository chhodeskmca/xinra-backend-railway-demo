const { HTTP_STATUS } = require('../constants/httpStatus');
const { AppError } = require('../utils/appError');

function authorize(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication is required', HTTP_STATUS.UNAUTHORIZED));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', HTTP_STATUS.FORBIDDEN));
    }

    return next();
  };
}

module.exports = {
  authorize
};
