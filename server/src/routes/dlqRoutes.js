import express from "express";
import { getDLQJobs } from "../controllers/dlqController.js";

const router = express.Router();

router.get("/", getDLQJobs);

export default router;