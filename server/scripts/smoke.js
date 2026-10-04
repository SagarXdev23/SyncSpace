
const http = require('http');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { io: ioClient } = require('socket.io-client');

const results = [];
function check(name, cond, extra = '') {
  results.push([cond ? 'PASS' : 'FAIL', name, extra]);
  if (!cond) process.exitCode = 1;
}

async function main() {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  process.env.JWT_ACCESS_SECRET = 'smoke-test-access-secret-32chars-min';
  process.env.JWT_REFRESH_SECRET = 'smoke-test-refresh-secret-32chars-min';
  process.env.CLIENT_URL = 'http://localhost:3000';
  process.env.NODE_ENV = 'test';

  const { connectDB } = require('../config/db');
  await connectDB();
  const app = require('../app');
  const { initSocket } = require('../sockets/socketHandler');
  const server = http.createServer(app);
  initSocket(server);
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;

  const jar = {}; // name -> cookie string
  function cookieHeader(name) {
    return jar[name] ? `refreshToken=${jar[name]}` : '';
  }
  async function api(method, path, { token, body, cookieName = 'a', query = '' } = {}) {
    const headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    const ck = cookieHeader(cookieName);
    if (ck) headers.Cookie = ck;
    const res = await fetch(base + path + query, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    const setCookie = res.headers.get('set-cookie') || '';
    const m = setCookie.match(/refreshToken=([^;]+)/);
    if (m) jar[cookieName] = decodeURIComponent(m[1]);
    if (/refreshToken=;/.test(setCookie)) delete jar[cookieName];
    return { status: res.status, json, headers: res.headers };
  }

  // ---------- AUTH ----------
  let r = await api('POST', '/api/auth/register', { body: { name: 'Aarav', email: 'aarav@test.dev', password: 'password123' }, cookieName: 'a' });
  check('register 201', r.status === 201, r.status);
  check('register returns accessToken', !!r.json.data?.accessToken);
  check('register hides password', !JSON.stringify(r.json).includes('password123'));
  const tokenA = r.json.data.accessToken;
  const userA = r.json.data.user;

  r = await api('POST', '/api/auth/register', { body: { name: 'Dup', email: 'aarav@test.dev', password: 'password123' } });
  check('duplicate register 409', r.status === 409, r.status);
  r = await api('POST', '/api/auth/register', { body: { name: 'X', email: 'not-an-email', password: 'password123' } });
  check('bad email 400', r.status === 400, r.status);
  r = await api('POST', '/api/auth/register', { body: { name: 'X', email: 'x@test.dev', password: 'short' } });
  check('short password 400', r.status === 400, r.status);

  r = await api('POST', '/api/auth/login', { body: { email: 'aarav@test.dev', password: 'wrongpass' } });
  check('wrong password 401', r.status === 401, r.status);
  r = await api('POST', '/api/auth/login', { body: { email: 'aarav@test.dev', password: 'password123' }, cookieName: 'a' });
  check('login 200', r.status === 200, r.status);
  const tokenA2 = r.json.data.accessToken;
  check('login sets refresh cookie', !!jar.a);

  r = await api('GET', '/api/auth/me');
  check('me without token 401', r.status === 401, r.status);
  r = await api('GET', '/api/auth/me', { token: tokenA2 });
  check('me 200', r.status === 200 && r.json.data.user.email === 'aarav@test.dev', r.status);
  check('me hides password', r.json.data.user.password === undefined);

  let avatarForm = new FormData();
  avatarForm.append('avatar', new Blob(['not an image'], { type: 'text/plain' }), 'avatar.txt');
  let avatarResponse = await fetch(`${base}/api/auth/profile/avatar`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA2}` },
    body: avatarForm,
  });
  check('profile avatar rejects non-image uploads 400', avatarResponse.status === 400, avatarResponse.status);

  avatarForm = new FormData();
  avatarForm.append(
    'avatar',
    new Blob([Buffer.from([0x89, 0x50, 0x4e, 0x47])], { type: 'image/png' }),
    'avatar.png',
  );
  avatarResponse = await fetch(`${base}/api/auth/profile/avatar`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA2}` },
    body: avatarForm,
  });
  check('profile avatar route reports unconfigured Cloudinary 503', avatarResponse.status === 503, avatarResponse.status);

  // refresh rotation + reuse detection
  const firstRefresh = jar.a;
  r = await api('POST', '/api/auth/refresh', { cookieName: 'a' });
  check('refresh 200 rotates', r.status === 200 && !!r.json.data?.accessToken, r.status);
  const rotatedOk = r.status === 200;
  r = await api('POST', '/api/auth/refresh', { cookieName: 'reuse' }); // no cookie -> 401
  check('refresh without cookie 401', r.status === 401, r.status);
  if (rotatedOk) {
    jar.reuse = firstRefresh; // replay the OLD (rotated) token
    r = await api('POST', '/api/auth/refresh', { cookieName: 'reuse' });
    check('reused refresh token 401 + revokes all', r.status === 401, r.status);
    r = await api('POST', '/api/auth/refresh', { cookieName: 'a' }); // newest token also revoked
    check('post-reuse newest token also 401', r.status === 401, r.status);
  }

  // second user
  r = await api('POST', '/api/auth/register', { body: { name: 'Bina', email: 'bina@test.dev', password: 'password123' }, cookieName: 'b' });
  check('register user B 201', r.status === 201, r.status);
  const tokenB = r.json.data.accessToken;
  const userB = r.json.data.user;

  // re-login A after revocation
  r = await api('POST', '/api/auth/login', { body: { email: 'aarav@test.dev', password: 'password123' }, cookieName: 'a' });
  check('re-login after revocation 200', r.status === 200, r.status);
  const tokenA3 = r.json.data.accessToken;
  r = await api('GET', '/api/users', { token: tokenA3 });
  check('non-admin cannot list global users 403', r.status === 403, r.status);
  r = await api('GET', '/api/users/stats', { token: tokenA3 });
  check('non-admin cannot read global user stats 403', r.status === 403, r.status);

  // ---------- WORKSPACES ----------
  r = await api('POST', '/api/workspaces', { token: tokenA3, body: { name: 'Acme' } });
  check('create workspace 201', r.status === 201, r.status);
  const wsId = r.json.data._id;
  check('creator is OWNER', r.json.data.members[0]?.role === 'OWNER');

  r = await api('POST', '/api/invites', {
    token: tokenA3,
    body: { workspaceId: wsId, role: 'MEMBER', expiresInDays: 7, maxUses: 1 },
  });
  check('create workspace invite 201', r.status === 201 && r.json.data.workspace._id === wsId, r.status);
  const inviteToken = r.json.data.token;
  r = await api('GET', `/api/invites/${inviteToken}`);
  check('public invite preview 200', r.status === 200 && r.json.data.workspace._id === wsId, r.status);

  r = await api('GET', `/api/workspaces/${wsId}`, { token: tokenB });
  check('non-member GET workspace 403', r.status === 403, r.status);
  r = await api('GET', `/api/workspaces/${wsId}`, { token: tokenA3 });
  check('get workspace 200', r.status === 200, r.status);
  r = await api('GET', '/api/workspaces', { token: tokenA3 });
  check('list workspaces 200', r.status === 200 && r.json.data.length === 1, r.status);

  r = await api('PATCH', `/api/workspaces/${wsId}`, { token: tokenA3, body: { name: 'Acme Inc' } });
  check('update workspace 200', r.status === 200 && r.json.data.name === 'Acme Inc', r.status);

  // members
  r = await api('POST', `/api/workspaces/${wsId}/members`, { token: tokenA3, body: { email: 'bina@test.dev', role: 'OWNER' } });
  check('cannot add second OWNER 400', r.status === 400, r.status);
  r = await api('POST', `/api/workspaces/${wsId}/members`, { token: tokenA3, body: { email: 'bina@test.dev', role: 'MEMBER' } });
  check('add member 201', r.status === 201, r.status);
  r = await api('POST', `/api/workspaces/${wsId}/members`, { token: tokenA3, body: { email: 'bina@test.dev', role: 'MEMBER' } });
  check('duplicate member 409', r.status === 409, r.status);
  r = await api('POST', `/api/workspaces/${wsId}/members`, { token: tokenA3, body: { email: 'ghost@test.dev', role: 'MEMBER' } });
  check('add unknown email 404', r.status === 404, r.status);

  r = await api('GET', '/api/notifications?unread=true', { token: tokenB });
  check('member got invite notification', r.status === 200 && r.json.data.some((n) => n.type === 'workspace.invite'), r.status);

  r = await api('PATCH', `/api/workspaces/${wsId}/members/${userB._id}`, { token: tokenA3, body: { role: 'ADMIN' } });
  check('promote to ADMIN 200', r.status === 200, r.status);
  r = await api('PATCH', `/api/workspaces/${wsId}/members/${userA._id}`, { token: tokenB, body: { role: 'MEMBER' } });
  check('ADMIN cannot demote OWNER 403', r.status === 403, r.status);
  r = await api('PATCH', `/api/workspaces/${wsId}/members/${userA._id}`, { token: tokenA3, body: { role: 'MEMBER' } });
  check('cannot demote last OWNER 400', r.status === 400, r.status);
  r = await api('DELETE', `/api/workspaces/${wsId}/members/${userA._id}`, { token: tokenB });
  check('cannot remove OWNER 400', r.status === 400, r.status);

  // third user: plain MEMBER (non-author, non-admin) for permission tests
  r = await api('POST', '/api/auth/register', { body: { name: 'Chet', email: 'chet@test.dev', password: 'password123' }, cookieName: 'd' });
  check('register user C 201', r.status === 201, r.status);
  const tokenD = r.json.data.accessToken;
  r = await api('POST', `/api/workspaces/${wsId}/members`, { token: tokenA3, body: { email: 'chet@test.dev', role: 'MEMBER' } });
  check('add user C as MEMBER 201', r.status === 201, r.status);

  // ---------- PROJECTS ----------
  r = await api('POST', '/api/projects', { token: tokenA3, body: { workspaceId: wsId, name: 'Website', description: 'Revamp' } });
  check('create project 201', r.status === 201, r.status);
  const projectId = r.json.data._id;
  r = await api('GET', `/api/projects/${wsId}`, { token: tokenA3 });
  check('list projects by workspaceId 200', r.status === 200 && r.json.data.length === 1, r.status);
  r = await api('GET', `/api/projects/${projectId}`, { token: tokenA3 });
  check('project detail 200', r.status === 200 && r.json.data._id === projectId, r.status);
  r = await api('PATCH', `/api/projects/${projectId}`, { token: tokenB, body: { name: 'Website v2' } });
  check('ADMIN can update project 200', r.status === 200 && r.json.data.name === 'Website v2', r.status);
  r = await api('GET', `/api/projects/${projectId}`, { token: tokenB });
  check('member reads project 200', r.status === 200, r.status);

  // ---------- TASKS ----------
  r = await api('POST', '/api/tasks', {
    token: tokenA3,
    body: { projectId, title: 'Design homepage', priority: 'HIGH', assignedTo: userB._id, dueDate: '2026-12-01' },
  });
  check('create task 201', r.status === 201, r.status);
  const taskId = r.json.data._id;
  r = await api('GET', '/api/notifications?unread=true', { token: tokenB });
  check('assignee got task.assigned notification', r.status === 200 && r.json.data.some((n) => n.type === 'task.assigned'), r.status);

  r = await api('POST', '/api/tasks', { token: tokenA3, body: { projectId, title: 'Write copy', status: 'IN_PROGRESS' } });
  check('create 2nd task 201', r.status === 201, r.status);
  const task2Id = r.json.data._id;

  r = await api('GET', `/api/tasks/project/${projectId}`, { token: tokenA3, query: '?status=TODO' });
  check('list tasks ?status=TODO filters', r.status === 200 && r.json.data.length === 1, `${r.status}/${r.json.data?.length}`);
  r = await api('GET', `/api/tasks/${taskId}`, { token: tokenA3 });
  check('task detail 200', r.status === 200 && r.json.data._id === taskId, r.status);

  r = await api('PATCH', `/api/tasks/${taskId}`, { token: tokenB, body: { status: 'COMPLETED' } });
  check('status -> COMPLETED 200', r.status === 200 && r.json.data.status === 'COMPLETED', r.status);

  // ---------- COMMENTS ----------
  r = await api('POST', '/api/comments', { token: tokenB, body: { taskId, content: 'Looks good!' } });
  check('create comment 201', r.status === 201, r.status);
  const commentId = r.json.data._id;
  r = await api('GET', `/api/comments/${taskId}`, { token: tokenA3 });
  check('list comments 200', r.status === 200 && r.json.data.length === 1, r.status);
  r = await api('PATCH', `/api/comments/${commentId}`, { token: tokenD, body: { content: 'hijack' } });
  check('non-author member cannot edit comment 403', r.status === 403, r.status);
  r = await api('PATCH', `/api/comments/${commentId}`, { token: tokenB, body: { content: 'Looks great!' } });
  check('author edits comment 200', r.status === 200 && r.json.data.content === 'Looks great!', r.status);
  r = await api('PATCH', `/api/comments/${commentId}`, { token: tokenA3, body: { content: 'Owner moderated' } });
  check('OWNER can moderate comment 200', r.status === 200 && r.json.data.content === 'Owner moderated', r.status);

  // ---------- MESSAGES ----------
  for (const text of ['hello', 'world', 'third']) {
    r = await api('POST', '/api/messages', { token: tokenA3, body: { workspaceId: wsId, content: text } });
    if (r.status !== 201) break;
  }
  check('post messages 201', r.status === 201, r.status);
  r = await api('GET', `/api/messages/${wsId}`, { token: tokenA3, query: '?limit=2' });
  check('list messages paginated', r.status === 200 && r.json.data.length === 2 && r.json.pagination.hasMore === true, r.status);
  const oldestShown = r.json.data[0]._id;
  r = await api('GET', `/api/messages/${wsId}`, { token: tokenA3, query: `?before=${oldestShown}` });
  check('cursor pagination works', r.status === 200 && r.json.data.length === 1 && r.json.data[0].content === 'hello', `${r.status}/${r.json.data?.length}`);
  r = await api('GET', `/api/messages/${wsId}`, { token: tokenB });
  check('member reads messages 200', r.status === 200, r.status);

  // ---------- ACTIVITY ----------
  r = await api('GET', `/api/workspaces/${wsId}/activity`, { token: tokenA3 });
  const actions = (r.json.data || []).map((a) => a.action);
  check('activity feed 200', r.status === 200, r.status);
  for (const expected of ['workspace.created', 'member.added', 'project.created', 'task.created', 'task.assigned', 'task.completed', 'comment.added']) {
    check(`activity has ${expected}`, actions.includes(expected));
  }

  // ---------- NOTIFICATIONS ----------
  r = await api('GET', '/api/notifications', { token: tokenB });
  check('list notifications 200', r.status === 200 && r.json.data.length > 0, r.status);
  const notifId = r.json.data[0]._id;
  r = await api('PATCH', `/api/notifications/${notifId}`, { token: tokenB });
  check('mark notification read 200', r.status === 200 && r.json.data.read === true, r.status);
  r = await api('PATCH', '/api/notifications/read-all', { token: tokenB });
  check('read-all 200', r.status === 200, r.status);
  r = await api('GET', '/api/notifications?unread=true', { token: tokenB });
  check('no unread left', r.status === 200 && r.json.data.length === 0, r.status);

  // ---------- FILES (Cloudinary unconfigured -> 503) ----------
  const boundary = '----smoke';
  const multipart = `------smoke\r\nContent-Disposition: form-data; name="workspaceId"\r\n\r\n${wsId}\r\n------smoke\r\nContent-Disposition: form-data; name="file"; filename="t.txt"\r\nContent-Type: text/plain\r\n\r\nhello\r\n------smoke--\r\n`;
  const fres = await fetch(base + '/api/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA3}`, 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body: multipart,
  });
  check('upload without cloudinary 503', fres.status === 503, fres.status);
  r = await api('GET', `/api/files/${wsId}`, { token: tokenA3 });
  check('list files 200 (empty)', r.status === 200 && r.json.data.length === 0, r.status);

  // ---------- SOCKET.IO (two clients: A acts, B observes) ----------
  await new Promise((resolve) => {
    const socketA = ioClient(base, { auth: { token: tokenA3 } });
    const socketB = ioClient(base, { auth: { token: tokenB } });
    const seen = {};
    let joined = 0;
    let finished = false;
    const timer = setTimeout(() => finish(false, 'timeout'), 10000);
    function finish(ok, note) {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      check('socket chat round-trip', ok === true && seen.msg === true, note || '');
      check('socket presence update', seen.presence === true);
      check('socket typing event', seen.typing === true);
      socketA.disconnect();
      socketB.disconnect();
      resolve();
    }
    function maybeStart() {
      if (++joined === 2) {
        // typing + chat from A; B should observe both (broadcast excludes sender).
        socketA.emit('typing:start', { workspaceId: wsId });
        socketA.emit('chat:message', { workspaceId: wsId, content: 'realtime hi' }, (mack) => {
          if (!mack?.ok) finish(false, 'chat ack failed');
        });
      }
    }
    const onJoin = (sock, who) => (ack) => {
      if (ack?.ok) maybeStart();
      else finish(false, `join ${who} failed`);
    };
    socketA.on('connect', () => socketA.emit('join-workspace', { workspaceId: wsId }, onJoin(socketA, 'A')));
    socketB.on('connect', () => socketB.emit('join-workspace', { workspaceId: wsId }, onJoin(socketB, 'B')));
    socketB.on('presence:update', () => { seen.presence = true; });
    socketB.on('typing:update', (p) => { if (p && p.typing === true) seen.typing = true; });
    socketB.on('message:new', (msg) => {
      if (msg && msg.content === 'realtime hi') {
        seen.msg = true;
        finish(true);
      }
    });
    socketA.on('connect_error', () => finish(false, 'A connect_error'));
    socketB.on('connect_error', () => finish(false, 'B connect_error'));
  });

  // non-member socket join rejected
  r = await api('POST', '/api/auth/register', { body: { name: 'Out', email: 'out@test.dev', password: 'password123' }, cookieName: 'c' });
  const tokenC = r.json.data.accessToken;
  r = await api('POST', '/api/auth/register', { body: { name: 'Invitee', email: 'invitee@test.dev', password: 'password123' }, cookieName: 'e' });
  const tokenE = r.json.data.accessToken;
  check('register invitee 201', r.status === 201, r.status);
  r = await api('POST', '/api/invites/accept', { token: tokenE, body: { token: inviteToken } });
  check('accept workspace invite 200', r.status === 200 && r.json.data.workspace._id === wsId, r.status);
  r = await api('GET', `/api/workspaces/${wsId}`, { token: tokenE });
  check('invitee becomes workspace member', r.status === 200, r.status);
  r = await api('POST', '/api/invites/accept', { token: tokenC, body: { token: inviteToken } });
  check('invite max uses enforced 410', r.status === 410, r.status);
  r = await api('POST', '/api/invites/accept', { token: tokenE, body: { token: inviteToken } });
  check('invite acceptance is idempotent for members', r.status === 200 && r.json.data.alreadyMember, r.status);
  await new Promise((resolve) => {
    const socket = ioClient(base, { auth: { token: tokenC } });
    const timer = setTimeout(() => { check('non-member socket join rejected', false, 'timeout'); socket.disconnect(); resolve(); }, 8000);
    socket.on('connect', () => {
      socket.emit('join-workspace', { workspaceId: wsId }, (ack) => {
        clearTimeout(timer);
        check('non-member socket join rejected', ack?.ok === false);
        socket.disconnect();
        resolve();
      });
    });
  });

  // ---------- REMOVE MEMBER / DELETE ----------
  r = await api('DELETE', `/api/workspaces/${wsId}/members/${userB._id}`, { token: tokenA3 });
  check('remove member 200', r.status === 200, r.status);
  r = await api('GET', `/api/workspaces/${wsId}`, { token: tokenB });
  check('removed member gets 403', r.status === 403, r.status);

  r = await api('DELETE', `/api/comments/${commentId}`, { token: tokenA3 });
  check('ADMIN deletes comment 200', r.status === 200, r.status);
  r = await api('DELETE', `/api/tasks/${task2Id}`, { token: tokenA3 });
  check('delete task 200', r.status === 200, r.status);
  r = await api('DELETE', `/api/projects/${projectId}`, { token: tokenA3 });
  check('delete project 200', r.status === 200, r.status);
  r = await api('DELETE', `/api/workspaces/${wsId}`, { token: tokenB });
  check('ADMIN cannot delete workspace 403', r.status === 403, r.status);

  // ---------- LOGOUT ----------
  r = await api('POST', '/api/auth/logout', { token: tokenA3, cookieName: 'a' });
  check('logout 200', r.status === 200, r.status);
  r = await api('POST', '/api/auth/refresh', { cookieName: 'a' });
  check('refresh after logout 401', r.status === 401, r.status);

  // ---------- RATE LIMIT (auth bucket: 10 / 15min) ----------
  let last = 0;
  for (let i = 0; i < 12; i++) {
    const rr = await api('POST', '/api/auth/login', { body: { email: 'aarav@test.dev', password: 'wrongpass' }, cookieName: 'rl' });
    last = rr.status;
    if (rr.status === 429) break;
  }
  check('auth rate limit 429 after 10 attempts', last === 429, last);

  // ---------- REPORT ----------
  const pass = results.filter(([s]) => s === 'PASS').length;
  const fail = results.filter(([s]) => s === 'FAIL').length;
  console.log(`\n==== SMOKE: ${pass} passed, ${fail} failed ====`);
  for (const [s, name, extra] of results) {
    if (s === 'FAIL') console.log(`FAIL  ${name} ${extra}`);
  }

  server.close();
  await mongod.stop();
  process.exit(process.exitCode || 0);
}

main().catch((err) => {
  console.error('smoke crashed:', err);
  process.exit(1);
});
