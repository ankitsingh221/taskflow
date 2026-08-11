import jobQueue from "../queues/jobQueue.js";
import { getJobById } from "../services/jobServices.js";

export const createJob = async (req, res) => {
  try {
    const { name, data } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Job name is required",
      });
    }
    console.log("Adding job to queue...");
    console.log("Name:", name);
    console.log("Data:", data);

    const job = await jobQueue.add(name, data || {});
    const dbJob = await prisma.job.create({
      data: {
        jobId: job.id,
        name: job.name,
        status: "waiting",
        progress: 0,
        payload: data || {},
      },
    });

    return res.status(201).json({
      success: true,
      message: "Job created successfully",
     job: {
        id: dbJob.id,
        jobId: dbJob.jobId,
        name: dbJob.name,
        status: dbJob.status,
      },
    });
  } catch (error) {
    console.error("❌ Create job error:");
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to create job",
      error: error.message,
    });
  }
};

export const getJobStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const job = await getJobById(id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    return res.status(200).json({
      success: true,
      job,
    });
  } catch (error) {
    console.error("❌ Get job status error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get job status",
    });
  }
};
