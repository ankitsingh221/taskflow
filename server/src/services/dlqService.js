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

  const newJob = await jobQueue.add(
    dbJob.name,
    dbJob.payload || {},
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

  await prisma.job.update({
    where: {
      jobId,
    },
    data: {
      status: "retrying",
      isDeadLetter: false,
      error: null,
      progress: 0,
      attempts: 0,
      failedAt: null,
    },
  });

  return newJob;
};

