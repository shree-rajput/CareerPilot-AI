import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

// Routers
import { analyticsRouter } from "./routes/analyticsRoutes.js";
import { applicationRouter } from "./routes/applicationRoutes.js";
import { authRouter } from "./routes/authRoutes.js";
import { router as interviewRouter } from "./routes/interviewRoutes.js";
import { matchRouter } from "./routes/matchRoutes.js";
import { profileRouter } from "./routes/profileRoutes.js";
import { resumeRouter } from "./routes/resumeRoutes.js";
import { tailoringRouter } from "./routes/tailoringRoutes.js";
import peerInterviewRoutes from "./routes/peerInterview.routes.js";
import codingQuestionRoutes from "./routes/codingQuestionRoutes.js";
import codeExecutionRoutes from "./routes/codeExecutionRoutes.js";
export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.clientOrigin,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "5mb" })); // Increased for large resume texts
  app.use(cookieParser());
  app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));

  app.use(
    "/api",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 200,
      standardHeaders: "draft-7",
      legacyHeaders: false,
    }),
  );

  app.get("/api/health", (_req, res) => {
    res.status(200).json({ status: "ok", service: "careerpilot-api" });
  });

  // Register routes
  app.use("/api/auth", authRouter);
  app.use("/api/profile", profileRouter);
  app.use("/api/resume", resumeRouter);
  app.use("/api/applications", applicationRouter);
  app.use("/api/match", matchRouter);
  app.use("/api/tailor", tailoringRouter);
  app.use("/api/analytics", analyticsRouter);
  app.use("/api/interview", interviewRouter);
  app.use("/api/interview-rooms", peerInterviewRoutes);
  app.use("/api/interview", codingQuestionRoutes);
  app.use("/api/interview", codeExecutionRoutes);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
