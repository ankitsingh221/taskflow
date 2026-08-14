import IORedis from "ioredis";
import { Queue } from "bullmq";

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
});

connection.on("connect", () => {
  console.log("✅ BullMQ Redis connected");
});

connection.on("error", (error) => {
  console.error("❌ BullMQ Redis error:", error);
});

const jobQueue = new Queue("taskflow-queue", {
  connection,
});

jobQueue.on("error", (error) => {
  console.error("❌ Queue error:", error);
});

export default jobQueue;