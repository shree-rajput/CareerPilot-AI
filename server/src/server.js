import { createApp } from "./app.js";
import { connectDatabase } from "./config/db.js";
import { env } from "./config/env.js";
import { createServer } from "http";
import { Server } from "socket.io";

import { registerPeerInterviewSocket } from "./sockets/peerInterview.socket.js";

async function bootstrap() {
  await connectDatabase();

  const app = createApp();

  // app.listen(env.port, () => {
  //   console.log(`CareerPilot API running on port ${env.port}`);
  // });

  const httpServer = createServer(app);

  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL,
      credentials: true,
    },
  });

  registerPeerInterviewSocket(io);

  httpServer.listen(env.port, () => {
    console.log(`Server running on port ${env.port}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
