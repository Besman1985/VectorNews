import type { Pool } from "mysql2/promise";
import mysql from "mysql2/promise";
import { categories as seedCategories } from "@vectornews/shared";
import { env } from "./env";

let pool: Pool | null = null;

async function ensureSchema(nextPool: Pool) {
  await nextPool.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL UNIQUE,
      description TEXT NOT NULL,
      color VARCHAR(64) NOT NULL
    )
  `);

  await nextPool.query(`
    CREATE TABLE IF NOT EXISTS articles (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      slug VARCHAR(255) NOT NULL UNIQUE,
      title TEXT NOT NULL,
      excerpt TEXT NOT NULL,
      content_json LONGTEXT NOT NULL,
      cover_image TEXT NOT NULL,
      source_url TEXT NOT NULL,
      category_slug VARCHAR(255) NOT NULL,
      category_name VARCHAR(255) NOT NULL,
      published_at VARCHAR(64) NOT NULL,
      reading_time INT NOT NULL,
      featured TINYINT(1) NOT NULL DEFAULT 0,
      popular TINYINT(1) NOT NULL DEFAULT 0,
      editor_pick TINYINT(1) NOT NULL DEFAULT 0,
      tags_json LONGTEXT NOT NULL,
      likes INT NOT NULL DEFAULT 0,
      views INT NOT NULL DEFAULT 0
    )
  `);

  try {
    await nextPool.query("ALTER TABLE articles ADD COLUMN source_url TEXT NOT NULL DEFAULT ''");
  } catch {}

  await nextPool.query(`
    CREATE TABLE IF NOT EXISTS comments (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      article_id BIGINT NOT NULL,
      author_name VARCHAR(255) NOT NULL,
      author_role VARCHAR(255) NOT NULL,
      body TEXT NOT NULL,
      created_at VARCHAR(64) NOT NULL,
      CONSTRAINT fk_comments_article_ts
        FOREIGN KEY (article_id) REFERENCES articles(id)
        ON DELETE CASCADE
    )
  `);

  await nextPool.query(`
    CREATE TABLE IF NOT EXISTS article_likes (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      article_id BIGINT NOT NULL,
      user_uid VARCHAR(255) NOT NULL,
      created_at VARCHAR(64) NOT NULL,
      CONSTRAINT fk_article_likes_article_ts
        FOREIGN KEY (article_id) REFERENCES articles(id)
        ON DELETE CASCADE,
      CONSTRAINT uq_article_likes_article_user_ts UNIQUE (article_id, user_uid)
    )
  `);
}

async function seedDatabase(nextPool: Pool) {
  for (const category of seedCategories) {
    await nextPool.query(
      `
      INSERT INTO categories (id, name, slug, description, color)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        description = VALUES(description),
        color = VALUES(color)
      `,
      [String(category.id), category.name, category.slug, category.description, category.color]
    );
  }
}

export async function connectDatabase() {
  const bootstrap = await mysql.createConnection({
    host: env.mysqlHost,
    port: env.mysqlPort,
    user: env.mysqlUser,
    password: env.mysqlPassword
  });

  await bootstrap.query(
    `CREATE DATABASE IF NOT EXISTS \`${env.mysqlDatabase}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await bootstrap.end();

  pool = mysql.createPool({
    host: env.mysqlHost,
    port: env.mysqlPort,
    user: env.mysqlUser,
    password: env.mysqlPassword,
    database: env.mysqlDatabase,
    connectionLimit: 10
  });

  await ensureSchema(pool);
  await seedDatabase(pool);
  console.log("MySQL connected");
}

export function getPool() {
  return pool;
}

export async function getDatabaseHealth() {
  try {
    if (!pool) {
      await connectDatabase();
    }

    if (!pool) {
      throw new Error("Database connection is not available");
    }

    await pool.query("SELECT 1 AS ok");

    return {
      ok: true,
      message: "MySQL connection is available",
      database: env.mysqlDatabase,
      host: env.mysqlHost,
      port: env.mysqlPort
    };
  } catch (error) {
    pool = null;
    return {
      ok: false,
      message: error instanceof Error ? error.message : "MySQL connection failed",
      database: env.mysqlDatabase,
      host: env.mysqlHost,
      port: env.mysqlPort
    };
  }
}
