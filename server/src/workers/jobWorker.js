import "dotenv/config";
import IORedis from "ioredis";
import { Worker, UnrecoverableError } from "bullmq";

import prisma from "../config/prisma.js";
import { resolveDependents } from "../services/dependencyService.js";

import {
  registerWorker,
  startHeartbeat,
  stopHeartbeat,
  incrementActiveJobs,
  decrementActiveJobs,
  WORKER_STATUS,
} from "../services/workerHealthService.js";

const QUEUE_NAME = "taskflow-queue";

/*
 * Resolve the candidate worker identifier.
 *
 * An explicit WORKER_ID (env var) always wins.
 *
 * Otherwise assign the next sequential number based
 * on already-registered workers:
 *
 *   worker-1, worker-2, worker-3, ...
 *
 * This lets multiple `npm run start:worker` terminals
 * register as distinct workers automatically.
 */
async function nextWorkerNumber() {
  const workers = await prisma.worker.findMany({
    select: {
      workerId: true,
    },
  });

  const maxNumber = workers.reduce((max, worker) => {
    const match = String(worker.workerId).match(/^worker-(\d+)$/);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);

  return maxNumber + 1;
}

/*
 * Claim the next sequential worker ID atomically.
 *
 * Uses a plain create so the DB unique constraint
 * guarantees that two workers starting at the same
 * time NEVER share the same worker ID.
 */
async function claimWorkerId(concurrency) {
  let number = await nextWorkerNumber();

  for (;;) {
    const workerId = `worker-${number}`;

    try {
      await prisma.worker.create({
        data: {
          workerId,
          status: WORKER_STATUS.HEALTHY,
          startedAt: new Date(),
          lastHeartbeat: new Date(),
          activeJobs: 0,
          concurrency,
          stoppedAt: null,
        },
      });

      return workerId;
    } catch (err) {
      if (err.code === "P2002") {
        number += 1;
        continue;
      }

      throw err;
    }
  }
}

const CONCURRENCY =
  Number(process.env.WORKER_CONCURRENCY || 1);

const WORKER_ID =
  process.env.WORKER_ID || (await claimWorkerId(CONCURRENCY));

let heartbeatTimer = null;

const STATUS = {
  ACTIVE: "active",
  COMPLETED: "completed",
  FAILED: "failed",
  RETRYING: "retrying",
  CANCELED: "canceled",
};

const connection = new IORedis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),

  ...(process.env.REDIS_USERNAME && {
    username: process.env.REDIS_USERNAME,
  }),

  ...(process.env.REDIS_PASSWORD && {
    password: process.env.REDIS_PASSWORD,
  }),

  ...(process.env.REDIS_TLS === "true" && {
    tls: {},
  }),

  maxRetriesPerRequest: null,
  enableReadyCheck: true,

  retryStrategy: (times) =>
    Math.min(times * 200, 5000),
});

connection.on("connect", () => {
  console.log("🔌 Worker Redis connected");
});

connection.on("error", (err) => {
  console.error(
    "🔌 Redis connection error:",
    err.message
  );
});

/*
|--------------------------------------------------------------------------
| Safe Job Update
|--------------------------------------------------------------------------
*/

async function safeUpdateJob(
  jobId,
  data,
  context,
) {
  try {
    return await prisma.job.update({
      where: {
        jobId,
      },
      data,
    });
  } catch (err) {
    if (err.code === "P2025") {
      console.warn(
        `⚠️ Job ${jobId} no longer exists.` +
          ` Skipping DB update (${context}).`,
      );

      return null;
    }

    console.error(
      `❌ DB update failed (${context})` +
        ` for job ${jobId}:`,
      err.message,
    );

    throw err;
  }
}

/*
|--------------------------------------------------------------------------
| Cancellation
|--------------------------------------------------------------------------
*/

