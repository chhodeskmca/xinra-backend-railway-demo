const jwt = require('jsonwebtoken');
const { env, getRequiredEnv } = require('../../config/env');

function signJwtToken(payload) {
  return jwt.sign(payload, getRequiredEnv('JWT_SECRET'), {
    expiresIn: env.jwtExpiresIn
  });
}

function verifyJwtToken(token) {
  return jwt.verify(token, getRequiredEnv('JWT_SECRET'));
}

module.exports = {
  signJwtToken,
  verifyJwtToken
};
