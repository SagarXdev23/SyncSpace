/**
 * Redis cache helpers with TTL. MongoDB remains the source of truth;
 * every function here is a no-op when Redis is unavailable.
 *
 * Key scheme:
 *   ws:<id>                 — single workspace document
 *   wslist:<userId>         — workspace list for a user
 *   projects:<workspaceId>   — project list for a workspace
 *   tasks:<projectId>:<st>  — task list for a project (+ optional status filter)
 *   files:<workspaceId>     — file list for a workspace
 */
const { getRedis } = require('../config/redis');

const keys = {
  workspace: (id) => `ws:${id}`,
  workspaceList: (userId) => `wslist:${userId}`,
  projects: (workspaceId) => `projects:${workspaceId}`,
  tasks: (projectId, status) => `tasks:${projectId}:${status || 'all'}`,
  files: (workspaceId) => `files:${workspaceId}`,
};

async function get(key) {
  const redis = getRedis();
  if (!redis) return null;
  try {
    const raw = await redis.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.warn(`[cache] get ${key} failed: ${err.message}`);
    return null;
  }
}

async function set(key, value, ttlSeconds = 300) {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (err) {
    console.warn(`[cache] set ${key} failed: ${err.message}`);
  }
}

async function del(...keysToDelete) {
  const redis = getRedis();
  if (!redis || keysToDelete.length === 0) return;
  try {
    await redis.del(...keysToDelete);
  } catch (err) {
    console.warn(`[cache] del failed: ${err.message}`);
  }
}

/** Delete every key matching a glob pattern (e.g. 'tasks:<id>:*'). */
async function delPattern(pattern) {
  const redis = getRedis();
  if (!redis) return;
  try {
    let cursor = '0';
    do {
      const [nextCursor, batch] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      if (batch.length > 0) await redis.del(...batch);
    } while (cursor !== '0');
  } catch (err) {
    console.warn(`[cache] delPattern ${pattern} failed: ${err.message}`);
  }
}

module.exports = { keys, get, set, del, delPattern };
