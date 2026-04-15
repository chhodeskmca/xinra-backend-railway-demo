// const { PrismaClient } = require('@prisma/client');
// const { env, getRequiredEnv } = require('./env');

// getRequiredEnv('DATABASE_URL');

// const prisma = new PrismaClient({
//   log: env.nodeEnv === 'development' ? ['warn', 'error'] : ['error']
// });

// module.exports = prisma;

const { PrismaClient } = require('@prisma/client');
const { env } = require('./env');

const { getRequiredEnv } = require('./env');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: getRequiredEnv('DB_URL')
    }
  },
  log: env.nodeEnv === 'development' ? ['warn', 'error'] : ['error']
});

module.exports = prisma;