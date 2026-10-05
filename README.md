# SyncSpace

![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-black?logo=express&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-realtime-010101?logo=socket.io&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow)

## 🌐 Live Demo

🚀 **[Visit SyncSpace](https://syncspace0.netlify.app/)**

## About SyncSpace

**SyncSpace** is a real-time collaborative workspace for teams — the core ideas of Trello, Slack, and Google Drive in one app.

Teams create **workspaces**, invite members with roles, manage **projects**, track work on **Kanban boards**, **chat in real time**, comment on tasks, **share files**, and get **real-time notifications** — all backed by a workspace activity feed.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Screens](#screens)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Architecture](#architecture)
- [Database Design](#database-design)
- [API Documentation](#api-documentation)
- [Authentication](#authentication)
- [Role Based Access control](#role-based-access-control)
- [Real-time Architecture](#real-time-architecturesocketio)
- [Redis Usage](#redis-usage)
- [File Upload Architecture](#file-upload-architecture)
- [Testing](#testing)
- [Deployment](#deployment)
- [Future Improvements](#future-improvements)
- [License](#license)

## Features

- **Authentication** — registration, login, logout, JWT access tokens (15 min) + rotating refresh tokens (7 days, httpOnly cookie), bcrypt password hashing, reuse-detection that revokes all sessions
- **Workspaces** — create, rename, delete; invite/remove members; role management (OWNER / ADMIN / MEMBER)
- **Projects** — CRUD inside workspaces
- **Tasks** — CRUD, assignment, statuses (TODO / IN_PROGRESS / COMPLETED), priorities (LOW / MEDIUM / HIGH), due dates, descriptions
- **Kanban board** — drag-and-drop between columns with optimistic UI and server reconciliation
- **Real-time chat** — workspace rooms, typing indicators, online presence; messages persisted in MongoDB
- **Task comments** — add / edit / delete with permission checks
- **Files** — upload via Cloudinary (metadata only in MongoDB), list, download, delete
- **Notifications** — persisted + pushed live over Socket.io; read/unread state, mark-all-read
- **Activity feed** — workspace-scoped log of membership, project, task, file, and comment events, with filters
- **Team management** — member list, roles & permissions matrix, invite via email or shareable link
- **Profile** — edit name/bio, upload profile photo (Cloudinary), tabs for Personal Info / Security / Preferences
- **Settings** — two-panel layout with notification preferences (persisted per device)
- **Redis** — caching with TTL + invalidation, and Redis-backed rate limiting (graceful in-memory fallback)
- **Security** — helmet, CORS, input validation, centralized error handling, RBAC on every resource

## Tech stack

| Layer    | Technology |
|----------|------------|
| Backend  | Node.js, Express 4, Mongoose (MongoDB), ioredis, Socket.io, jsonwebtoken, bcryptjs, Cloudinary, multer, helmet, express-validator |
| Frontend | React 18 (Vite), Redux Toolkit, React Router, Axios, Tailwind CSS v3, Socket.io-client, @dnd-kit |
| Infra    | MongoDB Atlas, Redis Cloud, Cloudinary, Render/Railway (API), Vercel (web) |

## Screens

| Route | Screen |
|---|---|
| `/` | Dashboard — workspace/project/task stats, recent projects |
| `/workspaces` | Workspaces list |
| `/workspaces/:id` | Workspace details |
| `/projects` | Projects list |
| `/projects/:id` | Project details + Kanban board |
| `/tasks` | Tasks (My Tasks) |
| `/calendar` | Calendar — tasks by due date |
| `/messages` | Team Chat — workspace channels |
| `/files` | Workspace Files — table with uploader, size, date |
| `/team` | Team Overview — members, roles matrix |
| `/team/invite` | Invite Members — email + shareable link |
| `/activity` | Activity Feed — filterable event log |
| `/notifications` | Notifications — All / Unread / Mentions |
| `/profile` | Profile — edit info, upload photo |
| `/settings` | Settings — notification preferences |

## Architecture

```
React (Vite)
  ├─ Axios ─────────────▶ Express ─▶ Routes ─▶ Middleware (auth, RBAC, rate-limit, validate)
  │                                                   ─▶ Controllers ─▶ Services
  │                                                                        ├─ MongoDB (source of truth)
  │                                                                        ├─ Redis (cache + rate limits)
  │                                                                        └─ Cloudinary (file bytes)
  └─ Socket.io-client ──▶ Socket.io server ─▶ workspace:<id> rooms + user:<id> rooms
                                                   └─ MongoDB (messages/notifications persisted first, then broadcast)
```

**Data flow for a task update:** Client → REST API → Controller → MongoDB → Socket.io event → all connected workspace members (no refresh needed).

**Data flow for chat:** Client → Socket.io → persist Message in MongoDB → broadcast `message:new` to `workspace:<id>` room.

## Database design

MongoDB with Mongoose. All models use timestamps and ObjectId references.

| Model        | Key fields |
|--------------|------------|
| User         | name, email (unique), password (hashed, never returned), avatar, bio, refreshTokens[] (hashed) |
| Workspace    | name, owner, members[{ user, role }] |
| Project      | workspace, name, description, createdBy |
| Task         | project, title, description, status, priority, assignedTo, dueDate, createdBy |
| Message      | workspace, sender, content |
| Comment      | task, author, content |
| File         | workspace, uploadedBy, filename, url, publicId, size |
| Activity     | workspace, user, action, entityType, entityId |
| Notification | user, type, message, read, relatedEntity |
| Invite       | workspace, email, role, token, expiresAt, maxUses |

Indexes on frequently queried fields (workspace, project, task, user lookups).

## API documentation

Base URL: `/api`. All responses are `{ success, message, data }`. Protected routes need `Authorization: Bearer <accessToken>`.

**Auth** — `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`, `PUT /auth/profile`, `POST /auth/avatar` (multipart)
**Workspaces** — `POST /workspaces`, `GET /workspaces`, `GET /workspaces/:id`, `PATCH /workspaces/:id`, `DELETE /workspaces/:id`, `GET /workspaces/:id/activity`
**Members** — `POST /workspaces/:id/members`, `PATCH /workspaces/:id/members/:userId`, `DELETE /workspaces/:id/members/:userId`
**Projects** — `POST /projects`, `GET /projects/:workspaceId`, `GET /projects/:id`, `PATCH /projects/:id`, `DELETE /projects/:id`
**Tasks** — `POST /tasks`, `GET /tasks/:projectId`, `GET /tasks/:id`, `PATCH /tasks/:id`, `DELETE /tasks/:id`
**Messages** — `GET /messages/:workspaceId`, `POST /messages`
**Comments** — `POST /comments`, `GET /comments/:taskId`, `PATCH /comments/:id`, `DELETE /comments/:id`
**Files** — `POST /files` (multipart), `GET /files/:workspaceId`, `DELETE /files/:id`
**Notifications** — `GET /notifications`, `PATCH /notifications/:id`, `PATCH /notifications/read-all`
**Invites** — `POST /invites`, `GET /invites/:token`, `POST /invites/:token/accept`
**Users** — `GET /users`, `GET /users/stats`, `PATCH /users/:id/role`

## Authentication

- **Access token**: JWT, 15-minute expiry, sent as `Authorization: Bearer`.
- **Refresh token**: JWT, 7-day expiry, stored in an httpOnly cookie. Only a SHA-256 hash is kept server-side (max 5 sessions per user).
- **Rotation**: every refresh issues a new pair and replaces the stored hash. If a refresh token is reused (valid signature but unknown hash), all sessions for that user are revoked.
- **Frontend**: an Axios interceptor retries once via `/auth/refresh` on 401, then logs out and redirects to login.

## Role Based Access control

| Capability | OWNER | ADMIN | MEMBER |
|---|---|---|---|
| Full workspace control | ✅ | — | — |
| Manage members / roles | ✅ | ✅ | — |
| Manage projects & tasks | ✅ | ✅ | ✅ (own workspace) |
| Delete workspace | ✅ | — | — |

Every workspace-scoped request passes through membership verification middleware: `JWT → identify user → workspace membership check → role check → controller`. Non-members get 403; missing resources get 404. Owners cannot be removed or demoted by admins, and there is always at least one owner.

## Real-time architecture (Socket.io)

- Handshake authenticated via JWT (`socket.handshake.auth.token`).
- Rooms: `workspace:<workspaceId>` (DB membership verified before join) and `user:<userId>` (personal notifications).
- Client emits: `join-workspace`, `leave-workspace`, `chat:message`, `typing:start`, `typing:stop`.
- Server emits: `message:new`, `typing:update`, `presence:update`, `task:created`, `task:updated`, `task:deleted`, `task:assigned`, `task:status-changed`, `comment:added`, `notification:new`.
- Persistent data (messages, notifications) is written to MongoDB first; Socket.io only delivers.

## Redis usage

- **Caching** (`services/cacheService.js`): workspace, project, and task reads are cached with TTL; writes invalidate the relevant keys. MongoDB remains the source of truth.
- **Rate limiting** (`middleware/rateLimiter.js`): Redis-backed buckets — strict on `/api/auth/*` (10 req / 15 min per IP), general API limit of 300 req / 15 min per IP, 429 with `Retry-After`.
- **Graceful degradation**: if Redis is unreachable, caching is skipped and rate limiting falls back to an in-memory store; the API keeps serving.

## File upload architecture

```
Client (multipart) → Express (multer, 25 MB cap, memory storage)
  → Cloudinary upload_stream → URL returned
  → MongoDB stores { filename, url, publicId, size, uploadedBy, workspace }
```

File bytes never touch MongoDB. If Cloudinary is not configured, uploads fail with a clear 503. Deletes remove both the Cloudinary asset and the metadata.

Profile photos use the same pipeline (`POST /api/auth/avatar`), cropped to 256×256 on upload.

## Quick Start

**Prerequisites:** Node.js 20+, MongoDB (Atlas or local), Redis (Cloud or local, optional — degrades gracefully), Cloudinary account (optional — uploads disabled without it).

```bash
# Backend
cd server
cp .env.example .env   # fill in values (see below)
npm install
npm run dev            # or: npm start

# Frontend
cd client
cp .env.example .env   # set VITE_API_URL
npm install
npm run dev            # or: npm run build for production
```

1. Start MongoDB (or set `MONGODB_URI` to Atlas).
2. `cd server && npm run dev` — API on `:5000`.
3. `cd client && npm run dev` — web app on `:5173` (set `VITE_API_URL=http://localhost:5000/api`).
4. Register two users in two browsers/incognito windows, create a workspace, invite the second user by email, and watch tasks/chat update live.

## Environment Variables

**Backend (`server/.env`):**

| Variable | Required | Purpose |
|---|---|---|
|---|---|---|
| `MONGODB_URI` | ✅ | MongoDB connection string |
| `JWT_ACCESS_SECRET` | ✅ | Signs access tokens |
| `JWT_REFRESH_SECRET` | ✅ | Signs refresh tokens |
| `DEMO_ACCOUNT_PASSWORD` | Local seeding only | Private password required by `npm run seed:demo` |
| `REDIS_URL` | — | Redis connection (caching + rate limiting; optional) |
| `CLOUDINARY_CLOUD_NAME` | — | File uploads (optional) |
| `CLOUDINARY_API_KEY` | — | File uploads (optional) |
| `CLOUDINARY_API_SECRET` | — | File uploads (optional) |
| `CLIENT_URL` | ✅ | CORS origin + socket origin |
| `PORT` | — | API port (default 5000) |
| `NODE_ENV` | — | `production` hides stack traces |

**Frontend (`client/.env`):**

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Backend API base (default `http://localhost:5000/api`) |
| `VITE_SOCKET_URL` | Socket.io URL (default same as API host) |

Never commit `.env` files.

## Testing

- **Backend smoke suite** (`cd server && npm run smoke`): spins up in-memory MongoDB 7 + real HTTP + real Socket.io clients, covering auth (incl. refresh rotation + reuse revocation), the role matrix, member-management rules, project/task/comment CRUD, assignment notifications, message pagination, activity feed, notifications read-all, file-upload 503 path, two-client chat/typing/presence round-trip, non-member socket-join rejection, and rate-limit 429s.
- **Backend route audit** (`node scripts/audit.js`, no DB needed): full route table vs spec, validation 400s, 401s, 404 shape, rate-limit headers.
- **Frontend**: `npm run build` — 0 errors, 0 warnings. All screens browser-verified (desktop 1280px + mobile 390px) with zero page errors.

Not yet exercised against live services: Redis-backed caching/rate limiting, Cloudinary upload/delete, and MongoDB Atlas networking (needs real credentials).

## Deployment

- **Frontend** → Vercel (`client/`), set `VITE_API_URL` / `VITE_SOCKET_URL` to the API URL.
- **Backend** → Render or Railway (`server/`), set all production env vars above.
- **Database** → MongoDB Atlas. **Redis** → Redis Cloud. **Files** → Cloudinary.

## Future improvements

- Password change flow
- File previews and drag-and-drop uploads
- Task labels, subtasks, and search
- Dark mode
- End-to-end tests with live Redis + Cloudinary
- CI pipeline running smoke + audit on every push

## License

MIT — free to use, modify, and distribute.
