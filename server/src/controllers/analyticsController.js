import { getDashboardStats, getApplicationTrends, getStatusDistribution } from "../services/analytics/analyticsService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * GET /api/analytics/dashboard
 */
export const getDashboardMetrics = asyncHandler(async (req, res) => {
  const stats = await getDashboardStats(req.user._id);
  return res.json({ stats });
});

/**
 * GET /api/analytics/trends
 */
export const getTrends = asyncHandler(async (req, res) => {
  const trends = await getApplicationTrends(req.user._id);
  return res.json({ trends });
});

/**
 * GET /api/analytics/distribution
 */
export const getDistribution = asyncHandler(async (req, res) => {
  const distribution = await getStatusDistribution(req.user._id);
  return res.json({ distribution });
});
