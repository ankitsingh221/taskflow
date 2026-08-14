import {
  getDeadLetterJobs,
  retryDeadLetterJob,
} from "../services/dlqService.js";

export const getDLQJobs = async (req, res) => {
  try {
    const jobs = await getDeadLetterJobs();

    return res.status(200).json({
      success: true,
      count: jobs.length,
      jobs,
    });
  } catch (error) {
    console.error("❌ Failed to fetch DLQ jobs:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch dead letter jobs",
    });
  }
};


export const retryDLQJob = async (req, res) => {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      return res.status(400).json({
        success: false,
        message: "Job ID is required",
      });
    }

    const newJob = await retryDeadLetterJob(jobId);

    return res.status(200).json({
      success: true,
      message: "Dead-letter job retried successfully",
      job: {
        jobId,
        bullmqJobId: String(newJob.id),
        name: newJob.name,
      },
    });
  } catch (error) {
    console.error("❌ Failed to retry DLQ job:", error);

    if (error.message === "Job not found") {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    if (error.message === "Job is not in dead letter queue") {
      return res.status(409).json({
        success: false,
        message: "Job is not in dead letter queue",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to retry dead-letter job",
    });
  }
};