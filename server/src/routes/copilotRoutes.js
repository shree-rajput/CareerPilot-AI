import express from "express";
import * as copilotController from "../controllers/copilotController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// Public route for shared conversations
router.get("/shared/:token", copilotController.getSharedConversation);

router.use(requireAuth);

// Conversation management
router.get("/conversations", copilotController.getConversations);
router.post("/conversations", copilotController.createConversation);
router.get("/conversations/:id", copilotController.getConversation);
router.patch("/conversations/:id", copilotController.renameConversation);
router.delete("/conversations/:id", copilotController.deleteConversation);

// Messaging and sharing
router.post("/conversations/:id/messages", copilotController.sendMessage);
router.post("/conversations/:id/share", copilotController.shareConversation);

export default router;
