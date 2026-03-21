import type { Request, Response } from "express";
import { verifyJwt } from "@vectornews/shared";
import { newsService } from "../services/newsService";

function getParam(value: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function getUserActionClaims(request: Request, response: Response) {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) {
    response.status(401).json({ message: "Authentication required" });
    return null;
  }

  try {
    const payload = verifyJwt(
      authorization.slice("Bearer ".length),
      process.env.USER_ACTION_JWT_SECRET ?? "vectornews-user-action-secret"
    ) as { uid?: string; name?: string };

    if (!payload.uid || !payload.name) {
      response.status(401).json({ message: "Authentication required" });
      return null;
    }

    return payload;
  } catch {
    response.status(401).json({ message: "Authentication required" });
    return null;
  }
}

export async function getHomepageFeed(_request: Request, response: Response) {
  response.json(await newsService.getHomepageFeed());
}

export async function getArticles(_request: Request, response: Response) {
  response.json(await newsService.getAllArticles());
}

export async function getArticleBySlug(request: Request, response: Response) {
  const article = await newsService.getArticleBySlug(getParam(request.params.slug));
  if (!article) {
    response.status(404).json({ message: "Article not found" });
    return;
  }
  response.json(article);
}

export async function getArticlesByCategory(request: Request, response: Response) {
  response.json(await newsService.getArticlesByCategory(getParam(request.params.slug)));
}

export async function searchArticles(request: Request, response: Response) {
  response.json(await newsService.searchArticles(String(request.query.q ?? "")));
}

export async function getStats(_request: Request, response: Response) {
  response.json(await newsService.getLiveDashboardStats());
}

export async function getCategories(_request: Request, response: Response) {
  response.json(await newsService.getCategories());
}

export async function createArticle(request: Request, response: Response) {
  try {
    const article = await newsService.createArticleFromAdminPayload(request.body);
    response.status(201).json(article);
  } catch {
    response.status(400).json({ message: "Invalid category" });
  }
}

export async function likeArticle(request: Request, response: Response) {
  const user = getUserActionClaims(request, response);
  if (!user) {
    return;
  }

  const { article, alreadyLiked } = await newsService.addLike(getParam(request.params.slug), user.uid);
  if (!article) {
    response.status(404).json({ message: "Article not found" });
    return;
  }
  if (alreadyLiked) {
    response.status(409).json({ message: "Article already liked", article });
    return;
  }
  response.json(article);
}

export async function addComment(request: Request, response: Response) {
  const user = getUserActionClaims(request, response);
  if (!user) {
    return;
  }

  const body = typeof request.body?.body === "string" ? request.body.body.trim() : "";
  if (!body) {
    response.status(400).json({ message: "Comment body is required" });
    return;
  }

  const article = await newsService.addComment(getParam(request.params.slug), {
    authorName: user.name,
    authorRole: "Reader",
    body
  });
  if (!article) {
    response.status(404).json({ message: "Article not found" });
    return;
  }
  response.json(article);
}
