import * as copilotService from "../services/career/copilotService.js";
import { aiLogger } from "../services/ai/observability.js";
import { AppError } from "../utils/errors.js";

export const getConversations = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const conversations = await copilotService.getConversations(userId);
    res.status(200).json({ status: "success", data: conversations });
  } catch (error) {
    next(error);
  }
};

export const getConversation = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const conversation = await copilotService.getConversation(userId, req.params.id);
    res.status(200).json({ status: "success", data: conversation });
  } catch (error) {
    next(error);
  }
};

export const createConversation = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { title } = req.body;
    const conversation = await copilotService.createConversation(userId, title);
    res.status(201).json({ status: "success", data: conversation });
  } catch (error) {
    next(error);
  }
};

export const renameConversation = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { title } = req.body;
    if (!title) throw new AppError("Title is required", 400);
    const conversation = await copilotService.renameConversation(userId, req.params.id, title);
    res.status(200).json({ status: "success", data: conversation });
  } catch (error) {
    next(error);
  }
};

export const deleteConversation = async (req, res, next) => {
  try {
    const userId = req.user.id;
    await copilotService.deleteConversation(userId, req.params.id);
    res.status(200).json({ status: "success", message: "Conversation deleted" });
  } catch (error) {
    next(error);
  }
};

export const shareConversation = async (req, res, next) => {
  try {
    const userId = req.user.id;
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
    const userId = req.user.id;
    const { query } = req.body;
    const { id: conversationId } = req.params;
    
    if (!query) {
      throw new AppError("Message cannot be empty", 400);
    }

    const response = await copilotService.sendMessage(userId, conversationId, query);
    res.status(200).json({ status: "success", data: response });
  } catch (error) {
    aiLogger.logError({
      task: "COPILOT_CONTROLLER_ERROR",
      error,
      category: "CONTROLLER_FAILURE"
    });
    
    res.status(error.statusCode || 500).json({
      status: "error",
      message: error.message || "CareerPilot Copilot is temporarily unavailable. Please try again later."
    });
  }
};
