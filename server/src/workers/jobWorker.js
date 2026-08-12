import "dotenv/config";
import IORedis from "ioredis";
import { Worker ,UnrecoverableError} from "bullmq";
import prisma from "../config/prisma.js";

const QUEUE_NAME = "taskflow-queue";
const CONCURRENCY = Number(process.env.WORKER_CONCURRENCY || 1);

const STATUS = {
  ACTIVE: "active",
  COMPLETED: "completed",
  FAILED: "failed",
  RETRYING: "retrying",
  CANCELED:"canceled",
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


async function safeUpdateJob(jobId, data, context) {
  try {
    await prisma.job.update({
      where: { jobId },
      data,
    });
  } catch (err) {
    console.error(
      `❌ DB update failed (${context}) for job ${jobId}:`,
      err.message
    );

    throw err;
  }

}


/*
 * Check whether the job has been canceled in PostgreSQL.
 *
 * PostgreSQL is the source of truth for the logical
 * cancellation state.
 */
async function isJobCanceled(jobId) {
  const job = await prisma.job.findUnique({
    where: { jobId },
    select: {
      status: true,
    },
  });

  return job?.status === STATUS.CANCELED;
}

/*
 * Stop processing if the job has been canceled.
 */
async function throwIfCanceled(jobId) {
  const canceled = await isJobCanceled(jobId);

  if (canceled) {
    throw new UnrecoverableError("Job canceled by user");
  }
}

/*
 * Simulated cancellable work.

 * Instead of sleeping for the entire duration,
 * we check cancellation every 500ms.
 */
async function cancellableDelay(jobId, duration) {
  const interval = 500;
  let elapsed = 0;

  while (elapsed < duration) {
    await new Promise((resolve) => setTimeout(resolve, interval));

    elapsed += interval;

    await throwIfCanceled(jobId);
  }
}



const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    console.log(`📥 Processing job ${job.id}`);

    /*
     * Check immediately before doing anything.
     */
    await throwIfCanceled(job.id);

    await safeUpdateJob(
      job.id,
      {
        status: STATUS.ACTIVE,
        startedAt: new Date(),
        attempts: job.attemptsMade + 1,
      },
      "start"
    );

    /*
     * Check again after changing the status to ACTIVE.
     */
    await throwIfCanceled(job.id);

    /*
     * Existing failure testing.
     */
    if (job.data.shouldFail) {
      throw new Error("Intentional test failure");
    }

    /*
     * Progress: 25%
     */
    await job.updateProgress(25);

    await throwIfCanceled(job.id);

    /*
     * Simulate 10 seconds of work,
     * but check cancellation every 500ms.
     */
    await cancellableDelay(job.id, 60000);

    /*
     * Progress: 50%
     */
    await job.updateProgress(50);

    await safeUpdateJob(
      job.id,
      {
        progress: 50,
      },
      "progress-50"
    );

    await throwIfCanceled(job.id);

    /*
     * Simulate another 2 seconds.
     */
    await cancellableDelay(job.id, 2000);

    /*
     * Progress: 75%
     */
    await job.updateProgress(75);

    await throwIfCanceled(job.id);

    /*
     * Simulate another 2 seconds.
     */
    await cancellableDelay(job.id, 2000);

    /*
     * Progress: 100%
     */
    await job.updateProgress(100);

    /*
     * IMPORTANT:
     *
     * Check one final time before marking the job
     * as COMPLETED.
     */
    await throwIfCanceled(job.id);

    const result = {
      success: true,
      message: "Job processed successfully",
    };

    await safeUpdateJob(
      job.id,
      {
        status: STATUS.COMPLETED,
        progress: 100,
        result,
        completedAt: new Date(),
      },
      "complete"
    );

    console.log(`✅ Job ${job.id} completed successfully`);

    return result;
  },
  {
    connection,
    concurrency: CONCURRENCY,
    lockDuration: 30_000,
  }
);


/*
 * Handle failed jobs.
 */
worker.on("failed", async (job, error) => {
  if (!job) return;

  /*
   * CANCELLATION IS NOT A FAILURE.
   *
   * Do not retry it.
   * Do not put it in the DLQ.
   */
  if (error instanceof UnrecoverableError) {
  console.log(`🛑 Job ${job.id} was canceled`);

  await safeUpdateJob(
    job.id,
    {
      status: STATUS.CANCELED,
      isDeadLetter: false,
      error: "Job canceled by user",
    },
    "canceled"
  );

  return;
}

  /*
   * Existing retry/DLQ logic.
   */
  const maxAttempts = job.opts.attempts || 1;
  const attemptsMade = job.attemptsMade || 0;
  const isFinalAttempt = attemptsMade >= maxAttempts;

  console.error(
    `❌ Job ${job.id} failed on attempt ${attemptsMade}/${maxAttempts}`
  );

  await safeUpdateJob(
    job.id,
    isFinalAttempt
      ? {
          status: STATUS.FAILED,
          isDeadLetter: true,
          attempts: attemptsMade,
          error: error.message,
          failedAt: new Date(),
        }
      : {
          status: STATUS.RETRYING,
          isDeadLetter: false,
          attempts: attemptsMade,
          error: error.message,
        },
    "failed"
  );

  console.log(
    isFinalAttempt
      ? `💀 Job ${job.id} permanently failed`
      : `🔄 Job ${job.id} will retry (${attemptsMade}/${maxAttempts})`
  );
});

async function shutdown(signal) {
  console.log(`\n${signal} received, shutting down worker gracefully...`);

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