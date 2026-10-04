/**
 * Redis client (ioredis) with lazy connect and graceful failure.
 * If REDIS_URL is missing or Redis is unreachable, `getRedis()` returns null
 * and the cache / rate-limiter layers fall back to safe no-op / in-memory
 * behaviour so the API keeps serving requests.
 */
const Redis = require('ioredis');

let client = null;

function initRedis() {
  const url = process.env.REDIS_URL;
  if (!url) {
    console.warn('[redis] REDIS_URL not set — Redis caching disabled, in-memory rate-limit fallback active');
    return null;
  }

  client = new Redis(url, {
    lazyConnect: true,
    enableReadyCheck: true,
    maxRetriesPerRequest: 2,
    retryStrategy: (times) => Math.min(times * 200, 5000),
  });

  client.on('ready', () => console.log('[redis] connected and ready'));
  client.on('error', (err) => console.warn(`[redis] error: ${err.message}`));
  client.on('close', () => console.warn('[redis] connection closed'));

  // Fire-and-forget: a down Redis must never prevent the server from booting.
  client.connect().catch((err) => {
    console.warn(`[redis] initial connect failed (${err.message}) — continuing without Redis`);
  });

  return client;
}

/** Returns the ioredis client only when it is actually ready, else null. */
function getRedis() {
  if (client && client.status === 'ready') return client;
  return null;
}

module.exports = { initRedis, getRedis };
