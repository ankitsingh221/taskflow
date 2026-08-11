import IORedis from "ioredis";
import { Queue } from "bullmq";

const connection = new IORedis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  maxRetriesPerRequest: null,
});

const jobQueue = new Queue("taskflow-queue", {
  connection,
});

jobQueue.on("error", (error) => {
  console.error("❌ Queue error:", error);
});

export default jobQueue;