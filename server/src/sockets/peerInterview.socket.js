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
    });

    socket.on("disconnect", () => {
      const roomId = socket.data.roomId;

      if (!roomId) {
        return;
      }

      socket.to(`interview:${roomId}`).emit("room:participant-left", {
        socketId: socket.id,
      });

      console.log(`Socket ${socket.id} left room ${roomId}`);
    });
  });
}
