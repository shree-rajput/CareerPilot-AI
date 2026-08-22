import { Router } from "express";
import {
  getCareerIntelligenceSummary,
  getDashboardMetrics,
  getDistribution,
  getTrends
} from "../controllers/analyticsController.js";
import { requireAuth } from "../middleware/auth.js";

export const analyticsRouter = Router();

analyticsRouter.use(requireAuth);

analyticsRouter.get("/dashboard", getDashboardMetrics);
analyticsRouter.get("/career-intelligence", getCareerIntelligenceSummary);
analyticsRouter.get("/trends", getTrends);
analyticsRouter.get("/distribution", getDistribution);
