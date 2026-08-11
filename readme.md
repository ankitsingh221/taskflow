# TaskFlow - Distributed Job Queue System

TaskFlow is a distributed job queue system built with Node.js, Express, PostgreSQL, Redis, and React.

> **Status:** Phase 0 - Project Foundation (health checks + dashboard skeleton). Job processing is not implemented yet.

## Project Structure

```
taskflow/
├── server/
│   ├── src/
│   │   ├── config/
│   │   │   └── index.js          # Environment/configuration
│   │   ├── database/
│   │   │   └── index.js          # PostgreSQL connection (pg Pool)
│   │   ├── redis/
│   │   │   └── index.js          # Redis connection
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   │   ├── index.js      # Router aggregator
│   │   │   │   └── health.js     # /health endpoints
│   │   │   └── controllers/
│   │   │       └── healthController.js
│   │   ├── services/             # Service layer (future job logic)
│   │   └── app.js                # Express entry point
│   └── package.json
│
├── dashboard/
│   ├── src/
│   │   ├── App.jsx               # System status view
│   │   ├── main.jsx
│   │   └── index.css
│   └── package.json
│
├── .env.example
├── .gitignore
└── README.md
```

## Prerequisites

- Node.js 18+
- PostgreSQL running on `localhost:5432` (database `taskflow`)
- Redis running on `localhost:6379`

## Setup

### 1. Environment variables

Copy `.env.example` to `.env` in the project root and adjust credentials if needed:

```bash
cp .env.example .env
```

### 2. Install dependencies

```bash
cd server
npm install
```

```bash
cd dashboard
npm install
```

## Running

Start the backend (defaults to `http://localhost:3000`):

```bash
cd server
npm run dev
```

Start the dashboard (defaults to `http://localhost:5173`):

```bash
cd dashboard
npm run dev
```

## Health checks

Backend endpoints:

```
GET /health       → { "status": "ok", "service": "api" }
GET /health/db    → { "status": "ok", "database": "connected" }      (503 on failure)
GET /health/redis → { "status": "ok", "redis": "connected" }         (503 on failure)
```

## How the components communicate

- The **dashboard** (React + Vite) fetches the health endpoints via HTTP from the **Express API** (`VITE_API_URL`, default `http://localhost:3000`).
- The **API** delegates dependency checks to dedicated modules: `database/index.js` runs `SELECT 1` against **PostgreSQL**, and `redis/index.js` runs `PING` against **Redis**.
- Controllers keep route logic thin and never talk to Postgres/Redis directly; they call the database/redis modules. All config (ports, credentials) comes from environment variables loaded in `config/index.js`.