import prisma from "../config/prisma.js";
import jobQueue from "../queues/jobQueue.js";

export const resolveDependents = async (jobId) => {
  const dependents = await prisma.jobDependency.findMany({
    where: {
      dependsOnJobId: jobId,
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

    /*
     * Check if ANY dependency failed.
     */
    const hasFailedDependency = allDependencies.some(
      (dependency) =>
        dependency.dependsOn.status === "failed"
    );

    if (hasFailedDependency) {
      console.log(
        `❌ Job ${dependentJob.jobId} has a failed dependency.`
      );

      await prisma.job.update({
        where: {
          id: dependentJob.id,
        },
        data: {
          status: "failed",
          isDeadLetter: false,
          error: "Dependency job failed",
          failedAt: new Date(),
        },
      });

      console.log(
        `💀 Job ${dependentJob.jobId} marked as failed because dependency failed`
      );

      /*
       * IMPORTANT:
       *
       * If another job depends on this job,
       * propagate the failure further.
       *
       * Example:
       *
       * A → B → C
       *
       * A fails
       * B fails
       * C must also fail
       */
      await resolveDependents(dependentJob.id);

      continue;
    }

    /*
     * Check whether ALL dependencies completed.
     */
    const allCompleted = allDependencies.every(
      (dependency) =>
        dependency.dependsOn.status === "completed"
    );

    if (!allCompleted) {
      continue;
    }

    console.log(
      `🔓 Job ${dependentJob.jobId} dependencies completed. Releasing job.`
    );

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
      }
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
      `🚀 Job ${dependentJob.jobId} added to BullMQ as ${bullmqJob.id}`
    );
  }
};