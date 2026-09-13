import rateLimit from "express-rate-limit";

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per 15 minutes
  message: {
    success: false,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many auth requests from this IP, please try again later."
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});
