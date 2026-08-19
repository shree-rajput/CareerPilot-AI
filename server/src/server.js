import { createApp } from "./app.js";
import { connectDatabase } from "./config/db.js";
import { env } from "./config/env.js";

async function bootstrap() {
  await connectDatabase();

  const app = createApp();

  app.listen(env.port, () => {
    console.log(`CareerPilot API running on port ${env.port}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
