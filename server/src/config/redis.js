import { createClient } from "redis";
import dotenv from "dotenv";

dotenv.config();

const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    ...(process.env.REDIS_TLS === "true" && {
      tls: true,
    }),
  },

  ...(process.env.REDIS_USERNAME &&
    process.env.REDIS_PASSWORD && {
      username: process.env.REDIS_USERNAME,
      password: process.env.REDIS_PASSWORD,
    }),
});

redisClient.on("connect", () => {
  console.log("Redis connected");
});

redisClient.on("ready", () => {
  console.log("Redis ready");
});

redisClient.on("error", (err) => {
  console.error("Redis error:", err);
});

export default redisClient;