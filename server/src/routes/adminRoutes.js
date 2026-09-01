import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  getPendingMentors,
  updateMentorVerification
} from "../controllers/adminController.js";

const router = Router();
router.use(requireAuth);

router.get("/mentors/pending", getPendingMentors);
router.patch("/mentors/:mentorId/verify", updateMentorVerification);

export default router;
