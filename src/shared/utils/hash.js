const bcrypt = require('bcrypt');
const { env } = require('../../config/env');

function hashPassword(password) {
  return bcrypt.hash(password, env.bcryptSaltRounds);
}

function comparePassword(plainPassword, hashedPassword) {
  return bcrypt.compare(plainPassword, hashedPassword);
}

module.exports = {
  hashPassword,
  comparePassword
};
