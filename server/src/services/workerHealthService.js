import prisma from "../config/prisma.js";

const HEARTBEAT_INTERVAL = 5000;

/*
 * A worker is considered stale when no heartbeat
 * has been received for this amount of time.
 *
 * Keep this comfortably larger than HEARTBEAT_INTERVAL.
 */
const STALE_AFTER_MS = 15_000;

const WORKER_STATUS = {
  STARTING: "starting",
  HEALTHY: "healthy",
  STOPPING: "stopping",
  STOPPED: "stopped",
  STALE: "stale",
};

/*
 * Get the effective worker status.
 *
 * STOPPED must remain STOPPED even if the last
 * heartbeat is old.
 */
export const getEffectiveStatus = (worker) => {
  if (!worker) {
    return WORKER_STATUS.STALE;
  }

  /*
   * Explicitly stopped workers are NEVER stale.
   */
  if (worker.status === WORKER_STATUS.STOPPED) {
    return WORKER_STATUS.STOPPED;
  }

  /*
   * Stopping workers are also not stale.
   */
  if (worker.status === WORKER_STATUS.STOPPING) {
    return WORKER_STATUS.STOPPING;
  }

  /*
   * Check heartbeat freshness.
   */
  if (!worker.lastHeartbeat) {
    return WORKER_STATUS.STALE;
  }

  const age =
    Date.now() - new Date(worker.lastHeartbeat).getTime();

  if (age > STALE_AFTER_MS) {
    return WORKER_STATUS.STALE;
  }

  return worker.status || WORKER_STATUS.HEALTHY;
};

/*
 * Register worker.
 */
export const registerWorker = async ({
  workerId,
  concurrency,
}) => {
  const now = new Date();

  const worker = await prisma.worker.upsert({
    where: {
      workerId,
    },

    update: {
      status: WORKER_STATUS.HEALTHY,
      startedAt: now,
      lastHeartbeat: now,
      activeJobs: 0,
      concurrency,
      stoppedAt: null,
    },

    create: {
      workerId,
      status: WORKER_STATUS.HEALTHY,
      startedAt: now,
      lastHeartbeat: now,
      activeJobs: 0,
      concurrency,
      stoppedAt: null,
    },
  });

  console.log(
    `💚 [${workerId}] Worker registered | concurrency=${concurrency}`,
  );

  return worker;
};

/*
 * Increment active jobs.
 */
export const incrementActiveJobs = async (workerId) => {
  try {
    const worker = await prisma.worker.update({
      where: {
        workerId,
      },

      data: {
        activeJobs: {
          increment: 1,
        },
      },

      select: {
        workerId: true,
        activeJobs: true,
      },
    });

    console.log(
      `📈 [${workerId}] activeJobs=${worker.activeJobs}`,
    );

    return worker;
  } catch (error) {
    console.error(
      `❌ [${workerId}] Failed to increment activeJobs:`,
      error.message,
    );

    throw error;
  }
};

/*
 * Decrement active jobs.
 *
 * Prevent negative values.
 */
export const decrementActiveJobs = async (workerId) => {
  try {
    const worker = await prisma.worker.findUnique({
      where: {
        workerId,
      },

      select: {
        activeJobs: true,
      },
    });

    if (!worker) {
      console.warn(
        `⚠️ [${workerId}] Worker not found while decrementing activeJobs`,
      );

      return null;
    }

    const nextActiveJobs = Math.max(
      0,
      worker.activeJobs - 1,
    );

    const updatedWorker = await prisma.worker.update({
      where: {
        workerId,
      },

      data: {
        activeJobs: nextActiveJobs,
      },

      select: {
        workerId: true,
        activeJobs: true,
      },
    });

    console.log(
      `📉 [${workerId}] activeJobs=${updatedWorker.activeJobs}`,
    );

    return updatedWorker;
  } catch (error) {
    console.error(
      `❌ [${workerId}] Failed to decrement activeJobs:`,
      error.message,
    );

    throw error;
  }
};

/*
 * Send heartbeat.
 */
export const sendHeartbeat = async (workerId) => {
  try {
    const worker = await prisma.worker.update({
      where: {
        workerId,
      },

      data: {
        status: WORKER_STATUS.HEALTHY,
        lastHeartbeat: new Date(),
      },

      select: {
        workerId: true,
        activeJobs: true,
        lastHeartbeat: true,
      },
    });

    console.log(
      `💓 [${workerId}] heartbeat | activeJobs=${worker.activeJobs}`,
    );

    return worker;
  } catch (error) {
    console.error(
      `❌ [${workerId}] Heartbeat failed:`,
      error.message,
    );

    return null;
  }
};

/*
 * Start heartbeat.
 */
export const startHeartbeat = (workerId) => {
  /*
   * Send immediately.
   */
  void sendHeartbeat(workerId);

  /*
   * Then continue periodically.
   */
  const timer = setInterval(() => {
    void sendHeartbeat(workerId);
  }, HEARTBEAT_INTERVAL);

  return timer;
};

/*
 * Stop heartbeat and mark worker STOPPED.
 *
 * IMPORTANT:
 *
 * We update PostgreSQL BEFORE clearing the interval.
 *
 * This is important on Windows/Ctrl+C because if we
 * clear the only active timer first, Node can terminate
 * while the Prisma promise is still pending.
 */
export const stopHeartbeat = async ({
  workerId,
  timer,
}) => {
  console.log(
    `🛑 [${workerId}] Stopping heartbeat...`,
  );

  /*
   * Stop sending new heartbeats immediately.
   *
   * IMPORTANT:
   * Do NOT disconnect Prisma here.
   */
  if (timer) {
    clearInterval(timer);
  }

  try {
    console.log(
      `🗄️ [${workerId}] Updating worker status to STOPPED...`,
    );

    const now = new Date();

    const worker = await prisma.worker.update({
      where: {
        workerId,
      },

      data: {
        status: WORKER_STATUS.STOPPED,
        stoppedAt: now,
        lastHeartbeat: now,
      },
    });

    console.log(
      `✅ [${workerId}] Worker status updated to STOPPED`,
    );

    console.log(
      `🛑 [${workerId}] stoppedAt=${worker.stoppedAt}`,
    );

    return worker;
  } catch (error) {
    console.error(
      `❌ [${workerId}] Failed to update STOPPED status:`,
      error,
    );

    throw error;
  }
};

export {
  WORKER_STATUS,
  HEARTBEAT_INTERVAL,
  STALE_AFTER_MS,
};