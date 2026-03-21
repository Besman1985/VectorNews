import { Router } from "express";
import { newsRoutes } from "./newsRoutes";

export const apiRouter = Router();

apiRouter.use("/v1", newsRoutes);
