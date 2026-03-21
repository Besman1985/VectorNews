import {
  categories as seedCategories,
  dashboardStats
} from "@vectornews/shared";
import type { Category, Comment, CreateArticlePayload, NewsArticle } from "@vectornews/shared";
import { getPool } from "../config/db";

function buildHomepageFeed(articles: NewsArticle[]) {
  return {
    hero: articles.find((article) => article.featured) ?? articles[0] ?? null,
    latest: [...articles].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 4),
    popular: articles.filter((article) => article.popular).slice(0, 4),
    editorPicks: articles.filter((article) => article.editorPick).slice(0, 3),
    categories: seedCategories
  };
}

function normalizeArticle(document: any, comments: Comment[] = []): NewsArticle {
  return {
    id: String(document.id),
    slug: document.slug,
    title: document.title,
    excerpt: document.excerpt,
    content: JSON.parse(document.content_json ?? "[]"),
    coverImage: document.cover_image,
    sourceUrl: document.source_url ?? "",
    category: document.category_slug,
    categoryName: document.category_name,
    publishedAt: document.published_at,
    readingTime: Number(document.reading_time),
    featured: Boolean(document.featured),
    popular: Boolean(document.popular),
    editorPick: Boolean(document.editor_pick),
    tags: JSON.parse(document.tags_json ?? "[]"),
    likes: Number(document.likes),
    views: Number(document.views),
    comments
  };
}

function normalizeComment(row: any): Comment {
  return {
    id: String(row.id),
    authorName: row.author_name,
    authorRole: row.author_role,
    body: row.body,
    createdAt: row.created_at
  };
}

async function getCommentsByArticleIds(articleIds: number[]) {
  const pool = getPool();
  if (!pool || articleIds.length === 0) {
    return new Map<number, Comment[]>();
  }

  const placeholders = articleIds.map(() => "?").join(", ");
  const [rows] = await pool.query<any[]>(
    `
    SELECT id, article_id, author_name, author_role, body, created_at
    FROM comments
    WHERE article_id IN (${placeholders})
    ORDER BY id ASC
    `,
    articleIds
  );

  const grouped = new Map<number, Comment[]>();
  for (const row of rows) {
    const articleId = Number(row.article_id);
    const existing = grouped.get(articleId) ?? [];
    existing.push(normalizeComment(row));
    grouped.set(articleId, existing);
  }
  return grouped;
}

async function readAllArticles() {
  const pool = getPool();
  if (!pool) {
    return [];
  }

  try {
    const [rows] = await pool.query<any[]>(
      `
      SELECT
        id, slug, title, excerpt, content_json, cover_image,
        source_url, category_slug, category_name, published_at, reading_time,
        featured, popular, editor_pick, tags_json, likes, views
      FROM articles
      ORDER BY published_at DESC
      `
    );
    const commentsByArticle = await getCommentsByArticleIds(rows.map((row) => Number(row.id)));
    return rows.map((row) => normalizeArticle(row, commentsByArticle.get(Number(row.id)) ?? []));
  } catch {
    return [];
  }
}

async function readAllCategories() {
  const pool = getPool();
  if (!pool) {
    return seedCategories;
  }

  try {
    const [rows] = await pool.query<any[]>(
      `
      SELECT id, name, slug, description, color
      FROM categories
      ORDER BY name ASC
      `
    );
    return rows.length > 0
      ? rows.map(
          (row) =>
            ({
              id: row.id,
              name: row.name,
              slug: row.slug,
              description: row.description,
              color: row.color
            }) satisfies Category
        )
      : seedCategories;
  } catch {
    return seedCategories;
  }
}

function searchInArticles(articles: NewsArticle[], query: string) {
  const normalizedQuery = query.toLowerCase();
  return articles.filter((article) =>
    [article.title, article.excerpt, article.tags.join(" "), article.categoryName]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery)
  );
}

