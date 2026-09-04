import * as Y from "yjs";
import PeerInterviewRoom from "../models/PeerInterviewRoom.js";

const roomYDocs = new Map(); // roomId -> Y.Doc
const roomStates = new Map(); // roomId -> volatile state
const snapshotDebounceTimers = new Map(); // roomId -> setTimeout ID
const roomPresence = new Map(); // roomId -> Map(socketId -> presenceObject)

function getOrCreateRoomYDoc(roomId, initialRoomData = null) {
  if (roomYDocs.has(roomId)) {
    return roomYDocs.get(roomId);
  }

  const yDoc = new Y.Doc();
  roomYDocs.set(roomId, yDoc);

  // Initialize from MongoDB data if available
  if (initialRoomData) {
    if (initialRoomData.codeState?.code && yDoc.getText("code").length === 0) {
      yDoc.getText("code").insert(0, initialRoomData.codeState.code);
    }
    if (initialRoomData.problem?.starterCanvasElements && yDoc.getArray("canvasElements").length === 0) {
      const arr = yDoc.getArray("canvasElements");
      arr.push(initialRoomData.problem.starterCanvasElements);
    }
  }

  // Setup debounced MongoDB snapshot persistence on YDoc updates
  yDoc.on("update", () => {
    scheduleRoomSnapshot(roomId);
  });

  return yDoc;
}

function scheduleRoomSnapshot(roomId) {
  if (snapshotDebounceTimers.has(roomId)) {
    clearTimeout(snapshotDebounceTimers.get(roomId));
  }

  const timer = setTimeout(async () => {
    snapshotDebounceTimers.delete(roomId);
    await saveRoomSnapshotToDb(roomId);
  }, 2000); // 2-second debounce

  snapshotDebounceTimers.set(roomId, timer);
}

async function saveRoomSnapshotToDb(roomId) {
  const yDoc = roomYDocs.get(roomId);
  if (!yDoc) return;

  try {
    const codeText = yDoc.getText("code").toString();
    const canvasElements = yDoc.getArray("canvasElements").toArray();
    const specNotes = yDoc.getText("specNotes").toString();

    await PeerInterviewRoom.updateOne(
      { roomId },
      {
        $set: {
          "codeState.code": codeText,
          "codeState.updatedAt": new Date(),
          canvasState: canvasElements,
          specNotes,
        },
      }
    );
  } catch (err) {
    console.error(`Failed to save Yjs room snapshot for room ${roomId}:`, err.message);
  }
}

function getRoomPresenceList(roomId) {
  const presenceMap = roomPresence.get(roomId);
  if (!presenceMap) return [];
  return Array.from(presenceMap.values());
}

function updateRoomPresence(roomId, socketId, updateObj) {
  if (!roomPresence.has(roomId)) {
    roomPresence.set(roomId, new Map());
  }
  const presenceMap = roomPresence.get(roomId);
  const existing = presenceMap.get(socketId) || {};
  const updated = { ...existing, socketId, ...updateObj };
  presenceMap.set(socketId, updated);
  return getRoomPresenceList(roomId);
}

function removeRoomPresence(roomId, socketId) {
  const presenceMap = roomPresence.get(roomId);
  if (presenceMap) {
    presenceMap.delete(socketId);
    if (presenceMap.size === 0) {
      roomPresence.delete(roomId);
    }
  }
  return getRoomPresenceList(roomId);
}

