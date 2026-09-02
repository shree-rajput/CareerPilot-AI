const roomStates = new Map();

export function registerPeerInterviewSocket(io) {
  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on("room:join", ({ roomId, userName, userId }) => {
      if (!roomId) {
        socket.emit("room:error", {
          code: "ROOM_ID_REQUIRED",
          message: "Room ID is required",
        });
        return;
      }

      socket.join(`discussion:${roomId}`);
      socket.join(`interview:${roomId}`); // Alias for legacy
      socket.data.roomId = roomId;
      socket.data.userName = userName || "Peer Developer";
      socket.data.userId = userId || socket.id;

      // Notify others in room
      socket.to(`discussion:${roomId}`).emit("room:participant-joined", {
        socketId: socket.id,
        userId: socket.data.userId,
        userName: socket.data.userName,
      });

      socket.emit("room:joined", {
        roomId,
      });

      // Send latest code, language, canvas elements & discussion state to joining participant
      const state = roomStates.get(roomId);
      if (state) {
        if (state.code) {
          socket.emit("code:change", { code: state.code });
        }
        if (state.language) {
          socket.emit("language:change", { language: state.language });
        }
        if (state.cursors) {
          socket.emit("code:cursor-map", { cursors: Array.from(state.cursors.values()) });
        }
        if (state.canvasElements) {
          socket.emit("canvas:elements-sync", { elements: state.canvasElements });
        }
      }
    });

    socket.on("disconnect", () => {
      const roomId = socket.data.roomId;
      if (!roomId) return;

      const state = roomStates.get(roomId);
      if (state?.cursors) {
        state.cursors.delete(socket.id);
      }

      socket.to(`discussion:${roomId}`).emit("room:participant-left", {
        socketId: socket.id,
        userId: socket.data.userId,
        userName: socket.data.userName,
      });

      socket.to(`discussion:${roomId}`).emit("code:cursor-remove", {
        socketId: socket.id,
      });

      console.log(`Socket ${socket.id} left room ${roomId}`);
    });

    socket.on("code:change", (data) => {
      const roomId = socket.data.roomId;
      if (roomId) {
        const state = roomStates.get(roomId) || {};
        state.code = data.code;
        roomStates.set(roomId, state);

        socket.to(`discussion:${roomId}`).emit("code:change", data);
        socket.to(`interview:${roomId}`).emit("code:change", data);
      }
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

    socket.on("whiteboard:draw", (data) => {
      const roomId = socket.data.roomId;
      if (roomId) {
        socket.to(`discussion:${roomId}`).emit("whiteboard:draw", data);
        socket.to(`interview:${roomId}`).emit("whiteboard:draw", data);
      }
    });

    socket.on("whiteboard:clear", () => {
      const roomId = socket.data.roomId;
      if (roomId) {
        const state = roomStates.get(roomId) || {};
        state.canvasElements = [];
        roomStates.set(roomId, state);

        socket.to(`discussion:${roomId}`).emit("whiteboard:clear");
        socket.to(`interview:${roomId}`).emit("whiteboard:clear");
        socket.to(`discussion:${roomId}`).emit("canvas:elements-sync", { elements: [] });
      }
    });
  });
}
