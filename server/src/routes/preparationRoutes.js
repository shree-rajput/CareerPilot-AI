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

// Schedule & Timer Persistence Endpoints
router.post("/schedule", preparationController.updateSchedulePreferences);
router.get("/timer", preparationController.getTimerState);
router.post("/timer/start", preparationController.startTimerSession);
router.post("/timer/pause", preparationController.pauseTimerSession);
router.post("/timer/resume", preparationController.resumeTimerSession);
router.post("/timer/complete", preparationController.completeTimerSession);
router.post("/timer/reset", preparationController.resetTimerSession);
router.post("/timer/add-time", preparationController.addTimerMinutes);

export default router;
