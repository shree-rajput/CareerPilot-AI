import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import mongoose from "mongoose";
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
import techDiscussionRoutes from "./routes/techDiscussion.routes.js";
import codingQuestionRoutes from "./routes/codingQuestionRoutes.js";
import codeExecutionRoutes from "./routes/codeExecutionRoutes.js";
import jobRoutes from "./routes/jobRoutes.js";
import skillRoutes from "./routes/skillRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import preparationRoutes from "./routes/preparationRoutes.js";
import copilotRoutes from "./routes/copilotRoutes.js";
import mentorRouter from "./routes/mentorRoutes.js";
import codingRouter from "./routes/codingRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

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
    const dbConnected = mongoose.connection && mongoose.connection.readyState === 1;
    res.status(200).json({
      status: "ok",
      service: "careerpilot-api",
      database: dbConnected ? "connected" : "disconnected",
      ai: {
        configured: Boolean(env.groqApiKey),
        provider: "Groq",
        model: env.groqModelGeneral
      }
    });
  });

  // Register routes
  app.use("/api/auth", authRouter);
  app.use("/api/profile", profileRouter);
  app.use("/api/resume", resumeRouter);
  app.use("/api/resumes", resumeRouter); // Plural alias to resolve client-side 404 bugs
  app.use("/api/mentors", mentorRouter); // Mentor ecosystem routes
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/messages", messageRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/applications", applicationRouter);
  app.use("/api/match", matchRouter);
  app.use("/api/tailor", tailoringRouter);
  app.use("/api/analytics", analyticsRouter);
  app.use("/api/interview", interviewRouter);
  app.use("/api/interview-rooms", peerInterviewRoutes);
  app.use("/api/tech-discussion", techDiscussionRoutes);
  app.use("/api/interview", codingQuestionRoutes);
  app.use("/api/interview", codeExecutionRoutes);
  app.use("/api/jobs", jobRoutes);
  app.use("/api/skills", skillRoutes);
  app.use("/api/projects", projectRoutes);
  app.use("/api/preparation", preparationRoutes);
  app.use("/api/copilot", copilotRoutes);
  app.use("/api/coding", codingRouter);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
