import {
  createTechDiscussionRoom,
  joinTechDiscussionRoom,
  generateTechDiscussionToken,
  getAIProblemRecommendation,
  getAIProgressiveNudge,
  executeContextAction,
  endTechDiscussionSession,
  getIndividualTechDiscussionReport,
  getNextTechDiscussionQuestion,
  restoreTechDiscussionSession,
  getUserTechDiscussionHistory
} from "../services/career/techDiscussion.service.js";
import { getSupportedLanguages } from "../config/programmingLanguages.js";

export function getLanguagesController(req, res) {
  try {
    const languages = getSupportedLanguages();
    return res.status(200).json({ success: true, data: languages });
  } catch (error) {
    console.error("getLanguagesController error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch supported programming languages" });
  }
}

export async function createRoomController(req, res) {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, code: "UNAUTHORIZED", message: "Authentication required" });
    }

    const {
      category,
      experienceLevel,
      topic,
      problemType,
      selectedProblemId,
      selectedProblem,
      customProblem,
      difficulty,
      language,
      durationMinutes
    } = req.body || {};

    const result = await createTechDiscussionRoom({
      userId,
      clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
      category,
      experienceLevel,
      topic,
      problemType,
      selectedProblemId,
      selectedProblem,
      customProblem,
      difficulty,
      language,
      durationMinutes
    });

    return res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error("createRoomController error:", error);
    return res.status(500).json({ success: false, code: "ROOM_CREATION_FAILED", message: error.message || "Failed to create discussion room" });
  }
}

export async function joinRoomController(req, res) {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, code: "UNAUTHORIZED", message: "Authentication required" });
    }

    const { roomId } = req.params;
    const result = await joinTechDiscussionRoom({ roomId, userId });

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("joinRoomController error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || "ROOM_JOIN_FAILED",
      message: error.message || "Unable to join discussion room"
    });
  }
}

export async function getLiveKitTokenController(req, res) {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, code: "UNAUTHORIZED", message: "Authentication required" });
    }

    const { roomId } = req.params;
    const result = await generateTechDiscussionToken({ roomId, userId });

    return res.status(200).json(result);
  } catch (error) {
    console.error("getLiveKitTokenController error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || "LIVEKIT_TOKEN_FAILED",
      message: error.message || "Unable to generate LiveKit token"
    });
  }
}

export async function getAIRecommendationController(req, res) {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, code: "UNAUTHORIZED", message: "Authentication required" });
    }

    const { topic, category, difficulty, experienceLevel, excludeId } = req.query;
    const excludeIds = excludeId ? [excludeId] : [];
    const result = await getAIProblemRecommendation(userId, { topic, category, difficulty, experienceLevel, excludeIds });

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("getAIRecommendationController error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch AI problem recommendation" });
  }
}

export async function getAINudgeController(req, res) {
  try {
    const { roomId } = req.params;
    const { currentCode, hintLevel, questionTitle, selectedSnippet } = req.body;

    const result = await getAIProgressiveNudge({
      roomId,
      currentCode,
      hintLevel: Number(hintLevel) || 1,
      questionTitle,
      selectedSnippet
    });

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("getAINudgeController error:", error);
    return res.status(500).json({ success: false, message: "Failed to generate AI nudge" });
  }
}

export async function executeContextActionController(req, res) {
  try {
    const { actionType, selectedCode, currentCode, problem, userQuestion } = req.body;

    const result = await executeContextAction({
      actionType,
      selectedCode,
      currentCode,
      problem,
      userQuestion
    });

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("executeContextActionController error:", error);
    return res.status(500).json({ success: false, message: "Failed to execute context action" });
  }
}

export async function endSessionController(req, res) {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, code: "UNAUTHORIZED", message: "Authentication required" });
    }

    const { roomId } = req.params;
    const result = await endTechDiscussionSession({ roomId, userId });

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("endSessionController error:", error);
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Failed to end session" });
  }
}

export async function getReportController(req, res) {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, code: "UNAUTHORIZED", message: "Authentication required" });
    }

    const { roomId } = req.params;
    const result = await getIndividualTechDiscussionReport({ roomId, userId });

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("getReportController error:", error);
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Failed to fetch report" });
  }
}

export async function getNextQuestionController(req, res) {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, code: "UNAUTHORIZED", message: "Authentication required" });
    }

    const { roomId } = req.params;
    const result = await getNextTechDiscussionQuestion({ roomId, userId });

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("getNextQuestionController error:", error);
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Failed to advance to next question" });
  }
}

export async function getRoomSessionController(req, res) {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, code: "UNAUTHORIZED", message: "Authentication required" });
    }

    const { roomId } = req.params;
    const result = await restoreTechDiscussionSession({ roomId, userId });

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("getRoomSessionController error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || "SESSION_RESTORE_FAILED",
      message: error.message || "Failed to restore discussion room session"
    });
  }
}

export async function getHistoryController(req, res) {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, code: "UNAUTHORIZED", message: "Authentication required" });
    }

    const { page, limit } = req.query;
    const result = await getUserTechDiscussionHistory({ userId, page, limit });

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("getHistoryController error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch tech discussion history" });
  }
}

export async function saveDraftController(req, res) {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, code: "UNAUTHORIZED", message: "Authentication required" });
    }

    const { roomId } = req.params;
    const { code, language, activeWorkspace } = req.body || {};

    const { PeerInterviewRoom } = await import("../models/PeerInterviewRoom.js");
    const updateObj = {
      "codeState.code": code || "",
      "codeState.language": language || "javascript",
      "codeState.updatedAt": new Date()
    };

    if (language) {
      updateObj[`draftCode.${language}`] = code;
    }
    if (activeWorkspace) {
      updateObj.activeWorkspace = activeWorkspace;
    }

    await PeerInterviewRoom.updateOne({ roomId }, { $set: updateObj });

    return res.status(200).json({ success: true, message: "Draft saved successfully" });
  } catch (error) {
    console.error("saveDraftController error:", error);
    return res.status(500).json({ success: false, message: "Failed to save code draft" });
  }
}


