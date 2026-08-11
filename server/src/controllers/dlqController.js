import { getDeadLetterJobs } from "../services/dlqService.js";

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