import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  sendMessage,
  getConversation,
  markConversationRead
} from "../controllers/messageController.js";

const router = Router();
router.use(requireAuth);

router.post("/", sendMessage);
router.get("/:otherUserId", getConversation);
router.patch("/:otherUserId/read", markConversationRead);

export default router;
