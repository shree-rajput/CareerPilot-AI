import { MentorshipMessage } from "../models/MentorshipMessage.js";
import MentorshipSession from "../models/MentorshipSession.js";

const sessionPresenceMap = new Map(); // sessionId -> Map(socketId -> presenceObj)

function updateSessionPresence(sessionId, socketId, updateObj) {
  if (!sessionPresenceMap.has(sessionId)) {
    sessionPresenceMap.set(sessionId, new Map());
  }
  const presence = sessionPresenceMap.get(sessionId);
  const existing = presence.get(socketId) || {};
  const updated = { ...existing, socketId, ...updateObj };
  presence.set(socketId, updated);
  return Array.from(presence.values());
}

function removeSessionPresence(sessionId, socketId) {
  if (sessionPresenceMap.has(sessionId)) {
    const presence = sessionPresenceMap.get(sessionId);
    presence.delete(socketId);
    if (presence.size === 0) {
      sessionPresenceMap.delete(sessionId);
      return [];
    }
    return Array.from(presence.values());
  }
  return [];
}

export function registerMentorSessionSocketHandlers(io) {
  io.on("connection", (socket) => {
    socket.on("mentor:join", async ({ sessionId, userId, userName, role }) => {
      try {
        if (!sessionId || !userId) {
          return socket.emit("mentor:error", { message: "Invalid session join parameters" });
        }

        const session = await MentorshipSession.findById(sessionId).lean();
        if (!session) {
          return socket.emit("mentor:error", { message: "Mentorship session not found" });
        }

        // Verify authorization
        const isStudent = session.studentId.toString() === userId;
        const isMentor = session.mentorId.toString() === userId;
        if (!isStudent && !isMentor) {
          return socket.emit("mentor:error", { message: "Unauthorized to join this mentorship session" });
        }

        const roomName = `mentor-session:${sessionId}`;
        socket.join(roomName);
        socket.data.sessionId = sessionId;
        socket.data.userId = userId;
        socket.data.userName = userName || (isMentor ? "Mentor" : "Candidate");
        socket.data.role = role || (isMentor ? "mentor" : "student");

        const presenceList = updateSessionPresence(sessionId, socket.id, {
          userId,
          userName: socket.data.userName,
          role: socket.data.role,
          hasCamera: true,
          hasMic: true
        });

        io.to(roomName).emit("mentor:presence-update", { presenceList });
        socket.emit("mentor:joined", { sessionId, presenceList });

        // Update session status to live if scheduled
        if (session.status === "scheduled") {
          await MentorshipSession.findByIdAndUpdate(sessionId, { status: "live" }).catch(() => {});
        }
      } catch (err) {
        console.error("[MentorSocket] Join error:", err);
        socket.emit("mentor:error", { message: "Failed to join mentorship session" });
      }
    });

    socket.on("mentor:chat-send", async ({ sessionId, content, receiverId }) => {
      try {
        if (!sessionId || !content || !content.trim()) return;

        const senderId = socket.data.userId;
        if (!senderId) return;

        const session = await MentorshipSession.findById(sessionId).lean();
        if (!session) return;

        const targetReceiverId = receiverId || (session.studentId.toString() === senderId ? session.mentorId : session.studentId);

        const messageDoc = await MentorshipMessage.create({
          sessionId,
          senderId,
          receiverId: targetReceiverId,
          content: content.trim(),
          sentAt: new Date()
        });

        const roomName = `mentor-session:${sessionId}`;
        io.to(roomName).emit("mentor:chat-receive", {
          id: messageDoc._id,
          sessionId,
          senderId,
          receiverId: targetReceiverId,
          content: messageDoc.content,
          sentAt: messageDoc.sentAt
        });
      } catch (err) {
        console.error("[MentorSocket] Chat send error:", err);
      }
    });

    socket.on("mentor:media-status", ({ hasCamera, hasMic }) => {
      const sessionId = socket.data.sessionId;
      if (!sessionId) return;

      const presenceList = updateSessionPresence(sessionId, socket.id, { hasCamera, hasMic });
      io.to(`mentor-session:${sessionId}`).emit("mentor:presence-update", { presenceList });
    });

    socket.on("disconnect", () => {
      const sessionId = socket.data.sessionId;
      if (sessionId) {
        const presenceList = removeSessionPresence(sessionId, socket.id);
        io.to(`mentor-session:${sessionId}`).emit("mentor:presence-update", { presenceList });
      }
    });
  });
}
