import "dotenv/config";
import IORedis from "ioredis";
import { Worker } from "bullmq";
import prisma from "../config/prisma.js";

const connection = new IORedis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  maxRetriesPerRequest: null,
});

const worker = new Worker(
  "taskflow-queue",

  async (job) => {
    console.log(`📥 Processing job ${job.id}`);
        
    if (job.data.shouldFail) {
    throw new Error("Intentional test failure");
  }

    await prisma.job.update({
      where: {
        jobId: job.id,
      },
      data: {
        status: "active",
        startedAt: new Date(),
        attempts: job.attemptsMade +1 ,
      },
    });

    await job.updateProgress(25);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    await job.updateProgress(50);

    await prisma.job.update({
      where: {
        jobId: job.id,
      },
      data: {
        progress: 50,
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 2000));

    await job.updateProgress(75);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    await job.updateProgress(100);

    const result = {
      success: true,
      message: "Job processed successfully",
    };

    await prisma.job.update({
      where: {
        jobId: job.id,
      },
      data: {
        status: "completed",
        progress: 100,
        result,
        completedAt: new Date(),
      },
    });

    return result;
  },
  {
    connection,
  }
);

worker.on("failed", async (job, error) => {
  if (!job) return;

  console.error(
    `❌ Job ${job.id} failed on attempt ${job.attemptsMade}:`,
    error.message
  );

  const maxAttempts = job.opts.attempts || 1;

  if (job.attemptsMade >= maxAttempts) {
    await prisma.job.update({
      where: {
        jobId: job.id,
      },
      data: {
        status: "failed",
        error: error.message,
        attempts: job.attemptsMade,
      },
    });

    console.log(`💀 Job ${job.id} permanently failed`);
  } else {
    await prisma.job.update({
      where: {
        jobId: job.id,
      },
      data: {
        status: "retrying",
        error: error.message,
        attempts: job.attemptsMade,
      },
    });

    console.log(
      `🔄 Job ${job.id} will retry (${job.attemptsMade}/${maxAttempts})`
    );
  }
});
