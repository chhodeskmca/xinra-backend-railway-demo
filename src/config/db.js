const { PrismaClient } = require('@prisma/client');
const { env, getRequiredEnv } = require('./env');

getRequiredEnv('DATABASE_URL');

const prisma = new PrismaClient({
  log: env.nodeEnv === 'development' ? ['warn', 'error'] : ['error']
});

module.exports = prisma;