export function registerPeerInterviewSocket(io) {
  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on("room:join", async ({ roomId, userName, userId, hasCamera = true, hasMic = true, activity = "idle" }) => {
      if (!roomId) {
        socket.emit("room:error", {
          code: "ROOM_ID_REQUIRED",
          message: "Room ID is required",
        });
        return;
      }

      socket.join(`discussion:${roomId}`);
      socket.join(`interview:${roomId}`);
      socket.data.roomId = roomId;
      socket.data.userName = userName || "Peer Developer";
      socket.data.userId = userId || socket.id;

      // 1. Fetch room data from DB to ensure YDoc initialization
      let roomDbData = null;
      try {
        roomDbData = await PeerInterviewRoom.findOne({ roomId }).lean();
      } catch (err) {
        console.warn(`Could not load room ${roomId} from DB:`, err.message);
      }

      const yDoc = getOrCreateRoomYDoc(roomId, roomDbData);

      // 2. Add to presence tracking map
      const presenceList = updateRoomPresence(roomId, socket.id, {
        userId: socket.data.userId,
        userName: socket.data.userName,
        activity,
        hasCamera,
        hasMic,
        online: true,
        joinedAt: new Date().toISOString()
      });

      // 3. Notify others of participant joining & sync presence
      socket.to(`discussion:${roomId}`).emit("room:participant-joined", {
        socketId: socket.id,
        userId: socket.data.userId,
        userName: socket.data.userName,
      });

      io.to(`discussion:${roomId}`).emit("presence:sync", {
        roomId,
        participants: presenceList
      });

      // 4. Send join acknowledgment & initial Yjs CRDT state
      const docState = Array.from(Y.encodeStateAsUpdate(yDoc));
      socket.emit("room:joined", {
        roomId,
        participants: roomDbData?.participants || [],
      });
      socket.emit("yjs:init", {
        roomId,
        docState,
      });

      // Send legacy state sync for backward compatibility
      const state = roomStates.get(roomId);
      if (state) {
        if (state.cursors) {
          socket.emit("code:cursor-map", { cursors: Array.from(state.cursors.values()) });
        }
      }
    });

    // Handle real-time user activity changes (e.g., 'coding', 'canvas_editing', 'notes_editing', 'idle')
    socket.on("activity:change", ({ activity }) => {
      const roomId = socket.data.roomId;
      if (!roomId || !activity) return;

      const presenceList = updateRoomPresence(roomId, socket.id, { activity });
      io.to(`discussion:${roomId}`).emit("presence:sync", {
        roomId,
        participants: presenceList
      });
    });

    // Handle real-time media device status updates
    socket.on("media:status-change", ({ hasCamera, hasMic }) => {
      const roomId = socket.data.roomId;
      if (!roomId) return;

      const presenceList = updateRoomPresence(roomId, socket.id, { hasCamera, hasMic });
      io.to(`discussion:${roomId}`).emit("presence:sync", {
        roomId,
        participants: presenceList
      });
    });

    // Handle Yjs binary updates
    socket.on("yjs:update", ({ roomId, update }) => {
      if (!roomId || !update) return;

      const yDoc = roomYDocs.get(roomId);
      if (yDoc) {
        try {
          const updateUint8 = new Uint8Array(update);
          Y.applyUpdate(yDoc, updateUint8, "remote");
        } catch (err) {
          console.error("Server error applying Yjs update:", err.message);
        }
      }

      // Broadcast binary update to other room participants
      socket.to(`discussion:${roomId}`).emit("yjs:update", {
        roomId,
        update,
      });
    });

    socket.on("yjs:request-init", ({ roomId }) => {
      if (!roomId) return;
      const yDoc = roomYDocs.get(roomId);
      if (yDoc) {
        const docState = Array.from(Y.encodeStateAsUpdate(yDoc));
        socket.emit("yjs:init", {
          roomId,
          docState,
        });
      }
    });

    socket.on("disconnect", () => {
      const roomId = socket.data.roomId;
      if (!roomId) return;

      const state = roomStates.get(roomId);
      if (state?.cursors) {
        state.cursors.delete(socket.id);
      }

      const presenceList = removeRoomPresence(roomId, socket.id);

      socket.to(`discussion:${roomId}`).emit("room:participant-left", {
        socketId: socket.id,
        userId: socket.data.userId,
        userName: socket.data.userName,
      });

      socket.to(`discussion:${roomId}`).emit("code:cursor-remove", {
        socketId: socket.id,
      });

      io.to(`discussion:${roomId}`).emit("presence:sync", {
        roomId,
        participants: presenceList
      });
    });

    socket.on("code:cursor", (data) => {
      const roomId = socket.data.roomId;
      if (roomId) {
        const state = roomStates.get(roomId) || {};
        if (!state.cursors) state.cursors = new Map();

        const cursorInfo = {
          socketId: socket.id,
          userId: socket.data.userId,
          userName: socket.data.userName || data.userName || "Peer",
          cursor: data.cursor,
          selection: data.selection,
          color: data.color || "#3b82f6",
        };

        state.cursors.set(socket.id, cursorInfo);
        roomStates.set(roomId, state);

        socket.to(`discussion:${roomId}`).emit("code:cursor", cursorInfo);
      }
    });

    socket.on("language:change", (data) => {
      const roomId = socket.data.roomId;
      if (roomId) {
        const state = roomStates.get(roomId) || {};
        state.language = data.language;
        roomStates.set(roomId, state);

        socket.to(`discussion:${roomId}`).emit("language:change", data);
        socket.to(`interview:${roomId}`).emit("language:change", data);
      }
    });

    socket.on("discussion:message", (data) => {
      const roomId = socket.data.roomId;
      if (roomId) {
        const messagePayload = {
          id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          senderId: socket.data.userId,
          senderName: socket.data.userName,
          text: data.text,
          type: data.type || "text",
          actionType: data.actionType || "",
          timestamp: new Date().toISOString(),
        };

        io.to(`discussion:${roomId}`).emit("discussion:message", messagePayload);
      }
    });

    socket.on("question:change", (data) => {
      const roomId = socket.data.roomId || data.roomId;
      if (roomId) {
        socket.to(`discussion:${roomId}`).emit("question:change", data);
        socket.to(`interview:${roomId}`).emit("question:change", data);
      }
    });

    // Real-Time Excalidraw-Style Architectural Canvas Sync
    socket.on("canvas:elements-update", (data) => {
      const roomId = socket.data.roomId;
      if (roomId) {
        const state = roomStates.get(roomId) || {};
        state.canvasElements = data.elements || [];
        roomStates.set(roomId, state);

        socket.to(`discussion:${roomId}`).emit("canvas:elements-sync", data);
      }
    });

    socket.on("whiteboard:clear", () => {
      const roomId = socket.data.roomId;
      if (roomId) {
        const state = roomStates.get(roomId) || {};
        state.canvasElements = [];
        roomStates.set(roomId, state);

        socket.to(`discussion:${roomId}`).emit("whiteboard:clear");
        socket.to(`discussion:${roomId}`).emit("canvas:elements-sync", { elements: [] });
      }
    });
  });
}

