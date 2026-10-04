/**
 * Redis-backed rate limiting with an in-memory fallback.
 * Uses INCR + PEXPIRE per (ip, method, route) bucket when Redis is available;
 * otherwise a local Map with the same semantics. Responds 429 + Retry-After.
 */
const { getRedis } = require('../config/redis');

const memoryStore = new Map();
// Periodic cleanup of expired in-memory buckets (does not keep process alive).
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryStore) {
    if (entry.resetAt <= now) memoryStore.delete(key);
  }
}, 60 * 1000).unref();

async function checkLimit(key, max, windowMs) {
  const redis = getRedis();
  if (redis) {
    try {
      const count = await redis.incr(key);
      if (count === 1) await redis.pexpire(key, windowMs);
      const ttlMs = await redis.pttl(key);
      return { allowed: count <= max, retryAfterSec: Math.max(1, Math.ceil(ttlMs / 1000)) };
    } catch (err) {
      console.warn(`[ratelimit] redis failed (${err.message}) — using in-memory fallback`);
    }
  }

  const now = Date.now();
  let entry = memoryStore.get(key);
  if (!entry || entry.resetAt <= now) entry = { count: 0, resetAt: now + windowMs };
  entry.count += 1;
  memoryStore.set(key, entry);
  return {
    allowed: entry.count <= max,
    retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
  };
}

function rateLimiter({ windowMs, max, name = 'api', message = 'Too many requests — please try again later' }) {
  return async (req, res, next) => {
    // `name` namespaces the bucket so stacked limiters (e.g. api + auth on
    // the same route) don't share/double-count a single bucket.
    const key = `rl:${name}:${req.ip}:${req.method}:${req.baseUrl}${req.path}`;
    try {
      const { allowed, retryAfterSec } = await checkLimit(key, max, windowMs);
      res.setHeader('X-RateLimit-Limit', String(max));
      if (!allowed) {
        res.setHeader('Retry-After', String(retryAfterSec));
        return res.status(429).json({ success: false, message, retryAfter: retryAfterSec });
      }
    } catch (err) {
      console.warn(`[ratelimit] check failed (${err.message}) — allowing request`);
    }
    next();
  };
}

const FIFTEEN_MIN = 15 * 60 * 1000;

module.exports = {
  rateLimiter,
  // Strict bucket for auth endpoints (login / register / refresh).
  authLimiter: rateLimiter({
    name: 'auth',
    windowMs: FIFTEEN_MIN,
    max: 10,
    message: 'Too many authentication attempts — please try again later',
  }),
  // General API bucket.
  apiLimiter: rateLimiter({ name: 'api', windowMs: FIFTEEN_MIN, max: 300 }),
};
