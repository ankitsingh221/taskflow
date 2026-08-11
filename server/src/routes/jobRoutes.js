import express from "express";
import { createJob, getJobStatus } from "../controllers/jobController.js";


const router = express.Router();

router.post("/", createJob);
router.get("/:id", getJobStatus);

export default router;