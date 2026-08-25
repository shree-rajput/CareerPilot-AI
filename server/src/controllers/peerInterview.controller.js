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

    const result = await createRoom({
      userId,
      clientUrl: process.env.CLIENT_URL,
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
      success: true,
      data: result,
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
