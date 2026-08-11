import "dotenv/config";
import IORedis from "ioredis";
import { Worker } from "bullmq";

const connection = new IORedis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  maxRetriesPerRequest: null,
});

const worker = new Worker(
  "taskflow-queue",

  async (job) => {
    console.log("\n📥 Job received");
    console.log("Job ID:", job.id);
    console.log("Job name:", job.name);
    console.log("Job data:", job.data);

    // Simulate job processing
    await new Promise((resolve) => setTimeout(resolve, 3000));

    console.log(`✅ Job ${job.id} completed`);

    return {
      success: true,
      message: "Job processed successfully",
    };
  },

  {
    connection,
  }
);

worker.on("completed", (job) => {
  console.log(`🎉 Job ${job.id} marked as completed`);
});

worker.on("failed", (job, error) => {
  console.error(`❌ Job ${job?.id} failed:`, error.message);
});

worker.on("error", (error) => {
  console.error("❌ Worker error:", error);
});

console.log("👷 TaskFlow Worker started...");