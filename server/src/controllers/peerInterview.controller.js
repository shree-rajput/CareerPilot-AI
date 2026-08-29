import {
  createPeerInterviewRoom as createRoom,
  joinPeerInterviewRoom as joinRoom,
  generatePeerInterviewToken,
} from "../services/career/peerInterview.service.js";

export async function createPeerInterviewRoom(req, res) {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }

    const { targetRole, technologyStack, interviewType, difficulty, durationMinutes } = req.body || {};

    const result = await createRoom({
      userId,
      clientUrl: process.env.CLIENT_URL,
      targetRole,
      technologyStack,
      interviewType,
      difficulty,
      durationMinutes
    });

    return res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("createPeerInterviewRoom:", error);

    return res.status(500).json({
      success: false,
      code: "ROOM_CREATION_FAILED",
      message: "Unable to create interview room",
    });
  }
}

export async function joinPeerInterviewRoom(req, res) {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }

    const { roomId } = req.params;

    const { role } = req.body;

    const result = await joinRoom({
      roomId,
      userId,
      requestedRole: role,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("joinPeerInterviewRoom:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || "ROOM_JOIN_FAILED",
      message: error.statusCode
        ? error.message
        : "Unable to join interview room",
    });
  }
}

export async function createPeerInterviewToken(req, res) {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }

    const { roomId } = req.params;

    const result = await generatePeerInterviewToken({
      roomId,
      userId,
    });

    return res.status(200).json({
      token: result.token,
      roomName: result.roomName,
      livekitUrl: result.livekitUrl,
      plan: result.plan,
      interviewerName: result.interviewerName,
      intervieweeName: result.intervieweeName
    });
  } catch (error) {
    console.error("generatePeerInterviewToken:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      code: error.code || "LIVEKIT_TOKEN_FAILED",
      message: error.statusCode
        ? error.message
        : "Unable to create LiveKit token",
    });
  }
}

import { generateCopilotSuggestion, analyzeCodeSubmission } from "../services/ai/aiService.js";
import PeerInterviewRoom from "../models/PeerInterviewRoom.js";

export async function getCopilotSuggestion(req, res) {
  try {
    const { roomId } = req.params;
    const { currentQuestion, context } = req.body;
    
    if (roomId) {
      const room = await PeerInterviewRoom.findOne({ roomId });
      if (room && room.interviewerId && room.interviewerId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: "Only the interviewer can access AI Copilot suggestions." });
      }
    }

    const result = await generateCopilotSuggestion({ currentQuestion, context });
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("getCopilotSuggestion error:", error);
    return res.status(500).json({ success: false, message: "Failed to generate suggestion" });
  }
}

export async function submitCodeReview(req, res) {
  try {
    const { questionTitle, questionDescription, language, code, testResults } = req.body;
    const result = await analyzeCodeSubmission({
      questionTitle,
      questionDescription,
      language,
      code,
      testResults
    });
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("submitCodeReview error:", error);
    return res.status(500).json({ success: false, message: "Failed to review code" });
  }
}

export async function endInterview(req, res) {
  try {
    const { roomId } = req.params;
    const { scores, feedback } = req.body;

    const room = await PeerInterviewRoom.findOne({ roomId });
    if (!room) return res.status(404).json({ success: false, message: "Room not found" });

    // Only interviewer or creator can end the interview
    const isInterviewer = room.interviewerId?.toString() === req.user._id.toString() || room.createdBy?.toString() === req.user._id.toString();
    if (!isInterviewer) {
      return res.status(403).json({ success: false, message: "Only the interviewer can end this interview session." });
    }

    room.status = "completed";
    room.endedAt = new Date();
    room.durationSeconds = room.startedAt ? Math.floor((room.endedAt - room.startedAt) / 1000) : 0;

    room.report = {
      overallScore: scores?.overall || 0,
      scores: {
        technical: scores?.technical || 0,
        communication: scores?.communication || 0,
        codeQuality: scores?.codeQuality || 0,
      },
      feedback: {
        strengths: feedback?.strengths || [],
        weaknesses: feedback?.weaknesses || [],
        recommendedPractice: feedback?.recommendedPractice || []
      }
    };

    await room.save();
    return res.status(200).json({ success: true, data: room });
  } catch (error) {
    console.error("endInterview error:", error);
    return res.status(500).json({ success: false, message: "Failed to end interview" });
  }
}

export async function getPeerInterviewReport(req, res) {
  try {
    const { roomId } = req.params;
    const room = await PeerInterviewRoom.findOne({ roomId });
    if (!room) return res.status(404).json({ success: false, message: "Room not found" });
    return res.status(200).json({ success: true, data: room.report });
  } catch (error) {
    console.error("getPeerInterviewReport error:", error);
    return res.status(500).json({ success: false, message: "Failed to get report" });
  }
}