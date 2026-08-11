import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pool from './config/database.js';
import redisClient from './config/redis.js';

const app =  express();

app.use(cors());
app.use(helmet());
app.use(express.json());

app.get('/', (req,res) =>{
    res.json({
        message:"taskflow api is running",
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

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();