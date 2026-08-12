import prisma from "../config/prisma.js";
import { wouldCreateCycle } from "../services/dependencyService.js";

export const addDependency = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { dependsOnJobId } = req.body;

    if (!dependsOnJobId) {
      return res.status(400).json({
        success: false,
        message: "dependsOnJobId is required",
      });
    }

    const logicalJobId = String(jobId);
    const logicalDependsOnJobId = String(dependsOnJobId);

    // Self dependency
    if (logicalJobId === logicalDependsOnJobId) {
      return res.status(400).json({
        success: false,
        message: "A job cannot depend on itself",
      });
    }

    // Find main job
    const job = await prisma.job.findUnique({
      where: {
        jobId: logicalJobId,
      },
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: `Job ${logicalJobId} not found`,
      });
    }

    // Find dependency job
    const dependencyJob = await prisma.job.findUnique({
      where: {
        jobId: logicalDependsOnJobId,
      },
    });

    if (!dependencyJob) {
      return res.status(404).json({
        success: false,
        message: `Dependency job ${logicalDependsOnJobId} not found`,
      });
    }

    // Duplicate dependency check
    const existingDependency =
      await prisma.jobDependency.findUnique({
        where: {
          jobId_dependsOnJobId: {
            jobId: job.id,
            dependsOnJobId: dependencyJob.id,
          },
        },
      });

    if (existingDependency) {
      return res.status(409).json({
        success: false,
        message: "Dependency already exists",
      });
    }

    // Circular dependency check
    const createsCycle = await wouldCreateCycle(
      job.id,
      dependencyJob.id
    );

    if (createsCycle) {
      return res.status(400).json({
        success: false,
        message:
          "Circular dependency detected. Dependency cannot be created.",
      });
    }

    // Create dependency
    const dependency = await prisma.jobDependency.create({
      data: {
        jobId: job.id,
        dependsOnJobId: dependencyJob.id,
      },
      include: {
        job: true,
        dependsOn: true,
      },
    });

    // Block the job
    if (
      job.status !== "completed" &&
      job.status !== "failed" &&
      job.status !== "canceled"
    ) {
      await prisma.job.update({
        where: {
          id: job.id,
        },
        data: {
          status: "blocked",
          bullmqJobId: null,
        },
      });
    }

    return res.status(201).json({
      success: true,
      message: "Dependency created successfully",
      dependency: {
        id: dependency.id,
        jobId: dependency.job.jobId,
        jobName: dependency.job.name,
        dependsOnJobId: dependency.dependsOn.jobId,
        dependsOnJobName: dependency.dependsOn.name,
        createdAt: dependency.createdAt,
      },
    });
  } catch (error) {
    console.error("❌ Add dependency error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create dependency",
      error: error.message,
    });
  }
};




export const getDependencies = async (req, res) => {
  try {
    const { jobId } = req.params;

    const job = await prisma.job.findUnique({
      where: {
        jobId: String(jobId),
      },
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    const dependencies = await prisma.jobDependency.findMany({
      where: {
        jobId: job.id,
      },
      include: {
        dependsOn: {
          select: {
            id: true,
            jobId: true,
            name: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return res.status(200).json({
      success: true,
      jobId: job.jobId,
      count: dependencies.length,
      dependencies,
    });
  } catch (error) {
    console.error("❌ Get dependencies error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch dependencies",
    });
  }
};