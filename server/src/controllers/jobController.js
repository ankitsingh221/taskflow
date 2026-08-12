import jobQueue from "../queues/jobQueue.js";
import { getJobById } from "../services/jobServices.js";
import prisma from "../config/prisma.js";

const MAX_DELAY = 7 * 24 * 60 * 60 * 1000;

const STATUS = {
  WAITING: "waiting",
  SCHEDULED: "scheduled",
  ACTIVE: "active",
  COMPLETED: "completed",
  FAILED: "failed",
  RETRYING: "retrying",
  CANCELED: "canceled",
};

/*
 * Create Job
 */
export const createJob = async (req, res) => {
  try {
    const {
      name,
      data,
      priority = 1,
      delay = 0,
    } = req.body;

    // Validate job name
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Job name is required",
      });
    }

    // Validate priority
    if (
      !Number.isInteger(priority) ||
      priority < 1 ||
      priority > 10
    ) {
      return res.status(400).json({
        success: false,
        message: "Priority must be an integer between 1 and 10",
      });
    }

    // Validate delay
    if (!Number.isInteger(delay) || delay < 0) {
      return res.status(400).json({
        success: false,
        message: "Delay must be a non-negative integer",
      });
    }

    // Maximum delay = 7 days
    if (delay > MAX_DELAY) {
      return res.status(400).json({
        success: false,
        message: "Delay cannot exceed 7 days",
      });
    }

    const scheduledAt =
      delay > 0
        ? new Date(Date.now() + delay)
        : null;

    console.log("Adding job to queue...");
    console.log("Name:", name);
    console.log("Data:", data);
    console.log("Priority:", priority);
    console.log("Delay:", delay);

    /*
     * Add job to BullMQ
     */
    const job = await jobQueue.add(
      name,
      data || {},
      {
        priority,
        delay,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      }
    );

    /*
     * Store logical job in PostgreSQL
     */
    const dbJob = await prisma.job.create({
      data: {
        jobId: job.id,
        name: job.name,
        status:
          delay > 0
            ? STATUS.SCHEDULED
            : STATUS.WAITING,
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
        scheduledAt: dbJob.scheduledAt,
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


/*
 * Get Job Status
 */
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


/*
 * Cancel Job
 */
export const cancelJob = async (req, res) => {
  try {
    const { id } = req.params;

    /*
     * First find the logical job in PostgreSQL.
     */
    const dbJob = await prisma.job.findUnique({
      where: {
        jobId: id,
      },
    });

    if (!dbJob) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    /*
     * Terminal states cannot be cancelled.
     */
    if (dbJob.status === STATUS.COMPLETED) {
      return res.status(409).json({
        success: false,
        message: "Completed job cannot be canceled",
      });
    }

    if (dbJob.status === STATUS.FAILED) {
      return res.status(409).json({
        success: false,
        message: "Failed job cannot be canceled",
      });
    }

    if (dbJob.status === STATUS.CANCELED) {
      return res.status(409).json({
        success: false,
        message: "Job is already canceled",
      });
    }

    /*
     * Get corresponding BullMQ job.
     */
    const bullJob = await jobQueue.getJob(id);

    if (!bullJob) {
      return res.status(409).json({
        success: false,
        message:
          "Job is no longer available in the queue",
      });
    }

    /*
     * Determine current BullMQ state.
     */
    const state = await bullJob.getState();

    console.log(
      `🛑 Cancellation requested for job ${id}. BullMQ state: ${state}`
    );

    /*
     * WAITING / DELAYED
     *
     * These jobs have not started processing yet.
     * We can safely remove them from BullMQ.
     */
    if (
      state === "waiting" ||
      state === "delayed"
    ) {
      await bullJob.remove();

      await prisma.job.update({
        where: {
          jobId: id,
        },
        data: {
          status: STATUS.CANCELED,
          error: "Job canceled by user",
        },
      });

      console.log(
        `🛑 Job ${id} removed from queue and canceled`
      );

      return res.status(200).json({
        success: true,
        message: "Job canceled successfully",
        jobId: id,
        status: STATUS.CANCELED,
      });
    }

    /*
     * ACTIVE
     *
     * The worker already has the job.
     *
     * We DO NOT remove the BullMQ job here.
     *
     * Instead PostgreSQL becomes:
     *
     * active → canceled
     *
     * The worker periodically checks PostgreSQL
     * and throws JobCanceledError when it detects
     * the cancellation.
     */
    if (state === "active") {
      await prisma.job.update({
        where: {
          jobId: id,
        },
        data: {
          status: STATUS.CANCELED,
          error: "Job canceled by user",
        },
      });

      console.log(
        `🛑 Job ${id} marked as canceled while active`
      );

      return res.status(200).json({
        success: true,
        message:
          "Job cancellation requested. Worker will stop processing.",
        jobId: id,
        status: STATUS.CANCELED,
      });
    }

    /*
     * RETRYING jobs can be represented by a delayed
     * BullMQ job waiting for the next retry.
     *
     * If BullMQ says delayed, the code above already
     * handles it.
     */

    /*
     * COMPLETED / FAILED in BullMQ
     */
    if (
      state === "completed" ||
      state === "failed"
    ) {
      return res.status(409).json({
        success: false,
        message: `Job is already ${state} and cannot be canceled`,
      });
    }

    /*
     * Fallback for unexpected BullMQ states.
     */
    return res.status(409).json({
      success: false,
      message: `Job cannot be canceled in its current state: ${state}`,
    });
  } catch (error) {
    console.error("❌ Cancel job error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to cancel job",
      error: error.message,
    });
  }
};