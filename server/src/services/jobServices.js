import jobQueue from "../queues/jobQueue.js";
import prisma from "../config/prisma.js"; // ✅ Add this import!

export const getJobById = async (jobId) => {
  try {
    const job = await prisma.job.findUnique({
      where: {
        jobId: jobId,
      },
    });
    
    if (!job) {
      return null;
    }

    return job;
  } catch (error) {
    console.error("❌ Error fetching job by ID:", error);
    throw error;
  }
};