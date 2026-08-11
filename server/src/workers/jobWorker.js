import "dotenv/config";
import IORedis from "ioredis";
import { Worker } from "bullmq";
import prisma from "../config/prisma.js";

const QUEUE_NAME = "taskflow-queue";
const CONCURRENCY = Number(process.env.WORKER_CONCURRENCY || 5);

const STATUS = {
  ACTIVE: "active",
  COMPLETED: "completed",
  FAILED: "failed",
  RETRYING: "retrying",
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
    await prisma.job.update({ where: { jobId }, data });
  } catch (err) {
    console.error(`⚠️  DB update failed (${context}) for job ${jobId}:`, err.message);
  }
}

const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    console.log(`📥 Processing job ${job.id}`);

    if (job.data.shouldFail) {
      throw new Error("Intentional test failure");
    }

    await safeUpdateJob(
      job.id,
      {
        status: STATUS.ACTIVE,
        startedAt: new Date(),
        attempts: job.attemptsMade + 1,
      },
      "start"
    );

    await job.updateProgress(25);
    await new Promise((resolve) => setTimeout(resolve, 2000));

    await job.updateProgress(50);
    await safeUpdateJob(job.id, { progress: 50 }, "progress-50");
    await new Promise((resolve) => setTimeout(resolve, 2000));

    await job.updateProgress(75);
    await new Promise((resolve) => setTimeout(resolve, 2000));

    await job.updateProgress(100);

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

    return result;
  },
  {
    connection,
    concurrency: CONCURRENCY,
    lockDuration: 30_000, 
  }
);


worker.on("failed", async (job, error) => {
  if (!job) return;

  const maxAttempts = job.opts.attempts || 1;
  const attemptsMade = job.attemptsMade || 0;
  const isFinalAttempt = attemptsMade >= maxAttempts;

  console.error(`❌ Job ${job.id} failed on attempt ${attemptsMade}/${maxAttempts}`);

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
          error: error.message,
          attempts: attemptsMade,
        },
    "failed"
  );

  console.log(
    isFinalAttempt
      ? `💀 Job ${job.id} permanently failed`
      : `🔄 Job ${job.id} will retry (${attemptsMade}/${maxAttempts})`
  );
});

worker.on("error", (err) => {
 
  console.error("🧯 Worker error:", err);
});

worker.on("completed", (job) => {
  console.log(`✅ Job ${job.id} completed`);
});

// Graceful shutdown
// Without this, SIGTERM (e.g. container redeploys) kills the process
// mid-job, leaving it stuck "active" forever with a stale lock.
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