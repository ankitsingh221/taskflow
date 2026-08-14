# TaskFlow — Distributed Job Queue System

A full-stack job queue platform with scheduling, priorities, dependencies, automatic retries with exponential backoff, a dead letter queue, and live monitoring.

**Stack:** Node.js · Express · PostgreSQL · Redis · BullMQ · React · Vite · Tailwind CSS · Docker

---

## Features

- **Job creation & scheduling** — submit jobs with priority (1–10), optional delay (up to 7 days), and arbitrary JSON payloads.
- **Dependencies** — express that a job may only start once other jobs have completed; dependent jobs are held in a `BLOCKED` state and released automatically.
- **Reliable processing** — a BullMQ worker processes the queue with up to **3 attempts** and **exponential backoff** (starting at 2s).
- **Dead letter queue (DLQ)** — jobs that exhaust all retries are permanently failed, flagged `isDeadLetter`, and can be retried from the UI or API.
- **Multiple workers** — any number of worker processes can run in parallel; each auto-registers a unique `worker-1`, `worker-2`, … ID.
- **Worker health monitoring** — heartbeats, `activeJobs` counters, and stale/stopped detection.
- **Cancellation** — a running job can be canceled mid-execution (the worker checks for cancellation before and during processing).
- **API dashboard** — React UI with pages for Jobs, Create Job, Job Details (activity timeline + attempt history), Queue Monitor, Workers, Metrics, and the Dead Letter Queue.
- **Production hardening** — health check endpoint, graceful shutdown, central error handler that never leaks internals, rate limiting on job creation, queue-full backpressure (HTTP 429), and CORS/Helmet security headers.

---

## Architecture

```
        ┌──────────────┐   HTTP    ┌──────────────────────────────┐
        │   React app  │ ─────────▶│       Express API            │
        │   (Vite)     │  JSON     │  controllers · routes        │
        └──────────────┘           │  rate limiter · health       │
                                   └──────┬──────────────┬────────┘
                                          │              │
                                    writes/reads   enqueues via
                                          │              │
                                   ┌──────▼──────┐  ┌────▼──────────┐
                                   │ PostgreSQL  │  │  Redis        │
                                   │ (jobs,      │  │ (BullMQ       │
                                   │  attempts,  │  │  "taskflow-   │
                                   │  workers)   │  │  queue")      │
                                   └──────▲──────┘  └────▲──────────┘
                                          │              │
                                   ┌──────┴──────────────┴──────┐
                                   │        Worker(s)           │
                                   │  process jobs · heartbeat  │
                                   │  retries · DLQ · cancel    │
                                   └────────────────────────────┘
```

The **API** owns the durable state (PostgreSQL) and pushes work into **BullMQ** (Redis). **Workers** pull jobs, record each attempt in PostgreSQL, update progress/status as they run, and re-queue failed jobs until retries run out — after which the job lands in the dead letter queue.

---

## Project structure

```
taskflow/
├── client/                        # React + Vite dashboard
│   ├── src/
│   │   ├── pages/                 # Dashboard, Jobs, CreateJob, JobDetails,
│   │   │                          # QueueMonitor, Workers, Metrics, DLQ
│   │   ├── components/            # jobs/, dashboard/, queue/, workers/, dlq/, layout/, ui/
│   │   ├── api/                   # axios instance + endpoint helpers
│   │   └── utils/                 # formatting, validation, job-activity helpers
│   ├── .env.example
│   └── vite.config.js
│
├── server/
│   ├── src/
│   │   ├── app.js                 # Express entry, middleware, /health, graceful shutdown
│   │   ├── config/                # database (pg Pool), prisma, redis connections
│   │   ├── routes/                # job, worker, metrics, dlq, dependency routes
│   │   ├── controllers/           # request/response handling
│   │   ├── services/              # business logic (jobs, attempts, dependencies,
│   │   │                          #   dlq, metrics, worker health)
│   │   ├── queues/                # BullMQ queue definition
│   │   ├── workers/               # job worker (processing, retries, DLQ)
│   │   ├── middleware/            # rate limiter
│   │   └── scripts/               # load test
│   ├── .env.example
│   └── package.json
│
├── docker-compose.yml             # postgres + redis + api + worker
└── readme.md
```

