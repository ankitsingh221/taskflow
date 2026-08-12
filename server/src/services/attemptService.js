import prisma from "../config/prisma.js";

export const getAttemptsByJobId = async (jobId) => {
  const dbJob = await prisma.job.findUnique({
    where: {
      jobId: String(jobId),
    },
  });

  if (!dbJob) {
    throw new Error("Job not found");
  }

  const attempts = await prisma.jobAttempt.findMany({
    where: {
      jobId: dbJob.id,
    },
    orderBy: {
      attemptNumber: "asc",
    },
  });

  return attempts;
};