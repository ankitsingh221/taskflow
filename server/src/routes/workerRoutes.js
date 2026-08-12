import express from "express";

import {
  getWorkers,
  getWorker,
} from "../controllers/workerController.js";

const router = express.Router();

router.get("/", getWorkers);

router.get("/:workerId", getWorker);

export default router;