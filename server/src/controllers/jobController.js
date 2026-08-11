import jobQueue from "../queues/jobQueue.js";
import { getJobById } from "../services/jobServices.js";
import prisma from "../config/prisma.js";

const MAX_DELAY = 7 * 24 * 60 * 60 * 1000; // ✅ This is fine (top-level)

export const createJob = async (req, res) => {
  try {
    const { name, data, priority = 1, delay } = req.body;

    // ✅ Validation starts here (inside function)
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Job name is required",
      });
    }

    if (!Number.isInteger(priority) || priority < 1 || priority > 10) {
      return res.status(400).json({
        success: false,
        message: "Priority must be an integer between 1 and 10",
      });
    }

    if (!Number.isInteger(delay) || delay < 0) {
      return res.status(400).json({
        success: false,
        message: "Delay must be a non-negative integer",
      });
    }

    if (delay > MAX_DELAY) {
      return res.status(400).json({
        success: false,
        message: "Delay cannot exceed 7 days",
      });
    }

    const scheduledAt = delay > 0 ? new Date(Date.now() + delay) : null;
    
    console.log("Adding job to queue...");
    console.log("Name:", name);
    console.log("Data:", data);

    const job = await jobQueue.add(name, data || {}, {
      priority,
      delay : delay,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    });

    const dbJob = await prisma.job.create({
      data: {
        jobId: job.id,
        name: job.name,
        status: delay > 0 ? "scheduled" : "waiting", // ✅ Use scheduled status if delayed
        priority,
        progress: 0,
        payload: data || {},
        scheduledAt,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Job created successfully",
      job: {
        id: dbJob.id,
        jobId: dbJob.jobId,
        name: dbJob.name,
        status: dbJob.status,
        priority: dbJob.priority,
      },
    });
  } catch (error) {
    console.error("❌ Create job error:");
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to create job",
      error: error.message,
    });
  }
};

export const getJobStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const job = await getJobById(id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    return res.status(200).json({
      success: true,
      job,
    });
  } catch (error) {
    console.error("❌ Get job status error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get job status",
    });
  }
};