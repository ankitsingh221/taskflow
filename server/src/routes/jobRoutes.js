import express from "express";

import {
  createJob,
  listJobs,
  getJobStatus,
  getJobAttempts,
  cancelJob,
} from "../controllers/jobController.js";

import jobCreationRateLimiter from "../middleware/rateLimiter.js";

const router = express.Router();

router.post(
  "/",
  jobCreationRateLimiter,
  createJob
);

router.get("/", listJobs);

router.get("/:id", getJobStatus);

router.get("/:id/attempts", getJobAttempts);

// Cancel a job
router.post("/:id/cancel", cancelJob);

export default router;