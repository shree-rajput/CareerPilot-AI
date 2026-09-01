import express from "express";
import * as preparationController from "../controllers/preparationController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.use(requireAuth);

// Skill-Gap Resolution & Preparation Center Dashboard
router.get("/dashboard", preparationController.getPreparationDashboard);
router.patch("/skills/:skillName/status", preparationController.updateSkillStatus);
router.patch("/skills/:skillName/step", preparationController.toggleActionPlanStep);
router.get("/skills/:skillName/assessment", preparationController.generateSkillVerificationAssessment);
router.post("/skills/:skillName/verify", preparationController.submitSkillVerificationAssessment);

// Daily Plan endpoints
router.post("/", preparationController.generateDailyPlan);
router.get("/active", preparationController.getActivePlan);
router.patch("/:id/archive", preparationController.archivePlan);
router.patch("/:id/items/:itemId/status", preparationController.updateActionItemStatus);

export default router;