async function isJobCanceled(logicalJobId) {
  const job = await prisma.job.findUnique({
    where: {
      jobId: logicalJobId,
    },
    select: {
      status: true,
    },
  });

  return job?.status === STATUS.CANCELED;
}

async function throwIfCanceled(logicalJobId) {
  const canceled =
    await isJobCanceled(logicalJobId);

  if (canceled) {
    throw new UnrecoverableError(
      "Job canceled by user",
    );
  }
}

/*
|--------------------------------------------------------------------------
| Cancellable Work
|--------------------------------------------------------------------------
*/

async function cancellableDelay(
  logicalJobId,
  duration,
) {
  const interval = 500;
  let elapsed = 0;

  while (elapsed < duration) {
    await new Promise((resolve) =>
      setTimeout(resolve, interval),
    );

    elapsed += interval;

    await throwIfCanceled(logicalJobId);
  }
}

/*
|--------------------------------------------------------------------------
| BullMQ Worker
|--------------------------------------------------------------------------
*/

const worker = new Worker(
  QUEUE_NAME,

  async (job) => {
    const bullmqJobId = String(job.id);
    const logicalJobId =
      job.data?.logicalJobId;

    /*
     * Track whether activeJobs was successfully
     * incremented.
     *
     * This prevents activeJobs from becoming
     * negative if the increment itself fails.
     */
    let activeJobCounted = false;

    console.log(
      `📥 [${WORKER_ID}] Processing BullMQ execution ${bullmqJobId}`,
    );

    try {
      /*
       * logicalJobId MUST exist.
       */
      if (!logicalJobId) {
        throw new UnrecoverableError(
          `Missing logicalJobId in BullMQ job ${bullmqJobId}`,
        );
      }

      /*
       * Increment active job count.
       */
      await incrementActiveJobs(WORKER_ID);

      activeJobCounted = true;

      console.log(
        `📈 [${WORKER_ID}] activeJobs incremented`,
      );

      console.log(
        `🔗 logicalJobId=${logicalJobId},` +
          ` bullmqJobId=${bullmqJobId}`,
      );

      /*
       * Find logical PostgreSQL Job.
       */
      const dbJob =
        await prisma.job.findUnique({
          where: {
            jobId: logicalJobId,
          },
        });

      if (!dbJob) {
        throw new Error(
          `Database job not found for logicalJobId ${logicalJobId}`,
        );
      }

      /*
       * Find the last logical attempt.
       *
       * This keeps attempt numbers continuous
       * across different BullMQ executions.
       */
      const lastAttempt =
        await prisma.jobAttempt.findFirst({
          where: {
            jobId: dbJob.id,
          },
          orderBy: {
            attemptNumber: "desc",
          },
        });

      const attemptNumber =
        (lastAttempt?.attemptNumber ?? 0) + 1;

      const attemptStartedAt = new Date();

      /*
       * Check cancellation before creating attempt.
       */
      await throwIfCanceled(logicalJobId);

      /*
       * Create JobAttempt.
       */
      const attempt =
        await prisma.jobAttempt.create({
          data: {
            jobId: dbJob.id,
            attemptNumber,
            bullmqJobId,
            workerId: WORKER_ID,
            status: "active",
            startedAt: attemptStartedAt,
          },
        });

      const attemptId = attempt.id;

      console.log(
        `📝 [${WORKER_ID}] Created attempt ${attemptNumber}` +
          ` for logical job ${logicalJobId}` +
          ` / BullMQ ${bullmqJobId}`,
      );

      /*
       * Mark logical Job ACTIVE.
       */
      await safeUpdateJob(
        logicalJobId,
        {
          status: STATUS.ACTIVE,
          startedAt: attemptStartedAt,
          attempts: attemptNumber,
          bullmqJobId,
        },
        "start",
      );

      /*
       * Check cancellation again.
       */
      await throwIfCanceled(logicalJobId);

      /*
       * Failure testing.
       */
      if (job.data?.shouldFail) {
        throw new Error(
          "Intentional test failure",
        );
      }

      /*
       * Progress 25%.
       */
      await job.updateProgress(25);

      await safeUpdateJob(
        logicalJobId,
        {
          progress: 25,
        },
        "progress-25",
      );

      await throwIfCanceled(logicalJobId);

      /*
       * Work.
       */
      await cancellableDelay(
        logicalJobId,
        5000,
      );

      /*
       * Progress 50%.
       */
      await job.updateProgress(50);

      await safeUpdateJob(
        logicalJobId,
        {
          progress: 50,
        },
        "progress-50",
      );

      await throwIfCanceled(logicalJobId);

      /*
       * More work.
       */
      await cancellableDelay(
        logicalJobId,
        1000,
      );

      /*
       * Progress 75%.
       */
      await job.updateProgress(75);

      await safeUpdateJob(
        logicalJobId,
        {
          progress: 75,
        },
        "progress-75",
      );

      await throwIfCanceled(logicalJobId);

      /*
       * More work.
       */
      await cancellableDelay(
        logicalJobId,
        1000,
      );

      /*
       * Progress 100%.
       */
      await job.updateProgress(100);

      await safeUpdateJob(
        logicalJobId,
        {
          progress: 100,
        },
        "progress-100",
      );

      /*
       * Final cancellation check.
       */
      await throwIfCanceled(logicalJobId);

      const result = {
        success: true,
        message:
          "Job processed successfully",
      };

      const completedAt = new Date();

      /*
       * Complete logical Job.
       */
      await safeUpdateJob(
        logicalJobId,
        {
          status: STATUS.COMPLETED,
          progress: 100,
          result,
          error: null,
          completedAt,
          failedAt: null,
          isDeadLetter: false,
          attempts: attemptNumber,
          bullmqJobId,
        },
        "complete",
      );

      /*
       * Resolve dependent jobs.
       */
      await resolveDependents(dbJob.id);

      /*
       * Complete JobAttempt.
       */
      const duration =
        completedAt.getTime() -
        attemptStartedAt.getTime();

      await prisma.jobAttempt.update({
        where: {
          id: attemptId,
        },
        data: {
          status: "completed",
          completedAt,
          duration,
        },
      });

      console.log(
        `✅ [${WORKER_ID}] Logical job ${logicalJobId}` +
          ` completed via BullMQ ${bullmqJobId}` +
          ` (attempt ${attemptNumber},` +
          ` duration: ${duration}ms)`,
      );

      return result;
    } finally {
      /*
       * ALWAYS decrement activeJobs
       * if this execution successfully incremented it.
       *
       * Runs when:
       * - job succeeds
       * - job fails
       * - job is canceled
       * - exception occurs
       * - BullMQ retries
       */
      if (activeJobCounted) {
        await decrementActiveJobs(WORKER_ID);

        console.log(
          `📉 [${WORKER_ID}] activeJobs decremented`,
        );
      }
    }
  },

  {
    connection,
    concurrency: CONCURRENCY,
    lockDuration: 30_000,
  },
);

