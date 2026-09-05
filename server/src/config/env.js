import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const required = ["MONGODB_URI", "JWT_ACCESS_SECRET"];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

/**
 * Sanitize a raw model string to a single clean model ID.
 * Strips whitespace, pipe-fallback expressions, and double tokens
 * so values like "llama-3.1-8b-instant || llama-3.3-70b-versatile"
 * can never reach the Groq API.
 */
function sanitizeModel(raw, fallback) {
  if (!raw || typeof raw !== "string") return fallback;
  // Take only the first token before any whitespace or pipe
  const clean = raw.split(/[\s|]+/)[0].trim();
  return clean || fallback;
}

const GROQ_FALLBACK_MODEL = "llama-3.3-70b-versatile";

const groqModel = sanitizeModel(process.env.GROQ_MODEL, GROQ_FALLBACK_MODEL);

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 5000),
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  mongodbUri: process.env.MONGODB_URI,
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS || 12),

  // AI provider — logical model roles
  groqApiKey: process.env.GROQ_API_KEY || "",
  groqModelFast: sanitizeModel(process.env.GROQ_MODEL_FAST, "openai/gpt-oss-20b"),
  groqModelGeneral: sanitizeModel(process.env.GROQ_MODEL_GENERAL, "openai/gpt-oss-20b"),
  groqModelComplex: sanitizeModel(process.env.GROQ_MODEL_COMPLEX, "openai/gpt-oss-20b"),
  groqModel: groqModel, // legacy fallback
  aiRequestTimeoutMs: Number(process.env.AI_REQUEST_TIMEOUT_MS || 30000),

  // File uploads
  maxFileSizeMb: Number(process.env.MAX_FILE_SIZE_MB || 5),

  // Cloudinary
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,

  // Per-user daily AI limits
  aiLimitResumeAnalysis: parseInt(process.env.AI_LIMIT_RESUME_ANALYSIS || "5", 10),
  aiLimitJdAnalysis: parseInt(process.env.AI_LIMIT_JD_ANALYSIS || "10", 10),
  aiLimitTailoring: parseInt(process.env.AI_LIMIT_TAILORING || "5", 10),
  aiLimitMatchExplanation: parseInt(process.env.AI_LIMIT_MATCH_EXPLANATION || "20", 10),
  aiLimitMockQuestions: parseInt(process.env.AI_LIMIT_MOCK_QUESTIONS || "20", 10),
  aiLimitMockEvaluations: parseInt(process.env.AI_LIMIT_MOCK_EVALUATIONS || "20", 10),
};
