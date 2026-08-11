import {createClient} from 'redis';
import dotenv from 'dotenv';
dotenv.config();

const redisClient = createClient({
    socket:{
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT),
    }
});

redisClient.on("connect", () => {
  console.log("✅ Redis connected");
});

redisClient.on("error", (err) => {
  console.error("❌ Redis error:", err);
});

export default redisClient;