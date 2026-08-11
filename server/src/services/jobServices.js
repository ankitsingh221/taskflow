import jobQueue from "../queues/jobQueue.js";

export const getJobById = async (jobId) => {
  const job = await jobQueue.getJob(jobId);

  if (!job) {
    return null;
  }

  const state = await job.getState();

  return {
    id: job.id,
    name: job.name,
    data: job.data,
    state,
    progress: job.progress,
    result: job.returnvalue,
    failedReason: job.failedReason || null,
    attemptsMade: job.attemptsMade,
    createdAt: new Date(job.timestamp),
    processedAt: job.processedOn
      ? new Date(job.processedOn)
      : null,
    finishedAt: job.finishedOn
      ? new Date(job.finishedOn)
      : null,
  };
};