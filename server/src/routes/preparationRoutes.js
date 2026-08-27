import express from "express";
import * as preparationController from "../controllers/preparationController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.use(requireAuth);

router.post("/", preparationController.generateDailyPlan);
router.get("/active", preparationController.getActivePlan);
router.patch("/:id/archive", preparationController.archivePlan);
router.patch("/:id/items/:itemId/status", preparationController.updateActionItemStatus);

export default router;
