import express from "express";
import * as jobController from "../controllers/jobController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.use(requireAuth);

router.post("/", jobController.createJob);
router.get("/", jobController.getJobs);
router.get("/:id", jobController.getJobById);
router.patch("/:id", jobController.updateJob);
router.delete("/:id", jobController.deactivateJob);

// New AI-powered endpoints
router.post("/:id/save", jobController.saveJob);
router.post("/:id/match", jobController.matchJob);
router.post("/:id/should-apply", jobController.shouldApply);

export default router;
