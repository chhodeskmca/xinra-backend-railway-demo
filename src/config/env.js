require('dotenv').config({ quiet: true });

function getRequiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getOptionalEnv(name, defaultValue) {
  return process.env[name] || defaultValue;
}

function getNumberEnv(name, defaultValue) {
  const value = process.env[name];

  if (!value) {
    return defaultValue;
  }

  const parsedValue = Number(value);

  if (Number.isNaN(parsedValue)) {
    throw new Error(`${name} must be a valid number`);
  }

  return parsedValue;
}

const env = {
  nodeEnv: getOptionalEnv('NODE_ENV', 'development'),
  port: getNumberEnv('PORT', 3000),
  jwtExpiresIn: getOptionalEnv('JWT_EXPIRES_IN', '1h'),
  bcryptSaltRounds: getNumberEnv('BCRYPT_SALT_ROUNDS', 12),
  frontendBaseUrl: getOptionalEnv('FRONTEND_BASE_URL', ''),
  corsOrigin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
    : undefined
};

module.exports = {
  env,
  getRequiredEnv,
  getOptionalEnv,
  getNumberEnv
};
