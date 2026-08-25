import crypto from "crypto";
import PeerInterviewRoom from "../../models/PeerInterviewRoom.js";
import RoomParticipant from "../../models/RoomParticipant.js";
import { createLiveKitToken } from "../../utils/livekit.js";
export async function createPeerInterviewRoom({ userId, clientUrl }) {
  if (!userId) {
    throw new Error("User ID is required");
  }

  const roomId = crypto.randomBytes(8).toString("hex");

  const room = await PeerInterviewRoom.create({
    roomId,
    createdBy: userId,
    interviewerId: userId,
    status: "waiting",
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

  let role = requestedRole;

  if (!role) {
    role = room.interviewerId ? "interviewee" : "interviewer";
  }

  if (!["interviewer", "interviewee"].includes(role)) {
    const error = new Error("Invalid interview role");
    error.statusCode = 400;
    error.code = "INVALID_ROLE";
    throw error;
  }

  if (role === "interviewer" && room.interviewerId) {
    const error = new Error("Interviewer role is already occupied");
    error.statusCode = 409;
    error.code = "ROLE_OCCUPIED";
    throw error;
  }

  if (role === "interviewee" && room.intervieweeId) {
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
  });

  if (!room) {
    const error = new Error("Interview room not found");

    error.statusCode = 404;
    error.code = "ROOM_NOT_FOUND";

    throw error;
  }

  const isInterviewer = room.interviewerId?.toString() === userId.toString();

  const isInterviewee = room.intervieweeId?.toString() === userId.toString();

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

  const token = createLiveKitToken({
    identity: userId.toString(),
    roomName: livekitRoomName,
    name: role,
  });

  return {
    token,
    roomName: livekitRoomName,
    role,
    livekitUrl: process.env.LIVEKIT_URL,
  };
}
