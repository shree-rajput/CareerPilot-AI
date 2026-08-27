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

export default router;
