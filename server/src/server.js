import { createApp } from "./app.js";
import { connectDatabase } from "./config/db.js";
import { env } from "./config/env.js";
import { createServer } from "http";
import { Server } from "socket.io";

import { registerPeerInterviewSocket } from "./sockets/peerInterview.socket.js";
import { registerMentorSessionSocketHandlers } from "./sockets/mentorSession.socket.js";
import { seedDefaultMentors } from "./scripts/seedMentors.js";
import { initCronScheduler } from "./services/scheduler/cronScheduler.js";
import { registerEventSubscribers } from "./services/events/eventSubscribers.js";

async function bootstrap() {
  await connectDatabase();
  await seedDefaultMentors();
  initCronScheduler();
  registerEventSubscribers();

  const app = createApp();

  const httpServer = createServer(app);

  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "*",
      credentials: true,
    },
  });

  registerPeerInterviewSocket(io);
  registerMentorSessionSocketHandlers(io);

  httpServer.listen(env.port, () => {
    console.log(`Server running on port ${env.port}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
