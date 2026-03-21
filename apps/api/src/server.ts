import { createApp } from "./app";
import { connectDatabase } from "./config/db";
import { env } from "./config/env";

async function bootstrap() {
  await connectDatabase().catch(() => {
    console.warn("API booted without a live MySQL connection; using service fallbacks.");
  });

  const app = createApp();
  app.listen(env.port, () => {
    console.log(`VectorNews API listening on http://localhost:${env.port}`);
  });
}

bootstrap();
