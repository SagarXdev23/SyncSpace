/**
 * SyncSpace API entry point.
 * Boots the HTTP server + Socket.io. MongoDB / Redis / Cloudinary are all
 * optional at boot — the server starts and serves (with degraded features)
 * even when any of them is unreachable.
 */
require('dotenv').config();

const http = require('http');
const app = require('./app');
const { connectDB } = require('./config/db');
const { initRedis } = require('./config/redis');
const { initCloudinary } = require('./config/cloudinary');
const { initSocket } = require('./sockets/socketHandler');

const PORT = process.env.PORT || 5000;

process.on('unhandledRejection', (err) => {
  console.error('[server] unhandled rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('[server] uncaught exception:', err);
  process.exit(1);
});

async function start() {
  await connectDB(); // logs and continues when MongoDB is down
  initRedis(); // fire-and-forget; falls back gracefully
  initCloudinary(); // warns when unconfigured; uploads then return 503

  const server = http.createServer(app);
  initSocket(server);

  server.listen(PORT, () => {
    console.log(`[server] SyncSpace API listening on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
  });
}

start();
