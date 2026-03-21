import type { NextFunction, Request, Response } from "express";
import { verifyJwt } from "@vectornews/shared";
import { env } from "../config/env";

export async function requireAdminAuth(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) {
    response.status(401).json({ message: "Unauthorized" });
    return;
  }

  const token = authorization.slice("Bearer ".length);

  try {
    await verifyJwt(token, env.adminJwtSecret);
    next();
  } catch {
    response.status(401).json({ message: "Unauthorized" });
  }
}
