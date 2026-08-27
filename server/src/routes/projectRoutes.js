import express from "express";
import * as projectController from "../controllers/projectController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.use(requireAuth);

router.post("/", projectController.createProject);
router.get("/", projectController.getProjects);
router.get("/:id", projectController.getProjectById);
router.post("/:id/interview-kit", projectController.generateInterviewKit);

export default router;
