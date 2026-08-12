import express from "express";
import {
  getDLQJobs,
  retryDLQJob,
} from "../controllers/dlqController.js";

const router = express.Router();

router.get("/", getDLQJobs);

router.post("/:jobId/retry", retryDLQJob);

export default router;