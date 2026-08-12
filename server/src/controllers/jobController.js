import crypto from "crypto"
import jobQueue from "../queues/jobQueue.js";
import { getJobById } from "../services/jobServices.js";
import prisma from "../config/prisma.js";
import { getAttemptsByJobId } from "../services/attemptService.js";

const MAX_DELAY = 7 * 24 * 60 * 60 * 1000;
const MAX_QUEUE_SIZE = parseInt(process.env.MAX_QUEUE_SIZE || 100);

const STATUS = {
  WAITING: "waiting",
  SCHEDULED: "scheduled",
  BLOCKED : "blocked",
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
      dependsOn = [],
    } = req.body;

    // -----------------------------------------
    // Validate job name
    // -----------------------------------------
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Job name is required",
      });
    }

    // -----------------------------------------
    // Validate priority
    // -----------------------------------------
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

    // -----------------------------------------
    // Validate delay
    // -----------------------------------------
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

    // -----------------------------------------
    // Validate dependsOn
    // -----------------------------------------
    if (!Array.isArray(dependsOn)) {
      return res.status(400).json({
        success: false,
        message: "dependsOn must be an array",
      });
    }

    // Convert dependency IDs to strings
    const dependencyIds = dependsOn.map(String);

    // -----------------------------------------
    // Prevent duplicate dependencies
    // -----------------------------------------
    const uniqueDependencies = [
      ...new Set(dependencyIds),
    ];

    if (
      uniqueDependencies.length !== dependencyIds.length
    ) {
      return res.status(400).json({
        success: false,
        message: "Duplicate dependencies are not allowed",
      });
    }

    // -----------------------------------------
    // Queue capacity check
    // -----------------------------------------
    const waitingCount = await jobQueue.getWaitingCount();

    if (
      waitingCount >= MAX_QUEUE_SIZE
    ) {
      return res.status(429).json({
        success: false,
        message:
          "Queue is currently full. Please try again later.",
        queue: {
          waiting: waitingCount,
          limit: MAX_QUEUE_SIZE,
        },
      });
    }

    // -----------------------------------------
    // Find dependency jobs
    // -----------------------------------------
    const dependencyJobs = [];

    for (const dependencyJobId of uniqueDependencies) {
      const dependencyJob =
        await prisma.job.findUnique({
          where: {
            jobId: dependencyJobId,
          },
        });

      if (!dependencyJob) {
        return res.status(400).json({
          success: false,
          message:
            `Dependency job ${dependencyJobId} not found`,
        });
      }

      dependencyJobs.push(dependencyJob);
    }

    // -----------------------------------------
    // Determine dependency state
    // -----------------------------------------
    const hasDependencies =
      uniqueDependencies.length > 0;

    const allDependenciesCompleted =
      hasDependencies &&
      dependencyJobs.every(
        (dependency) =>
          dependency.status === STATUS.COMPLETED
      );

    // -----------------------------------------
    // Determine whether job can enter BullMQ
    // -----------------------------------------
    const canStart =
      !hasDependencies ||
      allDependenciesCompleted;

    // -----------------------------------------
    // Generate logical job ID
    // -----------------------------------------
    const logicalJobId =
      crypto.randomUUID();

    const scheduledAt =
      canStart && delay > 0
        ? new Date(Date.now() + delay)
        : null;

    const initialStatus = !canStart
      ? STATUS.BLOCKED
      : delay > 0
        ? STATUS.SCHEDULED
        : STATUS.WAITING;

    // -----------------------------------------
    // Create PostgreSQL logical Job
    // -----------------------------------------
    const dbJob = await prisma.job.create({
      data: {
        jobId: logicalJobId,

        // No BullMQ execution yet
        bullmqJobId: null,

        name,
        status: initialStatus,

        priority,
        progress: 0,

        payload: data || {},

        scheduledAt,

        attempts: 0,
        isDeadLetter: false,
      },
    });

    // -----------------------------------------
    // Create dependency records
    // -----------------------------------------
    if (hasDependencies) {
      await prisma.jobDependency.createMany({
        data: dependencyJobs.map(
          (dependencyJob) => ({
            jobId: dbJob.id,
            dependsOnJobId: dependencyJob.id,
          })
        ),
      });
    }

    // -----------------------------------------
    // If dependencies are satisfied,
    // create BullMQ execution
    // -----------------------------------------
    let bullmqJob = null;

    if (canStart) {
      bullmqJob = await jobQueue.add(
        name,
        {
          ...(data || {}),
          logicalJobId,
        },
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

      // -----------------------------------------
      // Store BullMQ execution ID
      // -----------------------------------------
      await prisma.job.update({
        where: {
          id: dbJob.id,
        },
        data: {
          bullmqJobId: String(bullmqJob.id),
        },
      });
    }

    // -----------------------------------------
    // Response
    // -----------------------------------------
    return res.status(201).json({
      success: true,
      message: "Job created successfully",

      job: {
        id: dbJob.id,
        jobId: dbJob.jobId,

        bullmqJobId: bullmqJob
          ? String(bullmqJob.id)
          : null,

        name: dbJob.name,
        status: initialStatus,

        priority: dbJob.priority,

        scheduledAt,

        dependsOn: uniqueDependencies,
      },
    });

  } catch (error) {
    console.error(
      "❌ Create job error:",
      error
    );

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
   if (!dbJob.bullmqJobId) {
  return res.status(409).json({
    success: false,
    message: "Job has no active BullMQ execution",
  });
}

const bullJob = await jobQueue.getJob(dbJob.bullmqJobId);

if (!bullJob) {
  return res.status(409).json({
    success: false,
    message: "Job is no longer available in the queue",
  });
}
    /*
     * Determine current BullMQ state.
     */
    const state = await bullJob.getState();

    console.log(
      `🛑 Cancellation requested for job ${id}. BullMQ state: ${state}`,
    );

    /*
     * WAITING / DELAYED
     *
     * These jobs have not started processing yet.
     * We can safely remove them from BullMQ.
     */
    if (state === "waiting" || state === "delayed") {
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

      console.log(`🛑 Job ${id} removed from queue and canceled`);

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

      console.log(`🛑 Job ${id} marked as canceled while active`);

      return res.status(200).json({
        success: true,
        message: "Job cancellation requested. Worker will stop processing.",
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
    if (state === "completed" || state === "failed") {
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

export const getJobAttempts = async (req, res) => {
  try {
    const { id } = req.params;

    const attempts = await getAttemptsByJobId(id);

    return res.status(200).json({
      success: true,
      jobId: id,
      attempts,
    });
  } catch (error) {
    console.error("❌ Get job attempts error:", error);

    if (error.message === "Job not found") {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to get job attempts",
    });
  }
};
