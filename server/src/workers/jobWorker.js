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

    await prisma.job.update({
      where: {
        jobId: job.id,
      },
      data: {
        status: "active",
        startedAt: new Date(),
        attempts: job.attemptsMade,
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

  console.error(`❌ Job ${job.id} failed`);

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
});
