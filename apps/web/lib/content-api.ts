import {
  categories as seedCategories
} from "@vectornews/shared";
import type { Category, DashboardStats, NewsArticle } from "@vectornews/shared";
import {
  authors,
  categories,
  getAllArticles,
  getArticleBySlug,
  getDashboardMetrics,
  type AuthorProfile
} from "./store";

const apiBaseUrl = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL;

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  if (!apiBaseUrl) {
    throw new Error("API_URL не настроен");
  }

  const headers = new Headers(init?.headers ?? {});
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers,
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Ошибка запроса к API: ${response.status}`);
  }

  return response.json();
}

export async function getHomepageFeed() {
  try {
    return await fetchJson<{
      hero: NewsArticle | null;
      latest: NewsArticle[];
      popular: NewsArticle[];
      editorPicks: NewsArticle[];
      categories: Category[];
    }>("/api/v1/feed");
  } catch {
    const articles = getAllArticles();
    return {
      hero: articles.find((article) => article.featured) ?? articles[0] ?? null,
      latest: [...articles].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 4),
      popular: articles.filter((article) => article.popular).slice(0, 3),
      editorPicks: articles.filter((article) => article.editorPick).slice(0, 3),
      categories: seedCategories
    };
  }
}

export async function getArticles() {
  try {
    return await fetchJson<NewsArticle[]>("/api/v1/articles");
  } catch {
    return getAllArticles();
  }
}

export async function getArticle(slug: string) {
  try {
    return await fetchJson<NewsArticle>(`/api/v1/articles/${slug}`);
  } catch {
    return getArticleBySlug(slug);
  }
}

export async function getArticlesByCategory(slug: string) {
  try {
    return await fetchJson<NewsArticle[]>(`/api/v1/categories/${slug}/articles`);
  } catch {
    return getAllArticles().filter((article) => article.category === slug);
  }
}

export async function getSearchResults(query: string) {
  try {
    return await fetchJson<NewsArticle[]>(`/api/v1/search?q=${encodeURIComponent(query)}`);
  } catch {
    const normalizedQuery = query.toLowerCase().trim();
    return getAllArticles().filter((article) =>
      [article.title, article.excerpt, article.tags.join(" "), article.categoryName]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }
}

export async function getCategories() {
  try {
    return await fetchJson<Category[]>("/api/v1/categories");
  } catch {
    return categories;
  }
}

export async function getAuthors(): Promise<AuthorProfile[]> {
  try {
    return await fetchJson<AuthorProfile[]>("/api/v1/authors");
  } catch {
    return authors;
  }
}

export async function getArticlesByAuthor(authorId: string): Promise<NewsArticle[]> {
  try {
    return await fetchJson<NewsArticle[]>(`/api/v1/authors/${encodeURIComponent(authorId)}/articles`);
  } catch {
    if (authorId === "editorial-desk") {
      return getAllArticles();
    }
    return [];
  }
}

export async function getAdminStats(adminToken?: string) {
  try {
    return await fetchJson<DashboardStats>("/api/v1/admin/stats", {
      headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : {}
    });
  } catch {
    return getDashboardMetrics();
  }
}

export { apiBaseUrl };
