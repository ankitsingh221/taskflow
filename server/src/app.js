import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pool from './config/database.js';
import redisClient from './config/redis.js';

import jobRoutes from './routes/jobRoutes.js';
import dlqRoutes from './routes/dlqRoutes.js';
import dependencyRoutes from "./routes/dependencyRoutes.js";
import workerRoutes from "./routes/workerRoutes.js";
const app =  express();

app.use(cors());
app.use(helmet());
app.use(express.json());

app.get('/', (req,res) =>{
    res.json({
        message:"taskflow api is running",
    });
});

app.use('/api/jobs', jobRoutes);
app.use('/api/dlq', dlqRoutes);
app.use("/api/dependencies", dependencyRoutes);
app.use("/api/workers", workerRoutes);


const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Test PostgreSQL
    await pool.query("SELECT NOW()");
    console.log("PostgreSQL connection successful");

    // Connect Redis
    await redisClient.connect();
    console.log("Redis connection successful");

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();