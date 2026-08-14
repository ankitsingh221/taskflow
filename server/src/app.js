import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pool from './config/database.js';
import redisClient from './config/redis.js';
import prisma from './config/prisma.js';

import jobRoutes from './routes/jobRoutes.js';
import dlqRoutes from './routes/dlqRoutes.js';
import dependencyRoutes from "./routes/dependencyRoutes.js";
import workerRoutes from "./routes/workerRoutes.js";
import metricsRoutes from "./routes/metricsRoutes.js";
const app =  express();

app.use(cors());
app.use(helmet());
app.use(express.json());

app.get('/', (req,res) =>{
    res.json({
        message:"taskflow api is running",
    });
});

/*
  Health check.
 
  Reports PostgreSQL and Redis connectivity without
  exposing any connection details or credentials.
 */
app.get("/health", async (req, res) => {
  let database = "disconnected";
  let redis = "disconnected";

  try {
    await pool.query("SELECT NOW()");
    database = "connected";
  } catch (error) {
    console.error("❌ Health check: database unreachable:", error.message);
  }

  try {
    if (redisClient.isReady) {
      await redisClient.ping();
      redis = "connected";
    }
  } catch (error) {
    console.error("❌ Health check: redis unreachable:", error.message);
  }

  const ok = database === "connected" && redis === "connected";

  return res.status(ok ? 200 : 503).json({
    status: ok ? "ok" : "degraded",
    database,
    redis,
  });
});

app.use('/api/jobs', jobRoutes);
app.use('/api/dlq', dlqRoutes);
app.use("/api/dependencies", dependencyRoutes);
app.use("/api/workers", workerRoutes);

app.use(
  "/api/metrics",
  metricsRoutes
);

/*
  Central error handler.
 
  Any unexpected error that propagates out of a controller
  or route lands here. Responds with a safe, generic message
  and logs the underlying error server-side — internals are
  never exposed to clients.
 */
app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON in request body",
    });
  }

  console.error("❌ Unhandled error:", err);

  return res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Test PostgreSQL
    await pool.query("SELECT NOW()");
    console.log("PostgreSQL connection successful");

    // Connect Redis
    await redisClient.connect();
    console.log("Redis connection successful");

    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    /*
      Graceful shutdown.
     
     Stop accepting new requests, close the HTTP server,
      then disconnect Redis, PostgreSQL and Prisma.
     */
    let isShuttingDown = false;

    async function shutdown(signal) {
      if (isShuttingDown) return;
      isShuttingDown = true;

      console.log(`\n🛑 ${signal} received, shutting down API gracefully...`);

      const forceExit = setTimeout(() => {
        console.error("⚠️ Shutdown timed out. Forcing exit.");
        process.exit(1);
      }, 10_000);
      forceExit.unref();

      server.close(async () => {
        try {
          await redisClient.quit();
          await pool.end();
          await prisma.$disconnect();
          console.log("✅ API shut down cleanly.");
          process.exit(0);
        } catch (error) {
          console.error("❌ API shutdown failed:", error);
          process.exit(1);
        }
      });
    }

    process.once("SIGINT", () => void shutdown("SIGINT"));
    process.once("SIGTERM", () => void shutdown("SIGTERM"));
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
