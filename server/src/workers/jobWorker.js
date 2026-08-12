import "dotenv/config";
import IORedis from "ioredis";
import { Worker, UnrecoverableError } from "bullmq";
import prisma from "../config/prisma.js";

const QUEUE_NAME = "taskflow-queue";
const WORKER_ID = process.env.WORKER_ID || `worker-${process.pid}`;
const CONCURRENCY = Number(process.env.WORKER_CONCURRENCY || 1);

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
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  retryStrategy: (times) => Math.min(times * 200, 5000),
});

connection.on("error", (err) => {
  console.error("🔌 Redis connection error:", err.message);
});

/*
 * Safely update logical PostgreSQL Job.
 */
async function safeUpdateJob(jobId, data, context) {
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
        `⚠️ Job ${jobId} no longer exists. Skipping DB update (${context}).`,
      );

      return null;
    }

    console.error(
      `❌ DB update failed (${context}) for job ${jobId}:`,
      err.message,
    );

    throw err;
  }
}

/*
 * Check cancellation using logical Job ID.
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

/*
 * Stop processing if logical job was canceled.
 */
async function throwIfCanceled(logicalJobId) {
  const canceled = await isJobCanceled(logicalJobId);

  if (canceled) {
    throw new UnrecoverableError("Job canceled by user");
  }
}

/*
 * Simulated cancellable work.
 */
async function cancellableDelay(logicalJobId, duration) {
  const interval = 500;
  let elapsed = 0;

  while (elapsed < duration) {
    await new Promise((resolve) => setTimeout(resolve, interval));

    elapsed += interval;

    await throwIfCanceled(logicalJobId);
  }
}

/*
 * Worker
 */
const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    const bullmqJobId = String(job.id);
    const logicalJobId = job.data?.logicalJobId;

    console.log(
      `📥 [${WORKER_ID}] Processing BullMQ execution ${bullmqJobId}`,
    );

    /*
     * logicalJobId MUST exist.
     */
    if (!logicalJobId) {
      throw new UnrecoverableError(
        `Missing logicalJobId in BullMQ job ${bullmqJobId}`,
      );
    }

    console.log(
      `🔗 logicalJobId=${logicalJobId}, bullmqJobId=${bullmqJobId}`,
    );

    /*
     * Find logical PostgreSQL Job.
     */
    const dbJob = await prisma.job.findUnique({
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
     * Find the last attempt across ALL BullMQ executions.
     *
     * This is what makes:
     *
     * 1
     * 2
     * 3
     * 4
     *
     * continuous even when BullMQ execution changes.
     */
    const lastAttempt = await prisma.jobAttempt.findFirst({
      where: {
        jobId: dbJob.id,
      },
      orderBy: {
        attemptNumber: "desc",
      },
    });

    const attemptNumber = (lastAttempt?.attemptNumber ?? 0) + 1;

    const attemptStartedAt = new Date();

    /*
     * Check cancellation before creating attempt.
     */
    await throwIfCanceled(logicalJobId);

    /*
     * Create JobAttempt.
     */
    const attempt = await prisma.jobAttempt.create({
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
      throw new Error("Intentional test failure");
    }

    /*
     * Progress 25%.
     */
    await job.updateProgress(25);

    await throwIfCanceled(logicalJobId);

    /*
     * Work.
     */
    await cancellableDelay(logicalJobId, 5000);

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
    await cancellableDelay(logicalJobId, 1000);

    /*
     * Progress 75%.
     */
    await job.updateProgress(75);

    await throwIfCanceled(logicalJobId);

    /*
     * More work.
     */
    await cancellableDelay(logicalJobId, 1000);

    /*
     * Progress 100%.
     */
    await job.updateProgress(100);

    /*
     * Final cancellation check.
     */
    await throwIfCanceled(logicalJobId);

    const result = {
      success: true,
      message: "Job processed successfully",
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
     * Complete JobAttempt.
     */
    const duration =
      completedAt.getTime() - attemptStartedAt.getTime();

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
      `✅ [${WORKER_ID}] Logical job ${logicalJobId} completed` +
        ` via BullMQ ${bullmqJobId}` +
        ` (attempt ${attemptNumber}, duration: ${duration}ms)`,
    );

    return result;
  },
  {
    connection,
    concurrency: CONCURRENCY,
    lockDuration: 30_000,
  },
);

/*
 * Handle failed jobs.
 */
worker.on("failed", async (job, error) => {
  if (!job) return;

  const logicalJobId = job.data?.logicalJobId;
  const bullmqJobId = String(job.id);

  if (!logicalJobId) {
    console.error(
      `❌ BullMQ job ${bullmqJobId} has no logicalJobId`,
    );

    return;
  }

  console.error(
    `❌ [${WORKER_ID}] Logical job ${logicalJobId}` +
      ` / BullMQ ${bullmqJobId} failed`,
  );

  console.error("❌ Error:", error.message);

  /*
   * Find the JobAttempt created by THIS BullMQ execution.
   *
   * This is important because attemptNumber from the processor
   * function is not available inside this event handler.
   */
  let currentAttempt = null;

  try {
    currentAttempt = await prisma.jobAttempt.findFirst({
      where: {
        bullmqJobId,
        status: "active",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    /*
     * If no active attempt exists, find the most recent attempt
     * for this BullMQ execution.
     */
    if (!currentAttempt) {
      currentAttempt = await prisma.jobAttempt.findFirst({
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

  const logicalAttemptNumber = currentAttempt?.attemptNumber ?? null;

  /*
   * CANCELLATION
   *
   * Cancellation is NOT a retryable failure.
   */
  if (error instanceof UnrecoverableError) {
    console.log(
      `🛑 [${WORKER_ID}] Logical job ${logicalJobId} was canceled`,
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
          `📝 [${WORKER_ID}] Attempt ${currentAttempt.attemptNumber}` +
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
   * NORMAL FAILURE / RETRY
   *
   * BullMQ attemptsMade is zero-based:
   *
   * attemptsMade = 0 → actual attempt 1
   * attemptsMade = 1 → actual attempt 2
   * attemptsMade = 2 → actual attempt 3
   */
  const maxAttempts = job.opts.attempts || 1;
  const attemptsMade = job.attemptsMade || 0;

  const isFinalAttempt =
    attemptsMade >= maxAttempts ;

  const currentAttemptNumber =
    logicalAttemptNumber ?? attemptsMade ;

  console.error(
    `❌ [${WORKER_ID}] BullMQ ${bullmqJobId}` +
      ` failed`,
  );

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
   * Update current JobAttempt.
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
        `📝 [${WORKER_ID}] Attempt ${currentAttempt.attemptNumber}` +
          ` for logical job ${logicalJobId} marked failed`,
      );
    } else {
      console.warn(
        `⚠️ No JobAttempt found for BullMQ ${bullmqJobId}`,
      );
    }
  } catch (attemptError) {
    console.error(
      `❌ Failed to update JobAttempt for logical job ${logicalJobId}:`,
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
});

console.log(
  `🚀 Starting ${WORKER_ID} with concurrency ${CONCURRENCY}`,
);

/*
 * Graceful shutdown.
 */
async function shutdown(signal) {
  console.log(
    `\n${signal} received, shutting down worker gracefully...`,
  );

  try {
    await worker.close();
    await connection.quit();
    await prisma.$disconnect();

    console.log("Worker shut down cleanly.");

    process.exit(0);
  } catch (err) {
    console.error("Error during shutdown:", err);

    process.exit(1);
  }
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

export default worker;