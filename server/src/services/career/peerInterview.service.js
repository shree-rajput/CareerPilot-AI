import crypto from "crypto";
import PeerInterviewRoom from "../../models/PeerInterviewRoom.js";
import RoomParticipant from "../../models/RoomParticipant.js";
import { createLiveKitToken } from "../../utils/livekit.js";
import { generateInterviewPlan } from "../ai/aiService.js";

export async function createPeerInterviewRoom({ userId, clientUrl, targetRole, technologyStack, interviewType, difficulty, durationMinutes }) {
  if (!userId) {
    throw new Error("User ID is required");
  }

  const roomId = crypto.randomBytes(8).toString("hex");
  
  // Generate AI Plan
  let plan = [];
  try {
    const aiResult = await generateInterviewPlan({
      targetRole: targetRole || "Software Engineer",
      technologyStack: technologyStack || ["JavaScript"],
      interviewType: interviewType || "mixed",
      difficulty: difficulty || "medium",
      durationMinutes: durationMinutes || 45
    });
    plan = aiResult.plan || [];
  } catch (err) {
    console.error("Failed to generate AI plan during room creation:", err);
  }

  const room = await PeerInterviewRoom.create({
    roomId,
    createdBy: userId,
    interviewerId: userId,
    status: "waiting",
    targetRole,
    technologyStack,
    interviewType,
    difficulty,
    plan
  });

  await RoomParticipant.create({
    roomId: room._id,
    userId,
    role: "interviewer",
  });

  const inviteLink = `${clientUrl}/interview/${room.roomId}?role=interviewee`;

  return {
    roomId: room.roomId,
    role: "interviewer",
    status: room.status,
    inviteLink,
  };
}

export async function joinPeerInterviewRoom({ roomId, userId, requestedRole }) {
  if (!roomId || !userId) {
    throw new Error("Room ID and user ID are required");
  }

  const room = await PeerInterviewRoom.findOne({
    roomId,
  });

  if (!room) {
    const error = new Error("Interview room not found");
    error.statusCode = 404;
    error.code = "ROOM_NOT_FOUND";
    throw error;
  }

  if (room.status === "completed") {
    const error = new Error("This interview room has already been completed");
    error.statusCode = 409;
    error.code = "ROOM_COMPLETED";
    throw error;
  }

  const existingParticipant = await RoomParticipant.findOne({
    roomId: room._id,
    userId,
  });

  if (existingParticipant) {
    return {
      roomId: room.roomId,
      role: existingParticipant.role,
      status: room.status,
      alreadyJoined: true,
    };
  }

  const participantCount = await RoomParticipant.countDocuments({
    roomId: room._id,
  });

  if (participantCount >= 2) {
    const error = new Error("This interview room already has two participants");
    error.statusCode = 409;
    error.code = "ROOM_FULL";
    throw error;
  }

  // Creator is ALWAYS interviewer, joining user is ALWAYS interviewee
  let role = "interviewee";
  if (userId.toString() === room.createdBy.toString()) {
    role = "interviewer";
  }

  if (role === "interviewee" && room.intervieweeId && room.intervieweeId.toString() !== userId.toString()) {
    const error = new Error("Interviewee role is already occupied");
    error.statusCode = 409;
    error.code = "ROLE_OCCUPIED";
    throw error;
  }

  await RoomParticipant.create({
    roomId: room._id,
    userId,
    role,
  });

  if (role === "interviewer") {
    room.interviewerId = userId;
  } else {
    room.intervieweeId = userId;
  }

  const bothParticipantsJoined =
    Boolean(room.interviewerId) && Boolean(room.intervieweeId);

  if (bothParticipantsJoined) {
    room.status = "active";
    room.startedAt = new Date();
  }

  await room.save();

  return {
    roomId: room.roomId,
    role,
    status: room.status,
    alreadyJoined: false,
  };
}

export async function generatePeerInterviewToken({ roomId, userId }) {
  if (!roomId || !userId) {
    const error = new Error("Room ID and user ID are required");

    error.statusCode = 400;
    error.code = "INVALID_TOKEN_REQUEST";

    throw error;
  }

  const room = await PeerInterviewRoom.findOne({
    roomId,
  })
    .populate("interviewerId", "name")
    .populate("intervieweeId", "name");

  if (!room) {
    const error = new Error("Interview room not found");

    error.statusCode = 404;
    error.code = "ROOM_NOT_FOUND";

    throw error;
  }

  const isInterviewer = room.interviewerId?._id?.toString() === userId.toString();

  const isInterviewee = room.intervieweeId?._id?.toString() === userId.toString();

  if (!isInterviewer && !isInterviewee) {
    const error = new Error("You are not a participant of this interview room");

    error.statusCode = 403;
    error.code = "NOT_ROOM_PARTICIPANT";

    throw error;
  }

  if (room.status === "completed") {
    const error = new Error("This interview has already ended");

    error.statusCode = 409;
    error.code = "ROOM_COMPLETED";

    throw error;
  }

  const role = isInterviewer ? "interviewer" : "interviewee";

  const livekitRoomName = `peer-interview-${room.roomId}`;

  const token = await createLiveKitToken({
    identity: userId.toString(),
    roomName: livekitRoomName,
    name: role,
  });

  return {
    token,
    roomName: livekitRoomName,
    role,
    livekitUrl: process.env.LIVEKIT_URL,
    plan: room.plan || [],
    interviewerName: room.interviewerId?.name || null,
    intervieweeName: room.intervieweeId?.name || null,
  };
}
