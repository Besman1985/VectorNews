import {
  categories,
  dashboardStats
} from "@vectornews/shared";
import type { Comment, NewsArticle } from "@vectornews/shared";

export interface AuthorProfile {
  id: string;
  slug: string;
  name: string;
  role: string;
  bio: string;
}

let demoArticles: NewsArticle[] = [];

const demoAuthors: AuthorProfile[] = [
  {
    id: "editorial-desk",
    slug: "editorial-desk",
    name: "Редакция VectorNews",
    role: "Редакционная команда",
    bio: "Центральная редакция, освещающая ключевые события платформы и готовящая отобранную аналитику."
  }
];

export function getAllArticles() {
  return demoArticles;
}

export function getArticleBySlug(slug: string) {
  return demoArticles.find((article) => article.slug === slug);
}

export function addView(slug: string) {
  demoArticles = demoArticles.map((article) =>
    article.slug === slug ? { ...article, views: article.views + 1 } : article
  );
}

export function addLike(slug: string) {
  demoArticles = demoArticles.map((article) =>
    article.slug === slug ? { ...article, likes: article.likes + 1 } : article
  );
}

export function addComment(slug: string, comment: Omit<Comment, "id" | "createdAt">) {
  demoArticles = demoArticles.map((article) =>
    article.slug === slug
      ? {
          ...article,
          comments: [
            ...article.comments,
            {
              id: `comment-${article.comments.length + 1}`,
              createdAt: new Date().toISOString(),
              ...comment
            }
          ]
        }
      : article
  );
  return getArticleBySlug(slug);
}

export function createArticle(input: Omit<NewsArticle, "id" | "comments" | "views" | "likes">) {
  const article: NewsArticle = {
    ...input,
    id: `news-${demoArticles.length + 1}`,
    views: 0,
    likes: 0,
    comments: []
  };

  demoArticles = [article, ...demoArticles];
  return article;
}

export function getDashboardMetrics() {
  return {
    ...dashboardStats,
    totalArticles: demoArticles.length,
    totalViews: demoArticles.reduce((sum, article) => sum + article.views, 0),
    totalComments: demoArticles.reduce((sum, article) => sum + article.comments.length, 0)
  };
}

export { categories };
export { demoAuthors as authors };