/*
|--------------------------------------------------------------------------
| Failed Event
|--------------------------------------------------------------------------
*/

worker.on(
  "failed",
  async (job, error) => {
    if (!job) return;

    const logicalJobId =
      job.data?.logicalJobId;

    const bullmqJobId = String(job.id);

    if (!logicalJobId) {
      console.error(
        `❌ BullMQ job ${bullmqJobId}` +
          ` has no logicalJobId`,
      );

      return;
    }

    console.error(
      `❌ [${WORKER_ID}] Logical job ${logicalJobId}` +
        ` / BullMQ ${bullmqJobId} failed`,
    );

    console.error(
      "❌ Error:",
      error.message,
    );

    /*
     * Find JobAttempt created by this
     * BullMQ execution.
     */
    let currentAttempt = null;

    try {
      currentAttempt =
        await prisma.jobAttempt.findFirst({
          where: {
            bullmqJobId,
            status: "active",
          },
          orderBy: {
            createdAt: "desc",
          },
        });

      if (!currentAttempt) {
        currentAttempt =
          await prisma.jobAttempt.findFirst({
            where: {
              bullmqJobId,
            },
            orderBy: {
              createdAt: "desc",
            },
          });
      }
    } catch (err) {
      console.error(
        `❌ Failed to find JobAttempt for BullMQ ${bullmqJobId}:`,
        err.message,
      );
    }

    const logicalAttemptNumber =
      currentAttempt?.attemptNumber ?? null;

    /*
     * Cancellation is not retryable.
     */
    if (
      error instanceof UnrecoverableError
    ) {
      console.log(
        `🛑 [${WORKER_ID}] Logical job ${logicalJobId}` +
          ` was canceled`,
      );

      await safeUpdateJob(
        logicalJobId,
        {
          status: STATUS.CANCELED,
          isDeadLetter: false,
          error: "Job canceled by user",
        },
        "canceled",
      );

      try {
        if (currentAttempt) {
          await prisma.jobAttempt.update({
            where: {
              id: currentAttempt.id,
            },
            data: {
              status: "canceled",
              completedAt: new Date(),
              error: "Job canceled by user",
            },
          });

          console.log(
            `📝 [${WORKER_ID}] Attempt` +
              ` ${currentAttempt.attemptNumber}` +
              ` marked canceled`,
          );
        }
      } catch (attemptError) {
        console.error(
          `❌ Failed to update canceled JobAttempt:`,
          attemptError.message,
        );
      }

      return;
    }

    /*
     * Normal failure / retry.
     *
     * BullMQ attemptsMade is zero-based:
     *
     * 0 → attempt 1
     * 1 → attempt 2
     * 2 → attempt 3
     */
    const maxAttempts =
      job.opts.attempts || 1;

    const attemptsMade =
      job.attemptsMade || 0;

    const isFinalAttempt =
      attemptsMade >= maxAttempts;

    const currentAttemptNumber =
      logicalAttemptNumber ??
      attemptsMade + 1;

    console.error(
      `📊 Logical attempt: ${currentAttemptNumber}` +
        ` | BullMQ attempt: ${attemptsMade + 1}/${maxAttempts}` +
        ` | final=${isFinalAttempt}`,
    );

    /*
     * Update logical PostgreSQL Job.
     */
    await safeUpdateJob(
      logicalJobId,
      isFinalAttempt
        ? {
            status: STATUS.FAILED,
            isDeadLetter: true,
            attempts: currentAttemptNumber,
            error: error.message,
            failedAt: new Date(),
          }
        : {
            status: STATUS.RETRYING,
            isDeadLetter: false,
            attempts: currentAttemptNumber,
            error: error.message,
          },
      "failed",
    );

    /*
     * Final failure → resolve dependents.
     */
    if (isFinalAttempt) {
      const failedDbJob =
        await prisma.job.findUnique({
          where: {
            jobId: logicalJobId,
          },
          select: {
            id: true,
          },
        });

      if (failedDbJob) {
        console.log(
          `🔗 Resolving dependents of failed job ${logicalJobId}`,
        );

        await resolveDependents(
          failedDbJob.id,
        );
      }
    }

    /*
     * Update JobAttempt.
     */
    try {
      if (currentAttempt) {
        await prisma.jobAttempt.update({
          where: {
            id: currentAttempt.id,
          },
          data: {
            status: "failed",
            completedAt: new Date(),
            error: error.message,
          },
        });

        console.log(
          `📝 [${WORKER_ID}] Attempt` +
            ` ${currentAttempt.attemptNumber}` +
            ` for logical job ${logicalJobId}` +
            ` marked failed`,
        );
      } else {
        console.warn(
          `⚠️ No JobAttempt found for BullMQ ${bullmqJobId}`,
        );
      }
    } catch (attemptError) {
      console.error(
        `❌ Failed to update JobAttempt` +
          ` for logical job ${logicalJobId}:`,
        attemptError.message,
      );
    }

    /*
     * Final logging.
     */
    if (isFinalAttempt) {
      console.log(
        `💀 [${WORKER_ID}] Logical job ${logicalJobId}` +
          ` permanently failed and moved to DLQ`,
      );
    } else {
      console.log(
        `🔄 [${WORKER_ID}] Logical job ${logicalJobId}` +
          ` will retry automatically`,
      );
    }
  },
);

