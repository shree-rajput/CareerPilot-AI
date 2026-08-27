import express from "express";
import * as skillController from "../controllers/skillController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.use(requireAuth);

router.post("/normalize", skillController.normalizeSkill);
router.post("/update", skillController.updateUserSkill);
router.post("/gaps", skillController.calculateSkillGaps);
router.get("/", skillController.getUserSkills);

export default router;
