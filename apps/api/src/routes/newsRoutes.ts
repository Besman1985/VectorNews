import { Router } from "express";
import {
  addComment,
  createArticle,
  getArticleBySlug,
  getArticles,
  getArticlesByCategory,
  getCategories,
  getHomepageFeed,
  getStats,
  likeArticle,
  searchArticles
} from "../controllers/newsController";
import { requireAdminAuth } from "../middleware/adminAuth";

export const newsRoutes = Router();

newsRoutes.get("/feed", getHomepageFeed);
newsRoutes.get("/articles", getArticles);
newsRoutes.get("/articles/:slug", getArticleBySlug);
newsRoutes.post("/articles", requireAdminAuth, createArticle);
newsRoutes.post("/articles/:slug/like", likeArticle);
newsRoutes.post("/articles/:slug/comments", addComment);
newsRoutes.get("/categories/:slug/articles", getArticlesByCategory);
newsRoutes.get("/categories", getCategories);
newsRoutes.get("/search", searchArticles);
newsRoutes.get("/admin/stats", requireAdminAuth, getStats);
