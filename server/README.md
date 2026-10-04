# SyncSpace — Backend API

Real-time collaborative workspace API (Trello + Slack + Google Drive concepts):
workspaces with role-based membership, projects, Kanban tasks, task comments,
real-time team chat, file sharing (Cloudinary), notifications, activity feed,
Redis caching + rate limiting, and Socket.io real-time events.

## Tech stack

Node.js · Express 4 · MongoDB (Mongoose) · Redis (ioredis) · Socket.io ·
JWT (access + rotating refresh tokens) · bcryptjs · Cloudinary · multer ·
helmet · cors · cookie-parser · express-validator

## Quick start

```bash
cd server
cp .env.example .env   # fill in secrets (PowerShell: Copy-Item .env.example .env)
npm ci
npm run dev            # uses Node's built-in --watch
# or
npm start
```

Health check: `GET /health`

The server boots even if MongoDB / Redis / Cloudinary are unreachable
(it logs a warning and continues with degraded features).

## Environment variables

| Var | Required | Purpose |
|---|---|---|
| `PORT` | no (5000) | HTTP listen port |
| `NODE_ENV` | no | `production` enables secure cookies, hides stack traces |
| `CLIENT_URL` | yes (prod) | Allowed CORS origin(s), comma-separated |
| `MONGODB_URI` | yes | MongoDB Atlas connection string |
| `JWT_ACCESS_SECRET` | yes | Signs 15-minute access tokens |
| `JWT_REFRESH_SECRET` | yes | Signs 7-day refresh tokens |
| `REDIS_URL` | no | Redis Cloud URL — caching + rate limiting |
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | no | File uploads (503 when unset) |

## API reference

Auth: access token via `Authorization: Bearer <token>`; refresh token via
httpOnly cookie `refreshToken`.

### Auth — `/api/auth`
| Method | Route | Notes |
|---|---|---|
| POST | `/register` | name, email, password (≥8). 409 on duplicate |
| POST | `/login` | Returns accessToken + sets refresh cookie |
| POST | `/refresh` | Rotates pair; replay of a rotated token revokes **all** sessions |
| POST | `/logout` | Revokes presented refresh token, clears cookie |
| GET | `/me` | Current user (never includes password) |

### Workspaces — `/api/workspaces`
| Method | Route | Notes |
|---|---|---|
| POST | `/` | Creator becomes OWNER |
| GET | `/` | Caller's workspaces (cached) |
| GET | `/:id` | Cached detail |
| PATCH | `/:id` | OWNER/ADMIN |
| DELETE | `/:id` | OWNER only, cascades projects/tasks/messages/files |
| GET | `/:id/activity` | Paginated activity feed |
| POST | `/:id/members` | ADMIN+; body `{email, role: MEMBER\|ADMIN}` — never adds a second OWNER |
| PATCH | `/:id/members/:userId` | OWNER/ADMIN; last OWNER can't be demoted; only OWNER grants OWNER |
| DELETE | `/:id/members/:userId` | OWNER/ADMIN; OWNER can't be removed |

### Projects — `/api/projects`
POST `/` `{workspaceId,name,description}` · GET `/:param` (project id → detail, else workspace id → list) ·
PATCH/DELETE `/:id` (OWNER/ADMIN)

### Tasks — `/api/tasks`
POST `/` `{projectId,title,description,status,priority,assignedTo,dueDate}` ·
GET `/project/:projectId` (`?status=` filter) · GET `/:param` (task id → detail, else project id → list) ·
PATCH/DELETE `/:id` (delete: creator or ADMIN+)

### Comments — `/api/comments`
POST `/` `{taskId,content}` · GET `/:taskId` · PATCH/DELETE `/:id` (author or ADMIN+)

### Messages — `/api/messages`
GET `/:workspaceId` (`?limit`, `?before` cursor) · POST `/` `{workspaceId,content}`

### Files — `/api/files`
POST `/` (multipart `file` + `workspaceId`, ≤25MB → Cloudinary) ·
GET `/:workspaceId` · DELETE `/:id` (uploader or ADMIN+)

### Notifications — `/api/notifications`
GET `/` (`?unread=true`) · PATCH `/:id` (mark read) · PATCH `/read-all`

## Real-time (Socket.io)

Connect with `auth: { token: <accessToken> }`.

| Direction | Event | Payload |
|---|---|---|
| → | `join-workspace` | `{workspaceId}` (membership verified; ack `{ok}`) |
| → | `leave-workspace` | `{workspaceId}` |
| → | `chat:message` | `{workspaceId, content}` → persisted, broadcast |
| → | `typing:start` / `typing:stop` | `{workspaceId}` |
| → | `presence:heartbeat` | `{workspaceId}` |
| ← | `message:new` | Chat message |
| ← | `typing:update` | `{workspaceId, userId, name, typing}` |
| ← | `presence:update` | `{workspaceId, online: [...]}` |
| ← | `notification:new` | Personal room `user:<userId>` |
| ← | `task:created/updated/deleted/assigned/status-changed` | Task events |
| ← | `comment:added`, `project:created/updated/deleted`, `file:uploaded/deleted`, `member:added/removed/role-changed`, `workspace:deleted` | Resource events |

## Security

- bcrypt (12 rounds), passwords `select: false` and never serialized
- Short-lived access tokens (15m) + rotating refresh tokens (7d, httpOnly cookie, SHA-256 hash stored, reuse detection revokes all sessions)
- Workspace membership + role checks on every scoped route
- Redis-backed rate limiting (10 req/15min on auth endpoints, 300 req/15min general; in-memory fallback)
- helmet, CORS with credentials, 1MB JSON body limit, express-validator on writes
- Centralized error handler: consistent `{success:false,message}` JSON, no stack traces in production

## Testing

```bash
npm run smoke   # in-memory MongoDB: register→login→workspaces→projects→tasks→comments→chat→files(503)→socket round-trip→rate limits
```

Needs real MongoDB Atlas / Redis Cloud / Cloudinary credentials for full
integration testing of caching, rate limiting, and uploads.

The local demo seeder requires `DEMO_ACCOUNT_PASSWORD` to be set in the
environment. Use a private password and do not commit or log it.

## Deployment

- Backend: Render / Railway — set all env vars from `.env.example`
- Database: MongoDB Atlas · Redis: Redis Cloud · Files: Cloudinary
- Never commit `.env`
