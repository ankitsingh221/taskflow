import express from "express";

import {
  addDependency,
  getDependencies,
} from "../controllers/dependencyController.js";

const router = express.Router();

/*
 * Add dependency
 *
 * POST /api/dependencies/:jobId
 */
router.post("/:jobId", addDependency);

/*
 * Get dependencies
 *
 * GET /api/dependencies/:jobId
 */
router.get("/:jobId", getDependencies);

export default router;