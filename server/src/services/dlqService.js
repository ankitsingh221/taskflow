import prisma from "../config/prisma.js";
import jobQueue from "../queues/jobQueue.js";

export const getDeadLetterJobs = async () => {
  return prisma.job.findMany({
    where: {
      isDeadLetter: true,
    },
    orderBy: {
      failedAt: "desc",
    },
  });
};

export const retryDeadLetterJob = async (jobId) => {
  const dbJob = await prisma.job.findUnique({
    where: {
      jobId,
    },
  });

  if (!dbJob) {
    throw new Error("Job not found");
  }

  if (!dbJob.isDeadLetter) {
    throw new Error("Job is not in dead letter queue");
  }

  /*
   * Create a NEW BullMQ execution.
   *
   * IMPORTANT:
   * The PostgreSQL logical jobId stays the same.
   *
   * Example:
   *
   * PostgreSQL logical jobId = ABC
   * Old BullMQ execution      = 74
   * New BullMQ execution      = 75
   *
   * The new BullMQ job receives ABC
   * through job.data.logicalJobId.
   */
  const newJob = await jobQueue.add(
    dbJob.name,
    {
      ...(dbJob.payload || {}),
      logicalJobId: dbJob.jobId,
    },
    {
      attempts: dbJob.maxAttempts,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
      removeOnComplete: false,
      removeOnFail: false,
    }
  );

  /*
   * Update the SAME logical PostgreSQL Job.
   *
   * We do NOT create another Job row.
   */
  await prisma.job.update({
    where: {
      jobId,
    },
    data: {
      bullmqJobId: String(newJob.id),

      status: "retrying",

      isDeadLetter: false,

      error: null,

      progress: 0,

     
      failedAt: null,

      startedAt: null,
      completedAt: null,
    },
  });

  console.log(
    `🔄 DLQ retry: logicalJobId=${dbJob.jobId}, ` +
      `new BullMQ execution=${newJob.id}`
  );

  return newJob;
};