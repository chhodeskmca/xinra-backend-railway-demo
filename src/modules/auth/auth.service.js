const { z } = require('zod');
const prisma = require('../../config/db');
const { HTTP_STATUS } = require('../../shared/constants/httpStatus');
const { AppError } = require('../../shared/utils/appError');
const { comparePassword } = require('../../shared/utils/hash');
const { signJwtToken } = require('../../shared/utils/jwt');
const { validateSchema } = require('../../shared/utils/validation');

const loginSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1, 'Password is required')
});

function serializeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

async function login(payload) {
  const { email, password } = validateSchema(loginSchema, payload);

  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    throw new AppError('Invalid email or password', HTTP_STATUS.UNAUTHORIZED);
  }

  const isPasswordValid = await comparePassword(password, user.password);

  if (!isPasswordValid) {
    throw new AppError('Invalid email or password', HTTP_STATUS.UNAUTHORIZED);
  }

  const token = signJwtToken({
    userId: user.id,
    role: user.role
  });

  return {
    token,
    user: serializeUser(user)
  };
}

module.exports = {
  login
};