---

## Prerequisites

- **Node.js 18+**
- **PostgreSQL 14+** running locally (or a managed instance)
- **Redis 7+** running locally (or a managed instance, e.g. Redis Cloud)

> No local installs needed if you use `docker-compose up` (see below).

---

## Setup

### 1. Backend (API + worker)

```bash
cd server
npm install
cp .env.example .env    # then fill in your values
```

Start the **API**:

```bash
npm run dev             # or: npm start
```

Start one or more **workers** (one terminal each — each registers as a distinct worker):

```bash
npm run dev:worker      # or: npm run start:worker
```

The API serves on `http://localhost:5000` by default (`PORT` env var).

### 2. Frontend dashboard

```bash
cd client
npm install
cp .env.example .env    # set VITE_API_URL, e.g. http://localhost:5000
npm run dev             # http://localhost:5173
```

---

## Docker Compose (optional)

Runs PostgreSQL, Redis, the API, and a single worker together:

```bash
docker compose up --build
```

- API → `http://localhost:5000`
- Worker runs `npm run start:worker` with `WORKER_ID=worker-1`

---

## API Reference

Base URL: `http://localhost:5000`

### Health

| Method | Endpoint   | Description                                      |
| ------ | ---------- | ------------------------------------------------ |
| GET    | `/`        | Service banner                                   |
| GET    | `/health`  | `200` when DB + Redis are connected, `503` otherwise |

```json
{ "status": "ok", "database": "connected", "redis": "connected" }
```

### Jobs

| Method | Endpoint                | Description                                          |
| ------ | ----------------------- | ---------------------------------------------------- |
| POST   | `/api/jobs`             | Create a job (rate-limited, see env vars)            |
| GET    | `/api/jobs`             | List jobs (`?status=`, `?search=`, `?page=`, `?limit=`; `status=dlq` lists dead-letter jobs) |
| GET    | `/api/jobs/:id`         | Job detail                                           |
| GET    | `/api/jobs/:id/attempts`| Execution attempts                                   |
| POST   | `/api/jobs/:id/cancel`  | Cancel a job (running or pending)                    |

**Create a job — `POST /api/jobs`**

```json
{
  "name": "send-welcome-email",
  "data": { "userId": 42, "template": "welcome" },
  "priority": 5,
  "delay": 0,
  "dependsOn": ["<jobId>"]
}
```

| Field      | Required | Validation                                   |
| ---------- | -------- | -------------------------------------------- |
| `name`     | yes      | non-empty string                             |
| `data`     | no       | JSON object                                  |
| `priority` | no       | integer 1–10 (default 1; higher = first)     |
| `delay`    | no       | non-negative integer ms, ≤ 7 days            |
| `dependsOn`| no       | array of job IDs to wait on                  |

Returns `201` with the created job. Errors: `400` (validation), `409` (duplicate/conflict), `429` (rate limit or queue full).

**Job statuses:** `waiting`, `scheduled`, `blocked`, `processing`, `retrying`, `completed`, `failed`, `canceled` — plus `isDeadLetter` for jobs that exhausted their retries.

### Workers

| Method | Endpoint                | Description                        |
| ------ | ----------------------- | ---------------------------------- |
| GET    | `/api/workers`          | All registered workers + health    |
| GET    | `/api/workers/:workerId`| Single worker detail               |

Each worker reports `healthy` / `stale` (no recent heartbeat) / `stopped` status and its current `activeJobs`.

### Metrics

| Method | Endpoint       | Description                       |
| ------ | -------------- | --------------------------------- |
| GET    | `/api/metrics` | Aggregate queue/job/attempt stats |

### Dead letter queue

| Method | Endpoint                  | Description                                  |
| ------ | ------------------------- | -------------------------------------------- |
| GET    | `/api/dlq`                | List dead-letter jobs                        |
| POST   | `/api/dlq/:jobId/retry`   | Re-enqueue a dead-letter job                 |

Returns `404` if the job doesn't exist, `409` if the job is not in the DLQ.