/*
|--------------------------------------------------------------------------
| Worker Health Registration
|--------------------------------------------------------------------------
*/

async function startWorkerHealth() {
  try {
    await registerWorker({
      workerId: WORKER_ID,
      concurrency: CONCURRENCY,
    });

    heartbeatTimer = startHeartbeat(WORKER_ID);

    console.log(
      `💚 [${WORKER_ID}] Worker health monitoring started`,
    );
  } catch (error) {
    console.error(
      `❌ Failed to register worker ${WORKER_ID}:`,
      error.message,
    );

    throw error;
  }
}

/*
|--------------------------------------------------------------------------
| Startup
|--------------------------------------------------------------------------
*/

console.log(
  `🚀 Starting ${WORKER_ID}` +
    ` with concurrency ${CONCURRENCY}`,
);

await startWorkerHealth();

let isShuttingDown = false;

async function shutdown(signal) {
  if (isShuttingDown) {
    console.log(
      `⚠️ ${signal} received again. Shutdown already running.`,
    );

    return;
  }

  isShuttingDown = true;

  console.log(
    `\n🛑 ${signal} received, shutting down worker gracefully...`,
  );

  /*
   * Keep the Node.js event loop alive while
   * asynchronous shutdown operations execute.
   */
  const keepAlive = setInterval(() => {}, 1000);

  try {
    /*
     * STEP 1
     *
     * Stop heartbeat and update PostgreSQL.
     */
    if (heartbeatTimer) {
      console.log(
        `🛑 [${WORKER_ID}] Marking worker STOPPED in DB...`,
      );

      await stopHeartbeat({
        workerId: WORKER_ID,
        timer: heartbeatTimer,
      });

      heartbeatTimer = null;

      console.log(
        `✅ [${WORKER_ID}] Worker is STOPPED in DB`,
      );
    }

    /*
     * STEP 2
     *
     * Close BullMQ.
     *
     * This waits for currently running jobs
     * to finish.
     */
    console.log(
      `🔒 [${WORKER_ID}] Closing BullMQ worker...`,
    );

    await worker.close();

    console.log(
      `✅ [${WORKER_ID}] BullMQ worker closed`,
    );

    /*
     * STEP 3
     *
     * Close Redis.
     */
    console.log(
      `🔌 [${WORKER_ID}] Closing Redis...`,
    );

    await connection.quit();

    console.log(
      `✅ [${WORKER_ID}] Redis closed`,
    );

    /*
     * STEP 4
     *
     * Disconnect Prisma.
     */
    console.log(
      `🗄️ [${WORKER_ID}] Disconnecting Prisma...`,
    );

    await prisma.$disconnect();

    console.log(
      `✅ [${WORKER_ID}] Prisma disconnected`,
    );

    clearInterval(keepAlive);

    console.log(
      `✅ [${WORKER_ID}] Worker shut down cleanly.`,
    );

    /*
     * Give stdout a moment to flush.
     */
    setTimeout(() => {
      process.exit(0);
    }, 100);
  } catch (error) {
    clearInterval(keepAlive);

    console.error(
      `❌ [${WORKER_ID}] Shutdown failed:`,
      error,
    );

    setTimeout(() => {
      process.exit(1);
    }, 100);
  }
}

process.once("SIGINT", () => {
  void shutdown("SIGINT");
});

process.once("SIGTERM", () => {
  void shutdown("SIGTERM");
});
export default worker;