import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { getDatabaseHealth } from "./config/db";
import { apiRouter } from "./routes";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.clientOrigin
    })
  );
  app.use(express.json({ limit: "4mb" }));

  app.get("/health", (_request, response) => {
    response.json({ ok: true, service: "vectornews-api" });
  });
  app.get("/api/v1/health/db", async (_request, response) => {
    const payload = await getDatabaseHealth();
    response.status(payload.ok ? 200 : 503).json(payload);
  });

  app.use("/api", apiRouter);

  return app;
}