export const newsService = {
  async getHomepageFeed() {
    const articles = await readAllArticles();
    const categories = await readAllCategories();
    return {
      ...buildHomepageFeed(articles),
      categories
    };
  },

  async getAllArticles() {
    return readAllArticles();
  },

  async getArticleBySlug(slug: string) {
    const pool = getPool();
    if (pool) {
      try {
        const [rows] = await pool.query<any[]>(
          `
          SELECT
            id, slug, title, excerpt, content_json, cover_image,
            source_url, category_slug, category_name, published_at, reading_time,
            featured, popular, editor_pick, tags_json, likes, views
          FROM articles
          WHERE slug = ?
          LIMIT 1
          `,
          [slug]
        );
        if (rows.length > 0) {
          const article = rows[0];
          const commentsByArticle = await getCommentsByArticleIds([Number(article.id)]);
          return normalizeArticle(article, commentsByArticle.get(Number(article.id)) ?? []);
        }
      } catch {}
    }
    return null;
  },

  async getArticlesByCategory(category: string) {
    const articles = await readAllArticles();
    return articles.filter((article) => article.category === category);
  },

  async searchArticles(query: string) {
    const articles = await readAllArticles();
    return searchInArticles(articles, query);
  },

  async getCategories() {
    return readAllCategories();
  },

  async createArticle(input: Omit<NewsArticle, "id" | "comments" | "views" | "likes">) {
    const pool = getPool();
    if (pool) {
      try {
        const [result] = await pool.query<any>(
          `
          INSERT INTO articles (
            slug, title, excerpt, content_json, cover_image, source_url,
            category_slug, category_name, published_at, reading_time,
            featured, popular, editor_pick, tags_json, likes, views
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
          `,
          [
            input.slug,
            input.title,
            input.excerpt,
            JSON.stringify(input.content),
            input.coverImage,
            input.sourceUrl,
            input.category,
            input.categoryName,
            input.publishedAt,
            input.readingTime,
            Number(input.featured),
            Number(input.popular),
            Number(input.editorPick),
            JSON.stringify(input.tags)
          ]
        );

        return {
          ...input,
          id: String(result.insertId),
          comments: [],
          views: 0,
          likes: 0
        };
      } catch {}
    }
    throw new Error("Database connection is not available");
  },

  async createArticleFromAdminPayload(payload: CreateArticlePayload) {
    const categoryList = await readAllCategories();
    const category = (categoryList as any[]).find(
      (item) => item.slug === payload.category || item.id === payload.category
    );

    if (!category) {
      throw new Error("Invalid category");
    }

    return this.createArticle({
      slug: payload.slug,
      title: payload.title,
      excerpt: payload.excerpt,
      content: payload.content,
      coverImage: payload.coverImage,
      sourceUrl: payload.sourceUrl,
      category: category.slug,
      categoryName: category.name,
      publishedAt: new Date().toISOString(),
      readingTime: Math.max(3, Math.ceil(payload.content.join(" ").split(" ").length / 180)),
      featured: false,
      popular: false,
      editorPick: false,
      tags: payload.tags
    });
  },

  async addLike(slug: string, userUid: string) {
    const pool = getPool();
    if (pool) {
      try {
        const [articles] = await pool.query<any[]>("SELECT id FROM articles WHERE slug = ? LIMIT 1", [slug]);
        if (articles.length > 0) {
          const articleId = Number(articles[0].id);
          try {
            await pool.query(
              `
              INSERT INTO article_likes (article_id, user_uid, created_at)
              VALUES (?, ?, ?)
              `,
              [articleId, userUid, new Date().toISOString()]
            );
          } catch (error: any) {
            if (error?.code === "ER_DUP_ENTRY") {
              return {
                article: await this.getArticleBySlug(slug),
                alreadyLiked: true
              };
            }
            throw error;
          }

          await pool.query("UPDATE articles SET likes = likes + 1 WHERE id = ?", [articleId]);
          return {
            article: await this.getArticleBySlug(slug),
            alreadyLiked: false
          };
        }
      } catch {}
    }
    return { article: null, alreadyLiked: false };
  },

  async addView(slug: string) {
    const pool = getPool();
    if (pool) {
      try {
        const [result] = await pool.query<any>("UPDATE articles SET views = views + 1 WHERE slug = ?", [
          slug
        ]);
        if (result.affectedRows > 0) {
          return this.getArticleBySlug(slug);
        }
      } catch {}
    }
    return null;
  },

  async addComment(slug: string, comment: Omit<Comment, "id" | "createdAt">) {
    const nextComment = {
      authorName: comment.authorName,
      authorRole: comment.authorRole,
      body: comment.body,
      createdAt: new Date().toISOString()
    };

    const pool = getPool();
    if (pool) {
      try {
        const [articles] = await pool.query<any[]>("SELECT id FROM articles WHERE slug = ? LIMIT 1", [slug]);
        if (articles.length > 0) {
          await pool.query(
            `
            INSERT INTO comments (article_id, author_name, author_role, body, created_at)
            VALUES (?, ?, ?, ?, ?)
            `,
            [
              Number(articles[0].id),
              nextComment.authorName,
              nextComment.authorRole,
              nextComment.body,
              nextComment.createdAt
            ]
          );
          return this.getArticleBySlug(slug);
        }
      } catch {}
    }
    return null;
  },

  async getDashboardStats() {
    return dashboardStats;
  },

  async getLiveDashboardStats() {
    const articles = await readAllArticles();
    return {
      ...dashboardStats,
      totalArticles: articles.length,
      totalViews: articles.reduce((sum, article) => sum + article.views, 0),
      totalComments: articles.reduce((sum, article) => sum + article.comments.length, 0)
    };
  }
};
