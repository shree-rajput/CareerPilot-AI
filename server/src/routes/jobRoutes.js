import express from "express";
import multer from "multer";
import * as jobController from "../controllers/jobController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

router.use(requireAuth);

// Ingestion & PDF Upload Endpoints
router.post("/ingest", jobController.ingestJob);
router.post("/upload-jd-pdf", upload.single("file"), jobController.uploadJdPdf);
router.get("/inbox", jobController.getJobInbox);

// Job CRUD & AI Actions
router.post("/", jobController.createJob);
router.get("/", jobController.getJobs);
router.get("/:id", jobController.getJobById);
router.patch("/:id", jobController.updateJob);
router.delete("/:id", jobController.deactivateJob);

router.post("/:id/save", jobController.saveJob);
router.post("/:id/match", jobController.matchJob);
router.post("/:id/should-apply", jobController.shouldApply);

export default router;
