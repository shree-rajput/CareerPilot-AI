import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { getActiveSession } from "../controllers/sessionController.js";

const router = express.Router();

router.use(requireAuth);
router.get("/active", getActiveSession);

export default router;
