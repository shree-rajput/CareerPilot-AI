import * as copilotService from "../services/career/copilotService.js";
import { aiLogger } from "../services/ai/observability.js";
import { AppError } from "../utils/errors.js";

export const getConversations = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const conversations = await copilotService.getConversations(userId);
    res.status(200).json({ status: "success", data: conversations });
  } catch (error) {
    next(error);
  }
};

export const getConversation = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const conversation = await copilotService.getConversation(userId, req.params.id);
    res.status(200).json({ status: "success", data: conversation });
  } catch (error) {
    next(error);
  }
};

export const createConversation = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { title } = req.body;
    const conversation = await copilotService.createConversation(userId, title);
    res.status(201).json({ status: "success", data: conversation });
  } catch (error) {
    next(error);
  }
};

export const renameConversation = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { title } = req.body;
    if (!title || !title.trim()) throw new AppError("Title is required", 400, "INVALID_INPUT");
    const conversation = await copilotService.renameConversation(userId, req.params.id, title.trim());
    res.status(200).json({ status: "success", data: conversation });
  } catch (error) {
    next(error);
  }
};

export const deleteConversation = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    await copilotService.deleteConversation(userId, req.params.id);
    res.status(200).json({ status: "success", message: "Conversation deleted" });
  } catch (error) {
    next(error);
  }
};

export const shareConversation = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const data = await copilotService.shareConversation(userId, req.params.id);
    res.status(200).json({ status: "success", data });
  } catch (error) {
    next(error);
  }
};

export const getSharedConversation = async (req, res, next) => {
  try {
    const { token } = req.params;
    const conversation = await copilotService.getSharedConversation(token);
    res.status(200).json({ status: "success", data: conversation });
  } catch (error) {
    next(error);
  }
};

export const sendMessage = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { query, message, content } = req.body;
    const { id: conversationId } = req.params;

    const userQuery = (query || message || content || "").toString().trim();
    
    if (!userQuery) {
      throw new AppError("Message content cannot be empty", 400, "EMPTY_MESSAGE");
    }

    console.log(`[CopilotController] REQUEST_RECEIVED | userId: ${userId} | convId: ${conversationId}`);

    const response = await copilotService.sendMessage(userId, conversationId, userQuery);

    console.log(`[CopilotController] RESPONSE_SENT | userId: ${userId} | mode: ${response?.mode || 'default'}`);

    res.status(200).json({ status: "success", data: response });
  } catch (error) {
    aiLogger.logError({
      task: "COPILOT_CONTROLLER_ERROR",
      error,
      category: error.code || "CONTROLLER_FAILURE"
    });
    
    next(error);
  }
};
