const prisma = require('../../config/db');
const { HTTP_STATUS } = require('../constants/httpStatus');
const { AppError } = require('../utils/appError');
const { verifyJwtToken } = require('../utils/jwt');

const USER_SAFE_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
  updatedAt: true
};

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication token is required', HTTP_STATUS.UNAUTHORIZED);
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyJwtToken(token);

    if (!decoded.userId || !decoded.role) {
      throw new AppError('Invalid authentication token', HTTP_STATUS.UNAUTHORIZED);
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: USER_SAFE_SELECT
    });

    if (!user) {
      throw new AppError('Authenticated user no longer exists', HTTP_STATUS.UNAUTHORIZED);
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  authenticate
};
