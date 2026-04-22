const multer = require('multer');
const { env } = require('../../config/env');
const { HTTP_STATUS } = require('../constants/httpStatus');
const { ALLOWED_STAFF_IMAGE_CONTENT_TYPES } = require('../integrations/s3');
const { AppError } = require('../utils/appError');

const staffProfileImageUploadHandler = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.staffImageMaxBytes,
    files: 1
  },
  fileFilter: (req, file, callback) => {
    if (!ALLOWED_STAFF_IMAGE_CONTENT_TYPES.includes(file.mimetype)) {
      return callback(new AppError('Profile image must be a JPEG or PNG file', HTTP_STATUS.BAD_REQUEST));
    }

    return callback(null, true);
  }
}).single('profile_image');

function formatMaxImageSize() {
  const sizeInMb = env.staffImageMaxBytes / (1024 * 1024);

  return Number.isInteger(sizeInMb) ? `${sizeInMb}MB` : `${env.staffImageMaxBytes} bytes`;
}

function uploadStaffProfileImage(req, res, next) {
  return staffProfileImageUploadHandler(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError(`Profile image must be ${formatMaxImageSize()} or smaller`, HTTP_STATUS.BAD_REQUEST));
      }

      if (error.code === 'LIMIT_UNEXPECTED_FILE') {
        return next(new AppError('Only one profile_image file is allowed', HTTP_STATUS.BAD_REQUEST));
      }

      return next(new AppError('Invalid profile image upload', HTTP_STATUS.BAD_REQUEST));
    }

    return next(error);
  });
}

module.exports = {
  uploadStaffProfileImage
};
