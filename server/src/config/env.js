import dotenv from "dotenv";

dotenv.config();

const required = ["MONGODB_URI", "JWT_ACCESS_SECRET"];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 5000),
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  mongodbUri: process.env.MONGODB_URI,
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS || 12),

  // AI provider — swap model without touching business logic
  groqApiKey: process.env.GROQ_API_KEY || "",
  groqModel: process.env.GROQ_MODEL || "llama-3.1-8b-instant",

  // File uploads
  uploadDir: process.env.UPLOAD_DIR || "uploads",
  maxFileSizeMb: Number(process.env.MAX_FILE_SIZE_MB || 5),

  // Per-user daily AI limits
  aiLimitResumeAnalysis: parseInt(process.env.AI_LIMIT_RESUME_ANALYSIS || "5", 10),
  aiLimitJdAnalysis: parseInt(process.env.AI_LIMIT_JD_ANALYSIS || "10", 10),
  aiLimitTailoring: parseInt(process.env.AI_LIMIT_TAILORING || "5", 10),
  aiLimitMatchExplanation: parseInt(process.env.AI_LIMIT_MATCH_EXPLANATION || "20", 10),
  aiLimitMockQuestions: parseInt(process.env.AI_LIMIT_MOCK_QUESTIONS || "20", 10),
  aiLimitMockEvaluations: parseInt(process.env.AI_LIMIT_MOCK_EVALUATIONS || "20", 10),
};
