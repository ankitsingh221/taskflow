import jobQueue from "../queues/jobQueue.js";

export const getJobById = async (jobId) => {
  const job = await prisma.job.findUnique({
    where: {
      jobId,
    },
  });
  if (!job) {
    return null;
  }

  return job;

};