### Dependencies

| Method | Endpoint                      | Description                       |
| ------ | ----------------------------- | --------------------------------- |
| GET    | `/api/dependencies/:jobId`    | List a job's dependencies         |
| POST   | `/api/dependencies/:jobId`    | Add a dependency                  |

---

## Environment variables

### Server (`server/.env`)

| Variable                 | Default  | Description                                    |
| ------------------------ | -------- | ---------------------------------------------- |
| `DATABASE_URL`           | —        | PostgreSQL connection string (required)        |
| `REDIS_HOST`             | —        | Redis host (required)                          |
| `REDIS_PORT`             | —        | Redis port                                     |
| `REDIS_USERNAME`         | —        | Redis username (if required)                   |
| `REDIS_PASSWORD`         | —        | Redis password (if required)                   |
| `REDIS_TLS`              | `false`  | `"true"` to enable TLS for Redis (e.g. Redis Cloud) |
| `PORT`                   | `5000`   | API port                                       |
| `WORKER_CONCURRENCY`     | `1`      | Jobs processed concurrently per worker         |
| `WORKER_ID`              | auto     | Fixed worker ID; when unset, workers auto-assign the next sequential `worker-N` |
| `RATE_LIMIT_WINDOW_MS`   | `60000`  | Rate-limit window for `POST /api/jobs`         |
| `RATE_LIMIT_MAX_REQUESTS`| `100`    | Max job creations per window                   |
| `MAX_QUEUE_SIZE`         | `100`    | Max waiting jobs before the API returns `429`  |

### Client (`client/.env`)

| Variable       | Description                          |
| -------------- | ------------------------------------ |
| `VITE_API_URL` | Base URL of the backend API          |

---

## How a job flows through the system

1. `POST /api/jobs` validates the input, stores the job in **PostgreSQL**, and adds it to the **BullMQ** queue with priority, delay, and up to **3 attempts** with exponential backoff.
2. If `dependsOn` jobs haven't completed, the job starts as `blocked` and waits.
3. A **worker** picks up the job, records an attempt, and executes it. Successful jobs move to `completed` with progress tracked through `100%`.
4. If the processor throws, the job becomes `retrying` and is re-scheduled with exponential backoff. After the 3rd failed attempt it becomes `failed` with `isDeadLetter: true`.
5. You can **cancel** a pending/running job, or **retry** a dead-letter job from the DLQ page/API.

### Testing failure → DLQ

Send `data` containing a `shouldFail` flag and the worker will throw on every attempt:

```bash
curl -X POST http://localhost:5000/api/jobs \
  -H "Content-Type: application/json" \
  -d '{ "name": "boom", "data": { "shouldFail": true } }'
```

---

## Load testing

The server ships a load test script that hammers the create-job endpoint:

```bash
cd server
npm run load:test        # env: LOAD_TEST_JOBS (100), LOAD_TEST_CONCURRENCY (10), API_URL
```

---

## Deployment

The API, worker, and dashboard can be deployed independently (e.g. on **Render**):

- **API** — `npm start`; must be reachable by both the dashboard and the worker.
- **Worker** — `npm run start:worker` as a separate service (scale it to add processing capacity; each instance registers as `worker-N`).
- **Dashboard** — static build via `npm run build`; set `VITE_API_URL` at build time to point at the deployed API.

The `/health` endpoint reports service readiness (DB + Redis) and is what you can point an uptime monitor at.

---

## Scripts

| Location  | Script               | Description                            |
| --------- | -------------------- | -------------------------------------- |
| `server`  | `npm run dev`        | Start API with nodemon                 |
| `server`  | `npm start`          | Start API                              |
| `server`  | `npm run dev:worker` | Start a worker with nodemon            |
| `server`  | `npm run start:worker` | Start a worker                      |
| `server`  | `npm run load:test`  | Run the job-creation load test         |
| `client`  | `npm run dev`        | Start Vite dev server                  |
| `client`  | `npm run build`      | Production build                       |
| `client`  | `npm run preview`    | Preview the production build           |
| `client`  | `npm run lint`       | Run ESLint                             |
