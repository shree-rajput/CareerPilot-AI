import { InterviewSession } from "../models/InterviewSession.js";
import PeerInterviewRoom from "../models/PeerInterviewRoom.js";

/**
 * GET /api/sessions/active
 * Authoritatively resolves the currently active/reconnectable session for the authenticated user.
 */
export async function getActiveSession(req, res) {
  try {
    const userId = req.user._id;
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);

    // Auto-expire stale AI interview sessions
    await InterviewSession.updateMany(
      { userId, status: { $in: ["in_progress", "setup"] }, updatedAt: { $lt: twelveHoursAgo } },
      { $set: { status: "completed", interviewState: "COMPLETED", completedAt: new Date() } }
    );

    // Auto-expire stale peer interview rooms
    await PeerInterviewRoom.updateMany(
      {
        $or: [{ createdBy: userId }, { "participants.userId": userId }],
        status: { $in: ["waiting", "ready", "active", "paused"] },
        updatedAt: { $lt: twelveHoursAgo }
      },
      { $set: { status: "completed" } }
    );

    // 1. Check for active AI Interview session
    const activeInterview = await InterviewSession.findOne({
      userId,
      status: { $in: ["in_progress", "setup"] }
    })
      .sort({ updatedAt: -1 })
      .lean();

    if (activeInterview) {
      return res.status(200).json({
        active: true,
        session: {
          type: "ai_interview",
          sessionId: activeInterview._id.toString(),
          roomId: null,
          status: activeInterview.status,
          title: activeInterview.targetRole ? `${activeInterview.targetRole} Interview` : "AI Interview Session",
          startedAt: activeInterview.createdAt,
          reconnectable: true,
          route: `/interview/${activeInterview._id.toString()}`,
          metadata: {
            interviewType: activeInterview.interviewType,
            difficulty: activeInterview.difficulty,
            technologyStack: activeInterview.technologyStack || []
          }
        }
      });
    }

    // 2. Check for active Tech Discussion / Peer Interview room
    const activeRoom = await PeerInterviewRoom.findOne({
      $or: [
        { createdBy: userId },
        { "participants.userId": userId }
      ],
      status: { $in: ["waiting", "ready", "active", "paused"] }
    })
      .sort({ updatedAt: -1 })
      .lean();

    if (activeRoom) {
      return res.status(200).json({
        active: true,
        session: {
          type: "tech_discussion",
          sessionId: activeRoom._id.toString(),
          roomId: activeRoom.roomId,
          status: activeRoom.status,
          title: activeRoom.topic ? `Tech Discussion: ${activeRoom.topic}` : "Tech Discussion Room",
          startedAt: activeRoom.createdAt,
          reconnectable: true,
          route: `/tech-discussion/${activeRoom.roomId}`,
          metadata: {
            topic: activeRoom.topic,
            difficulty: activeRoom.difficulty,
            experienceLevel: activeRoom.experienceLevel
          }
        }
      });
    }

    // No active session found
    return res.status(200).json({
      active: false,
      session: null
    });
  } catch (error) {
    console.error("[ActiveSessionController] Error retrieving active session:", error);
    return res.status(500).json({
      message: "Failed to resolve active session",
      error: error.message
    });
  }
}
