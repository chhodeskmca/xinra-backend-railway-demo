// env.js must be the first import — it loads dotenv before anything else
const { env } = require('./config/env');

const app = require('./app');
const prisma = require('./config/db');

// Confirm which DB URL is active at startup
console.log(`[startup] NODE_ENV     : ${env.nodeEnv}`);
console.log(`[startup] PORT         : ${env.port}`);
console.log(`[startup] DB_URL : ${process.env.DB_URL}...`);

const server = app.listen(env.port, () => {
  console.log(`[startup] Server running on port ${env.port}`);
});

async function shutdown(signal) {
  console.log(`[shutdown] ${signal} received. Shutting down gracefully...`);

  server.close(async () => {
    console.log('[shutdown] HTTP server closed');
    await prisma.$disconnect();
    console.log('[shutdown] Database disconnected');
    process.exit(0);
  });

  // Force exit if graceful shutdown takes too long
  setTimeout(() => {
    console.error('[shutdown] Forced exit after timeout');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

process.on('unhandledRejection', (error) => {
  console.error('[error] Unhandled promise rejection:', error);
  shutdown('unhandledRejection');
});

process.on('uncaughtException', (error) => {
  console.error('[error] Uncaught exception:', error);
  shutdown('uncaughtException');
});