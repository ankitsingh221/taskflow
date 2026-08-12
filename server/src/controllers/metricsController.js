import {
  getMetrics,
} from "../services/metricsService.js";

export const getSystemMetrics = async (
  req,
  res,
) => {
  try {
    const metrics = await getMetrics();

    return res.status(200).json({
      success: true,
      metrics,
    });
  } catch (error) {
    console.error(
      "❌ Metrics error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch metrics",
      error: error.message,
    });
  }
};