# TaskFlow 🚀

**Distributed Job Queue & Background Processing System**

TaskFlow is a distributed background job processing system designed to schedule, execute, monitor, retry, and recover asynchronous jobs using multiple workers.

The project demonstrates practical distributed-systems concepts including job queues, worker concurrency, retries, failure recovery, Dead Letter Queues, job dependencies, idempotency, rate limiting, backpressure, monitoring, and multiple worker processes for horizontal processing capacity.

---

## 🌐 Live Demo

- **Frontend:** [Clcick me](https://taskflow-frontend-zeei.onrender.com/)
- **Backend API:** [Click me](https://taskflow-api-2ube.onrender.com/)

---

## 📸 Screenshots

### 📊 Dashboard

![TaskFlow Dashboard](images/dashBoard.png)

### ➕ Create Job

![Create Job](images/createJobPage.png)

### 📋 Jobs

![Jobs](images/jobPage.png)

### 👷 Workers

![Workers](images/workersPage.png)

### 📈 Queue Monitoring

![Queue Monitoring](images/Queue_monitor.png)

### 📊 Metrics

![Metrics](images/metricesPage.png)

### 💀 Dead Letter Queue

![Dead Letter Queue](images/dlqPage.png)

---


## 🎯 Problem

In a traditional web application, a long-running operation may be processed directly inside an API request:

```
Client
   │
   ▼
API Server
   │
   ▼
Long-running Task
   │
   ▼
Response
```

This can cause:

- slow API responses
- poor failure recovery
- difficult retry handling
- limited processing capacity
- jobs being lost when application processes fail
- difficulty scaling background workloads

TaskFlow separates job submission from job execution:

```
Client
   │
   ▼
Express API
   │
   ▼
Redis / BullMQ
   │
   ▼
Workers
   │
   ▼
Job Processing
   │
   ▼
PostgreSQL
```

The API can accept work while independent workers process jobs asynchronously.

---

## 🏗️ System Architecture

```
                    ┌──────────────────┐
                    │   React Client   │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │   Express API    │
                    └───────┬───┬──────┘
                            │   │
                 ┌──────────┘   └──────────┐
                 ▼                         ▼
          ┌──────────────┐          ┌──────────────┐
          │  PostgreSQL  │          │ Redis/BullMQ │
          │    Prisma    │          └──────┬───────┘
          └──────────────┘                 │
                              ┌────────────┼────────────┐
                              ▼            ▼            ▼
                          Worker 1     Worker 2     Worker 3
```

The API writes application data directly to PostgreSQL and pushes jobs onto the Redis/BullMQ queue. Workers act as independent consumers, pulling jobs off that queue and processing them asynchronously.

### Core components

| Component | Responsibility |
|---|---|
| React + Vite | Web dashboard |
| Node.js + Express | REST API |
| PostgreSQL | Persistent job/application data |
| Prisma | Database access |
| Redis | Queue infrastructure |
| BullMQ | Job scheduling and processing |
| Workers | Background job execution |
| Docker | Local infrastructure |
| Render | Production deployment |

---

## ✨ Features

### Job Processing
- Create jobs
- Job status tracking
- Progress tracking
- Priority-based processing
- Delayed jobs
- Job cancellation

### Reliability
- Automatic retries
- Configurable maximum attempts
- Attempt history
- Dead Letter Queue
- Failure recovery
- Worker crash recovery

### Distributed Processing
- Multiple workers
- Configurable worker concurrency
- Parallel job processing
- Worker health monitoring

### Workflow Processing
- Job dependencies
- Multiple dependencies
- Dependency failure propagation
- Circular dependency prevention

### Duplicate Prevention
- Idempotency
- Duplicate job prevention

### Traffic Control
- Rate limiting
- Backpressure

### Monitoring
- Queue metrics
- Worker health
- Job progress
- Job attempts
- Failure tracking
- DLQ monitoring

### Validation & Testing
- API testing
- Failure testing
- Worker crash testing
- Concurrency testing
- Multi-worker testing
- Load testing

---

## 🔄 Job Lifecycle

A normal job follows this flow:

```
                    ┌───────────┐
                    │  Created  │
                    └─────┬─────┘
                          │
                          ▼
                    ┌───────────┐
                    │  Waiting  │
                    └─────┬─────┘
                          │
                          ▼
                    ┌───────────┐
                    │   Active  │
                    └─────┬─────┘
                          │
                    ┌─────┴─────┐
                    │           │
                    ▼           ▼
                Successful    Failed
                    │           │
                    ▼           ▼
                Completed     Retry
                                │
                         ┌──────┴──────┐
                         │             │
                         ▼             ▼
                     Success     Attempts Exhausted
                         │             │
                         ▼             ▼
                    Completed         DLQ
```

Delayed jobs additionally wait for their scheduled execution time before entering the processing flow.

---

## 🔁 Retry & Dead Letter Queue

TaskFlow retries failed jobs according to their configured attempt limit.

**Example:**

```
Attempt 1
   │
   └── Failed
         ↓
Attempt 2
   │
   └── Failed
         ↓
Attempt 3
   │
   └── Failed
         ↓
   Attempts Exhausted
         ↓
        DLQ
```

**Verified failure test**

A failure test intentionally generated:

```
Attempts:        3 / 3
Final status:    failed
Dead Letter:     true
Completed:       false
```

The job was not incorrectly marked as completed after exhausting its retry attempts.

---

## 👷 Multiple Workers & Concurrency

TaskFlow supports multiple worker processes for horizontal processing capacity, as well as per-worker concurrency.

For example:

```
                  Redis / BullMQ
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
       Worker 1     Worker 2     Worker 3
       Concurrency  Concurrency  Concurrency
           3            3            3
```

This provides a total observed processing concurrency of:

```
3 workers × 3 concurrency = 9 concurrent jobs
```

---

## 📈 Load Testing Results

Load testing was performed to evaluate how worker count and concurrency affect processing time.

### 100 Jobs

| Workers | Concurrency | Jobs | Completion |
|---|---|---|---|
| 1 | 1 | 100 | 11.21 min |
| 1 | 3 | 100 | 4.02 min |
| 3 | 1 | 100 | ~4 min |
| 3 | 3 | 100 | 1.17 min |

**What the results demonstrate**

Increasing concurrency on a single worker reduced completion time from:

```
11.21 min → 4.02 min
```

Using three workers at concurrency 1 produced approximately:

```
11.21 min → ~4 min
```

Using both multiple workers and higher concurrency reduced the observed completion time further:

```
3 workers × 3 concurrency
              ↓
         1.17 minutes
```

This demonstrates the practical effect of parallel background processing.

> These are observed test results rather than theoretical throughput guarantees.

---

## 🚀 500-Job Load Test

A larger test was performed with:

```
Jobs:                500
Request concurrency: 20
Workers:             3
Worker concurrency:  1
```

### Submission

```
Successfully submitted: 500 / 500
Failed requests:        0
Submission duration:    1.54 sec
Request throughput:     325.52 jobs/sec
```

### Processing

```
Total completion time:      20.09 minutes
Average processing time:    7.656 sec
Average queue latency:      214.326 sec
Observed waiting jobs:      494
```

### Worker health

```
Healthy workers: 3
Stale workers:   0
Stopped workers: 0
```

### Result

**PASS**

All 500 job submission requests succeeded, and the three workers remained healthy during the observed test.

> 325.52 jobs/sec represents job submission throughput, not worker processing throughput.

---

## 💥 Worker Crash Recovery

TaskFlow was explicitly tested against worker failure.

**Test**

```
Workers:             2
Worker concurrency:  1
```

- A long-running job was started by Worker 1.
- Worker 1 was intentionally crashed while the job was active.
- The remaining worker detected and recovered the interrupted job.

**Result**

```
Attempt 1 → Worker 1 crashed
              ↓
         Job recovered
              ↓
Attempt 2 → Worker 2
              ↓
          Completed
```

Verified:

```
Status:       completed
Attempts:     2
Progress:     100%
Dead Letter:  false
Job lost:     false
```

This demonstrates that an active job can be recovered by another healthy worker after a worker failure.

---

## 🛑 Job Cancellation

TaskFlow supports cancellation of jobs during processing.

A running job was canceled intentionally.

Verified behavior:

```
Job started
    ↓
Cancellation requested
    ↓
Worker detected cancellation
    ↓
Processing stopped
    ↓
Job → canceled
    ↓
Attempt → canceled
```

The canceled job:

```
Retry:       No
DLQ:         No
Attempts:    1
Dead Letter: false
```

This prevents user-canceled work from being unnecessarily retried.

---

## 🔗 Job Dependencies

TaskFlow supports dependent jobs.

**Example:**

```
Job A
  │
  ▼
Job B
  │
  ▼
Job C
```

A job with multiple dependencies remains blocked until all of its required dependencies are satisfied:

```
Job A
 ├──→ Job B
 └──→ Job C
        │
        ▼
      Job D
```

A dependent job remains blocked until its required dependencies are satisfied.

The system also handles:

- single dependencies
- multiple dependencies
- dependency failure propagation
- circular dependency prevention

---

## 🔐 Idempotency

TaskFlow implements idempotency to prevent duplicate logical jobs when clients retry requests.

Conceptually:

```
Incoming Request
       │
       ▼
Idempotency Key
       │
   ┌───┴────┐
   │        │
Exists     New
   │        │
   ▼        ▼
Existing   Create
Job        Job
```

This is useful in distributed systems where a client may retry a request because of a timeout or temporary network failure.

---

## 🚦 Rate Limiting & Backpressure

TaskFlow includes rate limiting on job creation and queue backpressure mechanisms.

The processing pipeline can be viewed as:

```
Incoming Requests
        │
        ▼
   Rate Limiting
        │
        ▼
     Job Queue
        │
        ▼
      Workers
```

Rate limiting controls incoming job-creation traffic, while backpressure helps prevent the processing pipeline from being overwhelmed by workloads exceeding available worker capacity.

---

## 📊 Monitoring

TaskFlow provides a dashboard for observing the system.

The monitoring layer exposes information including:

**Jobs**
- total jobs
- waiting jobs
- active jobs
- completed jobs
- failed jobs
- retrying jobs
- canceled jobs
- dead-letter jobs
- blocked jobs

**Queue**
- waiting jobs
- prioritized jobs
- active jobs
- failed jobs
- delayed jobs
- queue state

**Performance**
- average processing time
- average queue latency

**Attempts**
- total attempts
- failed attempts
- completed attempts

**Workers**
- healthy workers
- stale workers
- stopped workers
- total workers

---

## 🧪 Testing

TaskFlow was validated through API, worker, failure, concurrency, and load testing.

### Tested flows

**Successful processing**
```
Create
  ↓
Queue
  ↓
Worker
  ↓
Process
  ↓
Progress
  ↓
Complete
```

**Retry and DLQ**
```
Create
  ↓
Failure
  ↓
Retry
  ↓
Failure
  ↓
Attempts exhausted
  ↓
DLQ
```

**Worker failure**
```
Worker 1
   ↓
Crash
   ↓
Job recovered
   ↓
Worker 2
   ↓
Completed
```

**Cancellation**
```
Create
  ↓
Processing
  ↓
Cancel
  ↓
Canceled
```

**Multi-worker processing**
```
Queue
 ├── Worker 1
 ├── Worker 2
 └── Worker 3
```

### Load testing

Tested configurations included:

- 1 worker × 1 concurrency
- 1 worker × 3 concurrency
- 3 workers × 1 concurrency
- 3 workers × 3 concurrency
- 500-job workload with 3 workers

---

## 🛠️ Tech Stack

**Frontend**
- React
- Vite
- JavaScript
- CSS

**Backend**
- Node.js
- Express.js
- JavaScript ES Modules

**Database**
- PostgreSQL
- Prisma ORM

**Queue Infrastructure**
- Redis
- BullMQ
- ioredis

**Infrastructure & Deployment**
- Docker
- Docker Compose
- Render

**Development & Testing**
- Git
- GitHub
- Postman

---

## 📁 Project Structure

```
TaskFlow/
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── ...
│   │   └── index.css
│   └── package.json
│
├── server/
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── workers/
│   │   ├── middleware/
│   │   └── ...
│   ├── prisma/
│   └── package.json
│
├── docs/
│
├── docker-compose.yml
├── README.md
└── .gitignore
```
---

## 🚀 Local Development

### Prerequisites

- Node.js
- Docker Desktop
- Git

### Clone

```bash
git clone YOUR_REPOSITORY_URL
cd TaskFlow
```

### Backend

```bash
cd server
npm install
```

Create a `.env` file:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/taskflow

REDIS_HOST=localhost
REDIS_PORT=6379

PORT=5000

WORKER_CONCURRENCY=3
```

### Start PostgreSQL & Redis

From the project root:

```bash
docker compose up -d
```

### Database

```bash
npx prisma migrate dev
```

> Replace this with the exact Prisma command(s) your project actually uses (e.g. `migrate deploy` if the database is already migrated).

### Start Backend

```bash
npm run dev
```

### Start Worker

In another terminal:

```bash
npm run start:worker
```

### Frontend

```bash
cd client
npm install
```

Create the frontend environment file:

```env
VITE_API_URL=http://localhost:5000
```

Then start:

```bash
npm run dev
```

---

## 🌍 Production Deployment

TaskFlow is deployed using Render.

```
                     ┌────────────────────┐
                     │      Frontend      │
                     │       Render       │
                     └─────────┬──────────┘
                               │
                               ▼
                     ┌────────────────────┐
                     │      Backend       │
                     │       Render       │
                     └─────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    ▼                     ▼
             ┌──────────────┐      ┌──────────────┐
             │  PostgreSQL  │      │    Redis     │
             └──────────────┘      └──────┬───────┘
                                          │
                                          ▼
                                    ┌────────────┐
                                    │   Worker   │
                                    └────────────┘
```

The production frontend communicates with the deployed backend through:

```
VITE_API_URL
```
---

## 🔒 Production Hardening

The backend was audited for production readiness, including:

- environment-based configuration
- CORS configuration
- consistent error handling
- input validation
- job ID validation
- cancellation behavior
- rate limiting
- database error handling
- Redis/BullMQ error handling
- graceful shutdown
- health checks
- logging
- HTTP status codes
- security headers
- production configuration
- secret exposure
- accidental debug logging
---

## 📡 Example API

### Create a Job

`POST /jobs`

```json
{
  "name": "send-email",
  "data": {
    "email": "user@example.com"
  },
  "priority": 5,
  "delay": 30
}
```

The API places the job into the BullMQ queue, where an available worker processes it asynchronously.

---

## 🎓 Engineering Concepts Demonstrated

TaskFlow demonstrates practical concepts used in distributed backend systems:

- asynchronous processing
- producer-consumer architecture
- distributed workers
- horizontal scaling
- concurrency
- retries
- failure recovery
- Dead Letter Queues
- idempotency
- dependency management
- rate limiting
- backpressure
- health monitoring
- queue monitoring
- graceful shutdown
- load testing

---



## 📌 Project Status

**Completed ✅**

TaskFlow currently includes:

- asynchronous job processing
- delayed jobs
- job priorities
- cancellation
- multiple workers
- configurable concurrency
- rate limiting
- backpressure
- retries
- Dead Letter Queue
- attempt history
- job dependencies
- idempotency
- worker health monitoring
- queue metrics
- failure recovery
- load testing
- production hardening
- production deployment
- monitoring dashboard

---

## 👨‍💻 Author

**Ankit Kumar**
---
