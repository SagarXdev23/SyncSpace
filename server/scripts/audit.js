
const http = require('http');

process.env.CLIENT_URL = 'http://localhost:3000';
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'audit-access-secret';
process.env.JWT_REFRESH_SECRET = 'audit-refresh-secret';

const app = require('../app');

function listRoutes(stack, prefix = '') {
  const routes = [];
  for (const layer of stack) {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods).map((m) => m.toUpperCase()).join(',');
      routes.push(`${methods.padEnd(6)} ${prefix}${layer.route.path}`);
    } else if (layer.name === 'router' && layer.handle.stack) {
      const mount = layer.regexp.source
        .replace('^', '')
        .replace('\\/?(?=\\/|$)', '')
        .replace(/\\\//g, '/');
      routes.push(...listRoutes(layer.handle.stack, mount));
    }
  }
  return routes.sort();
}

async function main() {
  console.log('--- Route table ---');
  const routes = listRoutes(app._router.stack);
  for (const r of routes) console.log(r);
  console.log(`--- ${routes.length} routes ---\n`);

  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const results = [];
  const check = (name, cond, extra = '') => {
    results.push([cond ? 'PASS' : 'FAIL', name, extra]);
    if (!cond) process.exitCode = 1;
  };

  const get = (path, headers = {}) => fetch(base + path, { headers }).then(async (res) => ({
    status: res.status, headers: res.headers, json: await res.json().catch(() => ({})),
  }));
  const post = (path, body, headers = {}) => fetch(base + path, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  }).then(async (res) => ({
    status: res.status, headers: res.headers, json: await res.json().catch(() => ({})),
  }));

  let r = await get('/health');
  check('GET /health 200', r.status === 200 && r.json.status === 'ok', r.status);

  r = await get('/nope');
  check('unknown route 404 JSON', r.status === 404 && r.json.success === false, r.status);

  r = await get('/api/auth/me');
  check('me without token 401', r.status === 401 && r.json.success === false, r.status);

  r = await post('/api/auth/register', { name: '', email: 'bad', password: 'x' });
  check('register validation 400 (no DB hit)', r.status === 400 && Array.isArray(r.json.errors), r.status);

  r = await post('/api/auth/login', { email: 'bad', password: '' });
  check('login validation 400 (no DB hit)', r.status === 400, r.status);

  r = await get('/api/workspaces');
  check('workspaces without token 401', r.status === 401, r.status);

  r = await get('/api/notifications');
  check('rate-limit headers present', r.headers.get('x-ratelimit-limit') === '300', r.headers.get('x-ratelimit-limit'));

  // expected routes from the spec
  const expected = [
    'POST /api/auth/register', 'POST /api/auth/login', 'POST /api/auth/refresh',
    'POST /api/auth/logout', 'GET /api/auth/me',
    'POST /api/workspaces', 'GET /api/workspaces', 'GET /api/workspaces/:id',
    'PATCH /api/workspaces/:id', 'DELETE /api/workspaces/:id',
    'POST /api/workspaces/:id/members', 'PATCH /api/workspaces/:id/members/:userId',
    'DELETE /api/workspaces/:id/members/:userId', 'GET /api/workspaces/:id/activity',
    'POST /api/projects', 'GET /api/projects/:param', 'PATCH /api/projects/:id', 'DELETE /api/projects/:id',
    'POST /api/tasks', 'GET /api/tasks/project/:projectId', 'GET /api/tasks/:param',
    'PATCH /api/tasks/:id', 'DELETE /api/tasks/:id',
    'POST /api/comments', 'GET /api/comments/:taskId', 'PATCH /api/comments/:id', 'DELETE /api/comments/:id',
    'GET /api/messages/:workspaceId', 'POST /api/messages',
    'POST /api/files', 'GET /api/files/:workspaceId', 'DELETE /api/files/:id',
    'GET /api/invites/:token', 'POST /api/invites/accept',
    'GET /api/notifications', 'PATCH /api/notifications/:id', 'PATCH /api/notifications/read-all',
    'DELETE /api/workspaces/:id', 'DELETE /api/workspaces/:id/members/:userId', 'DELETE /api/projects/:id',
  ];
  const table = routes.map((r) => r.replace(/\s+/g, ' ')).join('\n');
  for (const e of expected) check(`route registered: ${e}`, table.includes(e));

  const pass = results.filter(([s]) => s === 'PASS').length;
  const fail = results.filter(([s]) => s === 'FAIL').length;
  console.log(`\n==== AUDIT: ${pass} passed, ${fail} failed ====`);
  for (const [s, name, extra] of results.filter(([s]) => s === 'FAIL')) console.log(`FAIL  ${name} ${extra}`);
  await new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

main().catch((err) => { console.error('audit crashed:', err); process.exit(1); });
