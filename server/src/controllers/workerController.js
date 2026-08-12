import prisma from "../config/prisma.js";
import { getEffectiveStatus } from "../services/workerHealthService.js";

/**
 * Get all workers.
 */
export const getWorkers = async (req, res) => {
  try {
    const workers = await prisma.worker.findMany({
      orderBy: {
        createdAt: "asc",
      },
    });

    const effectiveWorkers = workers.map((worker) => ({
      ...worker,
      status: getEffectiveStatus(worker),
    }));

    return res.status(200).json({
      success: true,
      count: effectiveWorkers.length,
      workers: effectiveWorkers,
    });
  } catch (error) {
    console.error("❌ Failed to fetch workers:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch workers",
      error: error.message,
    });
  }
};

/**
 * Get a single worker.
 */
export const getWorker = async (req, res) => {
  try {
    const { workerId } = req.params;

    const worker = await prisma.worker.findUnique({
      where: {
        workerId,
      },
    });

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: `Worker ${workerId} not found`,
      });
    }

    return res.status(200).json({
      success: true,
      worker: {
        ...worker,
        status: getEffectiveStatus(worker),
      },
    });
  } catch (error) {
    console.error("❌ Failed to fetch worker:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch worker",
      error: error.message,
    });
  }
};