import { Router } from "express";
import { getMatchResult, runMatch } from "../controllers/matchController.js";
import { requireAuth } from "../middleware/auth.js";

export const matchRouter = Router();

matchRouter.use(requireAuth);

matchRouter.post("/", runMatch);
matchRouter.get("/:id", getMatchResult);
