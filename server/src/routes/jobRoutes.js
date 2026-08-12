import express from "express";
import {
  createJob,
  getJobStatus,
  cancelJob,
} from "../controllers/jobController.js";

const router = express.Router();

router.post("/", createJob);
router.get("/:id", getJobStatus);

// Cancel a job
router.post("/:id/cancel", cancelJob);

export default router;