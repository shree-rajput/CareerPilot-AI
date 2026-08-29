const roomStates = new Map();

export function registerPeerInterviewSocket(io) {
  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on("room:join", ({ roomId }) => {
      if (!roomId) {
        socket.emit("room:error", {
          code: "ROOM_ID_REQUIRED",
          message: "Room ID is required",
        });
        return;
      }

      socket.join(`interview:${roomId}`);
      socket.data.roomId = roomId;

      socket.to(`interview:${roomId}`).emit("room:participant-joined", {
        socketId: socket.id,
      });

      socket.emit("room:joined", {
        roomId,
      });

      // Send latest code & language snapshot to joining participant
      const state = roomStates.get(roomId);
      if (state) {
        if (state.code) {
          socket.emit("code:change", { code: state.code });
        }
        if (state.language) {
          socket.emit("language:change", { language: state.language });
        }
      }
    });

    socket.on("disconnect", () => {
      const roomId = socket.data.roomId;
      if (!roomId) return;

      socket.to(`interview:${roomId}`).emit("room:participant-left", {
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

        socket.to(`interview:${roomId}`).emit("code:change", data);
      }
    });

    socket.on("language:change", (data) => {
      const roomId = socket.data.roomId;
      if (roomId) {
        const state = roomStates.get(roomId) || {};
        state.language = data.language;
        roomStates.set(roomId, state);

        socket.to(`interview:${roomId}`).emit("language:change", data);
      }
    });

    socket.on("whiteboard:draw", (data) => {
      const roomId = socket.data.roomId;
      if (roomId) {
        socket.to(`interview:${roomId}`).emit("whiteboard:draw", data);
      }
    });

    socket.on("whiteboard:clear", () => {
      const roomId = socket.data.roomId;
      if (roomId) {
        socket.to(`interview:${roomId}`).emit("whiteboard:clear");
      }
    });
  });
}
