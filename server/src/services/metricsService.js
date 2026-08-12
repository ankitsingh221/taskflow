import prisma from "../config/prisma.js";
import jobQueue from "../queues/jobQueue.js";
import {
  getEffectiveStatus,
} from "./workerHealthService.js";

export const getMetrics = async () => {
  /*
   * ------------------------------------------------------------
   * PostgreSQL JOB METRICS
   * ------------------------------------------------------------
   */

  const [
    total,
    waiting,
    scheduled,
    blocked,
    active,
    completed,
    failed,
    retrying,
    canceled,
    deadLetter,
  ] = await Promise.all([
    prisma.job.count(),

    prisma.job.count({
      where: {
        status: "waiting",
      },
    }),

    prisma.job.count({
      where: {
        status: "scheduled",
      },
    }),

    prisma.job.count({
      where: {
        status: "blocked",
      },
    }),

    prisma.job.count({
      where: {
        status: "active",
      },
    }),

    prisma.job.count({
      where: {
        status: "completed",
      },
    }),

    prisma.job.count({
      where: {
        status: "failed",
      },
    }),

    prisma.job.count({
      where: {
        status: "retrying",
      },
    }),

    prisma.job.count({
      where: {
        status: "canceled",
      },
    }),

    prisma.job.count({
      where: {
        isDeadLetter: true,
      },
    }),
  ]);

  /*
   * ------------------------------------------------------------
   * BULLMQ QUEUE METRICS
   * ------------------------------------------------------------
   */

  const queueCounts = await jobQueue.getJobCounts(
    "waiting",
    "active",
    "completed",
    "failed",
    "delayed",
    "paused",
  );

  /*
   * ------------------------------------------------------------
   * PROCESSING TIME
   * ------------------------------------------------------------
   */

  const durationAggregate =
    await prisma.jobAttempt.aggregate({
      _avg: {
        duration: true,
      },
    });

  const averageProcessingTime =
    durationAggregate._avg.duration ?? 0;

  /*
   * ------------------------------------------------------------
   * QUEUE LATENCY
   * createdAt -> startedAt
   * ------------------------------------------------------------
   */

  const startedJobs =
    await prisma.job.findMany({
      where: {
        startedAt: {
          not: null,
        },
      },
      select: {
        createdAt: true,
        startedAt: true,
      },
    });

  let totalQueueLatency = 0;

  for (const job of startedJobs) {
    if (job.startedAt) {
      totalQueueLatency +=
        job.startedAt.getTime() -
        job.createdAt.getTime();
    }
  }

  const averageQueueLatency =
    startedJobs.length > 0
      ? totalQueueLatency /
        startedJobs.length
      : 0;

  /*
   * ------------------------------------------------------------
   * ATTEMPT METRICS
   * ------------------------------------------------------------
   */

  const [
    totalAttempts,
    failedAttempts,
    completedAttempts,
  ] = await Promise.all([
    prisma.jobAttempt.count(),

    prisma.jobAttempt.count({
      where: {
        status: "failed",
      },
    }),

    prisma.jobAttempt.count({
      where: {
        status: "completed",
      },
    }),
  ]);

  /*
   * ------------------------------------------------------------
   * WORKER METRICS
   *
   * Use effective status so heartbeat timeout
   * is reflected as stale.
   * ------------------------------------------------------------
   */

  const workers =
    await prisma.worker.findMany({
      select: {
        workerId: true,
        status: true,
        lastHeartbeat: true,
      },
    });

  let healthyWorkers = 0;
  let staleWorkers = 0;
  let stoppedWorkers = 0;

  for (const worker of workers) {
    const status =
      getEffectiveStatus(worker);

    if (status === "healthy") {
      healthyWorkers++;
    }

    if (status === "stale") {
      staleWorkers++;
    }

    if (status === "stopped") {
      stoppedWorkers++;
    }
  }

  /*
   * ------------------------------------------------------------
   * RETURN METRICS
   * ------------------------------------------------------------
   */

  return {
    jobs: {
      total,
      waiting,
      scheduled,
      blocked,
      active,
      completed,
      failed,
      retrying,
      canceled,
      deadLetter,
    },

    queue: {
      waiting: queueCounts.waiting ?? 0,
      active: queueCounts.active ?? 0,
      completed: queueCounts.completed ?? 0,
      failed: queueCounts.failed ?? 0,
      delayed: queueCounts.delayed ?? 0,
      paused: queueCounts.paused ?? 0,
    },

    performance: {
      averageProcessingTimeMs:
        Math.round(
          averageProcessingTime,
        ),

      averageQueueLatencyMs:
        Math.round(
          averageQueueLatency,
        ),
    },

    attempts: {
      total: totalAttempts,
      failed: failedAttempts,
      completed: completedAttempts,
    },

    workers: {
      healthy: healthyWorkers,
      stale: staleWorkers,
      stopped: stoppedWorkers,
      total: workers.length,
    },
  };
};