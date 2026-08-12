import prisma from "../config/prisma.js";
import jobQueue from "../queues/jobQueue.js";

export const resolveDependents = async (completedJobId) => {
  const dependents = await prisma.jobDependency.findMany({
    where: {
      dependsOnJobId: completedJobId,
    },
    include: {
      job: true,
    },
  });

  for (const dependency of dependents) {
    const dependentJob = dependency.job;

    // Only resolve blocked jobs
    if (dependentJob.status !== "blocked") {
      continue;
    }

    const allDependencies = await prisma.jobDependency.findMany({
      where: {
        jobId: dependentJob.id,
      },
      include: {
        dependsOn: true,
      },
    });

    const allCompleted = allDependencies.every(
      (dependency) => dependency.dependsOn.status === "completed",
    );

    if (!allCompleted) {
      continue;
    }

    console.log(
      `🔓 Job ${dependentJob.jobId} dependencies completed. Releasing job.`,
    );

    /*
     * IMPORTANT:
     * Pass the logical job ID to BullMQ.
     *
     * The worker uses:
     *
     * job.data.logicalJobId
     *
     * to find the PostgreSQL Job.
     */
    const bullmqJob = await jobQueue.add(
      dependentJob.name,
      {
        ...(dependentJob.payload || {}),
        logicalJobId: dependentJob.jobId,
      },
      {
        priority: dependentJob.priority,
        attempts: dependentJob.maxAttempts,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    await prisma.job.update({
      where: {
        id: dependentJob.id,
      },
      data: {
        status: "waiting",
        bullmqJobId: String(bullmqJob.id),
      },
    });

    console.log(
      `🚀 Job ${dependentJob.jobId} added to BullMQ as ${bullmqJob.id}`,
    );
  }
};