import crypto from "crypto";
import jobQueue from "../queues/jobQueue.js";
import { getJobById } from "../services/jobServices.js";
import prisma from "../config/prisma.js";
import { getAttemptsByJobId } from "../services/attemptService.js";
import { wouldCreateCycle } from "../services/dependencyService.js";

const MAX_DELAY = 7 * 24 * 60 * 60 * 1000;
const MAX_QUEUE_SIZE = parseInt(process.env.MAX_QUEUE_SIZE || 100);

const STATUS = {
  WAITING: "waiting",
  SCHEDULED: "scheduled",
  BLOCKED: "blocked",
  ACTIVE: "active",
  COMPLETED: "completed",
  FAILED: "failed",
  RETRYING: "retrying",
  CANCELED: "canceled",
};


export const createJob = async (req, res) => {
  try {
    const {
      name,
      data,
      priority = 1,
      delay = 0,
      dependsOn = [],
    } = req.body;

  
    // 1. Read Idempotency-Key
   

    const idempotencyKey = req.get("Idempotency-Key");

 
    // 2. Validate basic fields


    if (
      typeof name !== "string" ||
      !name.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Job name is required",
      });
    }

    if (
      data !== undefined &&
      data !== null &&
      typeof data !== "object"
    ) {
      return res.status(400).json({
        success: false,
        message: "Payload must be a JSON object",
      });
    }

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

    // 3. Validate Idempotency-Key


    if (idempotencyKey && idempotencyKey.length > 255) {
      return res.status(400).json({
        success: false,
        message: "Idempotency-Key cannot exceed 255 characters",
      });
    }


    // 4. Check existing idempotent request


    if (idempotencyKey) {
      const existingJob = await prisma.job.findUnique({
        where: {
          idempotencyKey,
        },
      });

      if (existingJob) {
        // Same key but different job name
        if (existingJob.name !== name) {
          return res.status(409).json({
            success: false,
            message:
              "Idempotency-Key already used for a different job",
          });
        }

        // Same key = return original job
        return res.status(200).json({
          success: true,
          message: "Job already exists",
          idempotent: true,

          job: {
            id: existingJob.id,
            jobId: existingJob.jobId,
            bullmqJobId: existingJob.bullmqJobId,
            name: existingJob.name,
            status: existingJob.status,
            priority: existingJob.priority,
            progress: existingJob.progress,
            scheduledAt: existingJob.scheduledAt,
          },
        });
      }
    }

    

    if (!Array.isArray(dependsOn)) {
      return res.status(400).json({
        success: false,
        message: "dependsOn must be an array",
      });
    }

    const dependencyIds = dependsOn.map(String);

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

    
    // 6. Find dependency jobs
  

    const dependencyJobs = [];

    for (const dependencyJobId of uniqueDependencies) {
      const dependencyJob = await prisma.job.findUnique({
        where: {
          jobId: dependencyJobId,
        },
      });

      if (!dependencyJob) {
        return res.status(400).json({
          success: false,
          message: `Dependency job ${dependencyJobId} not found`,
        });
      }

      dependencyJobs.push(dependencyJob);
    }

    // 7. Determine dependency state
  

    const hasDependencies =
      uniqueDependencies.length > 0;

    const allDependenciesCompleted =
      hasDependencies &&
      dependencyJobs.every(
        (dependency) =>
          dependency.status === STATUS.COMPLETED
      );

    const canStart =
      !hasDependencies ||
      allDependenciesCompleted;

  
    // 8. Queue capacity check
    //
    // Only check BullMQ capacity if this job will actually
    // enter BullMQ now.
   
    if (canStart) {
      const waitingCount =
        await jobQueue.getWaitingCount();

      if (waitingCount >= MAX_QUEUE_SIZE) {
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
    }

    // 9. Generate logical Job ID


    const logicalJobId = crypto.randomUUID();


    // 10. Determine initial status


    const scheduledAt =
      canStart && delay > 0
        ? new Date(Date.now() + delay)
        : null;

    const initialStatus = !canStart
      ? STATUS.BLOCKED
      : delay > 0
        ? STATUS.SCHEDULED
        : STATUS.WAITING;

    // 11. Create PostgreSQL logical Job


    const dbJob = await prisma.job.create({
      data: {
        jobId: logicalJobId,

        // BullMQ execution doesn't exist yet
        bullmqJobId: null,

        // Idempotency
        idempotencyKey:
          idempotencyKey || null,

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


    // 12. Circular dependency detection
    //
    // IMPORTANT:
    //
    // Now we finally have dbJob.id.
    //
    // We can safely ask:
    //
    // "If newJob depends on dependencyJob,
    //  would that create a cycle?"


    for (const dependencyJob of dependencyJobs) {
      const cycleDetected =
        await wouldCreateCycle(
          dbJob.id,
          dependencyJob.id
        );

      if (cycleDetected) {
        // Remove the logical job because we cannot keep
        // an invalid circular dependency.
        await prisma.job.delete({
          where: {
            id: dbJob.id,
          },
        });

        return res.status(400).json({
          success: false,
          message:
            "Circular dependency detected",
          dependency: dependencyJob.jobId,
        });
      }
    }

 
    // 13. Create dependency records


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

    // 14. Add to BullMQ if dependencies are satisfied
    

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

      // 15. Store BullMQ execution ID
 

      await prisma.job.update({
        where: {
          id: dbJob.id,
        },

        data: {
          bullmqJobId: String(bullmqJob.id),
        },
      });
    }


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

        progress: dbJob.progress,

        scheduledAt,

        dependsOn: uniqueDependencies,

        idempotencyKey:
          idempotencyKey || null,
      },
    });
  } catch (error) {
    console.error(
      "❌ Create job error:",
      error
    );

    
    // 17. Handle Idempotency race condition
    //
    // Two requests can arrive at exactly the same time.
    //
    // Both may pass findUnique().
    //
    // PostgreSQL UNIQUE constraint will allow only one.
    // The other produces Prisma P2002.
  

    if (
      error.code === "P2002" &&
      idempotencyKey
    ) {
      try {
        const existingJob =
          await prisma.job.findUnique({
            where: {
              idempotencyKey,
            },
          });

        if (existingJob) {
          if (existingJob.name !== name) {
            return res.status(409).json({
              success: false,
              message:
                "Idempotency-Key already used for a different job",
            });
          }

          return res.status(200).json({
            success: true,
            message: "Job already exists",
            idempotent: true,

            job: {
              id: existingJob.id,
              jobId: existingJob.jobId,
              bullmqJobId:
                existingJob.bullmqJobId,
              name: existingJob.name,
              status: existingJob.status,
              priority: existingJob.priority,
              progress: existingJob.progress,
              scheduledAt:
                existingJob.scheduledAt,
            },
          });
        }
      } catch (lookupError) {
        console.error(
          "❌ Failed to retrieve idempotent job:",
          lookupError
        );
      }
    }

  

    return res.status(500).json({
      success: false,
      message: "Failed to create job",
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


export const cancelJob = async (req, res) => {
  try {
    const { id } = req.params;

    
      // First find the logical job in PostgreSQL.
     
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

    
    //  Terminal states cannot be cancelled.
     
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

    
      // Get corresponding BullMQ job.
     
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
    
      // Determine current BullMQ state.
    
    const state = await bullJob.getState();

    console.log(
      `🛑 Cancellation requested for job ${id}. BullMQ state: ${state}`,
    );

    /*
      WAITING / DELAYED
      These jobs have not started processing yet.
      We can safely remove them from BullMQ.
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
      ACTIVE
     
      The worker already has the job.
     
      We DO NOT remove the BullMQ job here.
     
      Instead PostgreSQL becomes:
     
      active → canceled
     
      The worker periodically checks PostgreSQL
      and throws JobCanceledError when it detects
     the cancellation.
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
      RETRYING jobs can be represented by a delayed
    BullMQ job waiting for the next retry.
     
      If BullMQ says delayed, the code above already
      handles it.
     */

   
    if (state === "completed" || state === "failed") {
      return res.status(409).json({
        success: false,
        message: `Job is already ${state} and cannot be canceled`,
      });
    }

    
    //  Fallback for unexpected BullMQ states.
     
    return res.status(409).json({
      success: false,
      message: `Job cannot be canceled in its current state: ${state}`,
    });
  } catch (error) {
    console.error("❌ Cancel job error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to cancel job",
    });
  }
};


export const listJobs = async (req, res) => {
  try {
    const {
      search,
      status,
      page = 1,
      limit = 20,
    } = req.query;

    const pageNumber = Math.max(
      1,
      parseInt(page, 10) || 1
    );
    const pageLimit = Math.min(
      100,
      Math.max(1, parseInt(limit, 10) || 20)
    );

    const where = {};

    if (
      status &&
      status !== "all"
    ) {
      if (status === "dlq") {
        where.isDeadLetter = true;
      } else {
        where.status = status;
      }
    }

    if (search && search.trim()) {
      const term = search.trim();

      where.OR = [
        {
          name: {
            contains: term,
            mode: "insensitive",
          },
        },
        {
          jobId: {
            contains: term,
            mode: "insensitive",
          },
        },
      ];
    }

    const [total, jobs] =
      await Promise.all([
        prisma.job.count({ where }),

        prisma.job.findMany({
          where,
          orderBy: {
            createdAt: "desc",
          },
          skip: (pageNumber - 1) * pageLimit,
          take: pageLimit,
        }),
      ]);

    return res.status(200).json({
      success: true,
      jobs,
      total,
      page: pageNumber,
      limit: pageLimit,
      totalPages: Math.max(
        1,
        Math.ceil(total / pageLimit)
      ),
    });
  } catch (error) {
    console.error(
      "❌ Failed to list jobs:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch jobs",
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
    console.error(" Get job attempts error:", error);

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
