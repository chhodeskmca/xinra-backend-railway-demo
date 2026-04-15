// Must be first - load .env but never override Railway's injected variables
require('dotenv').config({ override: false });

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
  if (!value) return defaultValue;
  const parsedValue = Number(value);
  if (Number.isNaN(parsedValue)) {
    throw new Error(`${name} must be a valid number`);
  }
  return parsedValue;
}

// Validate all required variables at startup
const requiredVars = ['DB_URL', 'JWT_SECRET'];
for (const varName of requiredVars) {
  getRequiredEnv(varName);
}

const env = {
  nodeEnv: getOptionalEnv('NODE_ENV', 'development'),
  port: getNumberEnv('PORT', 3000),
  jwtSecret: getRequiredEnv('JWT_SECRET'),
  jwtExpiresIn: getOptionalEnv('JWT_EXPIRES_IN', '1h'),
  bcryptSaltRounds: getNumberEnv('BCRYPT_SALT_ROUNDS', 12),
  frontendBaseUrl: getOptionalEnv('FRONTEND_BASE_URL', ''),
  corsOrigin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
    : undefined,
  isDevelopment: getOptionalEnv('NODE_ENV', 'development') === 'development',
  isProduction: getOptionalEnv('NODE_ENV', 'development') === 'production',
};

module.exports = { env, getRequiredEnv, getOptionalEnv, getNumberEnv };