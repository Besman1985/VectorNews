from __future__ import annotations

import base64
import copy
import hashlib
import hmac
import json
import os
import pathlib
import re
import subprocess
import time
import urllib.error
import urllib.parse
from dataclasses import dataclass
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any, TypedDict

try:
    import mysql.connector
    from mysql.connector import Error as MySQLError
except Exception:
    mysql = None
    MySQLError = Exception

ROOT_DIR = pathlib.Path(__file__).resolve().parents[2]
API_DIR = pathlib.Path(__file__).resolve().parent


def load_dotenv(path: pathlib.Path, *, override: bool = False) -> None:
    if not path.exists():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip("'").strip('"')
        if override or key not in os.environ:
            os.environ[key] = value


load_dotenv(API_DIR / ".env")
load_dotenv(API_DIR / ".env.local", override=True)


@dataclass(frozen=True)
class Env:
    port: int = int(os.getenv("PORT", "4000"))
    api_public_url: str = os.getenv("API_PUBLIC_URL", "http://localhost:4000")
    mysql_host: str = os.getenv("MYSQL_HOST", "127.0.0.1")
    mysql_port: int = int(os.getenv("MYSQL_PORT", "3306"))
    mysql_user: str = os.getenv("MYSQL_USER", "root")
    mysql_password: str = os.getenv("MYSQL_PASSWORD", "")
    mysql_database: str = os.getenv("MYSQL_DATABASE", "vectornews")
    client_origin: str = os.getenv("CLIENT_ORIGIN", "http://localhost:3000")
    admin_jwt_secret: str = os.getenv("ADMIN_JWT_SECRET", "vectornews-admin-secret")
    user_action_jwt_secret: str = os.getenv("USER_ACTION_JWT_SECRET", "vectornews-user-action-secret")


env = Env()

EDITOR_CHOICE_CACHE_TTL_SECONDS = 60
_editor_choice_cache: dict[str, Any] = {
    "slugs": None,
    "loaded_at": 0.0,
}


class CreateArticlePayload(TypedDict):
    title: str
    slug: str
    excerpt: str
    coverImage: str
    sourceUrl: str
    category: str
    content: list[str]
    tags: list[str]


def deep_clone(value: Any) -> Any:
    return copy.deepcopy(value)


HASHTAG_PATTERN = re.compile(r"#([^\s#,]+)")


def split_raw_tags(raw_tags: Any) -> list[str]:
    if isinstance(raw_tags, str):
        extracted = HASHTAG_PATTERN.findall(raw_tags)
        if extracted:
            return extracted
        return [part.strip() for part in re.split(r"[\n,;]+", raw_tags) if part.strip()]

    if isinstance(raw_tags, list):
        collected: list[str] = []
        for item in raw_tags:
            collected.extend(split_raw_tags(item))
        return collected

    return []


def normalize_tags(raw_tags: Any) -> list[str]:
    raw_items = split_raw_tags(raw_tags)
    if not raw_items:
        return []

    normalized: list[str] = []
    seen: set[str] = set()
    for raw_tag in raw_items:
        tag = raw_tag.strip().lstrip("#").strip()
        if not tag:
            continue
        key = tag.casefold()
        if key in seen:
            continue
        seen.add(key)
        normalized.append(tag)
    return normalized


def load_seed_data() -> dict[str, Any]:
    command = [
        "node",
        "--input-type=module",
        "-e",
        (
            "import {categories, dashboardStats} "
            "from './packages/shared/dist/data.js'; "
            "console.log(JSON.stringify({categories, dashboardStats}));"
        ),
    ]
    fallback = {
        "categories": [],
        "dashboardStats": {
            "totalArticles": 0,
            "totalViews": 0,
            "totalComments": 0,
        },
    }
    try:
        result = subprocess.run(
            command,
            cwd=ROOT_DIR,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="strict",
            check=True,
        )
        if result.stdout:
            return json.loads(result.stdout)
    except Exception:
        pass
    return fallback


SEED_DATA = load_seed_data()


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def read_firestore_editor_choice_slugs() -> list[str] | None:
    now = time.time()
    cached_slugs = _editor_choice_cache["slugs"]
    if (
        cached_slugs is not None
        and now - float(_editor_choice_cache["loaded_at"]) < EDITOR_CHOICE_CACHE_TTL_SECONDS
    ):
        return list(cached_slugs)

    command = ["node", str(ROOT_DIR / "scripts" / "read-editors-choice.mjs")]
    child_env = os.environ.copy()
    child_env.setdefault(
        "FIRESTORE_EDITORS_CHOICE_COLLECTION",
        "Editor'sСhoice,Editor'sChoice,EditorsChoice,Editors'Choice",
    )
    child_env.setdefault("FIRESTORE_EDITORS_CHOICE_DOCUMENT", "Data,data")
    child_env.setdefault("FIRESTORE_EDITORS_CHOICE_FIELD", "Posts,posts")

    try:
        result = subprocess.run(
            command,
            cwd=ROOT_DIR,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="strict",
            check=True,
            env=child_env,
        )
        parsed = json.loads(result.stdout or "[]")
        if not isinstance(parsed, list):
            raise ValueError("Editor choice payload is not a list")

        slugs = [item.strip() for item in parsed if isinstance(item, str) and item.strip()]
        _editor_choice_cache["slugs"] = slugs
        _editor_choice_cache["loaded_at"] = now
        return list(slugs)
    except Exception:
        return None


def resolve_editor_picks(
    articles: list[dict[str, Any]], editor_choice_slugs: list[str] | None = None
) -> list[dict[str, Any]]:
    if editor_choice_slugs:
        articles_by_slug = {article["slug"]: article for article in articles}
        resolved = [articles_by_slug[slug] for slug in editor_choice_slugs if slug in articles_by_slug]
        if resolved:
            return resolved[:3]

    return [article for article in articles if article.get("editorPick")][:3]


def build_homepage_feed(
    articles: list[dict[str, Any]], editor_choice_slugs: list[str] | None = None
) -> dict[str, Any]:
    latest = sorted(articles, key=lambda article: article["publishedAt"], reverse=True)[:4]
    popular = [article for article in articles if article.get("popular")][:4]
    editor_picks = resolve_editor_picks(articles, editor_choice_slugs)
    hero = next((article for article in articles if article.get("featured")), None) or (
        articles[0] if articles else None
    )
    return {
        "hero": hero,
        "latest": latest,
        "popular": popular,
        "editorPicks": editor_picks,
        "categories": deep_clone(SEED_DATA["categories"]),
    }


def base64url_decode(value: str) -> bytes:
    padded = value + "=" * ((4 - len(value) % 4) % 4)
    return base64.urlsafe_b64decode(padded.encode("ascii"))


def verify_jwt(token: str, secret: str) -> dict[str, Any]:
    parts = token.split(".")
    if len(parts) != 3:
        raise ValueError("Некорректный токен")

    header, payload, signature = parts
    unsigned_token = f"{header}.{payload}".encode("utf-8")
    expected_signature = hmac.new(secret.encode("utf-8"), unsigned_token, hashlib.sha256).digest()
    actual_signature = base64url_decode(signature)

    if not hmac.compare_digest(expected_signature, actual_signature):
        raise ValueError("Некорректная подпись")

    parsed_payload = json.loads(base64url_decode(payload).decode("utf-8"))
    if parsed_payload.get("exp") and parsed_payload["exp"] < int(time.time()):
        raise ValueError("Срок действия токена истек")
    return parsed_payload


class Repository:
    def __init__(self, environment: Env):
        self.environment = environment
        self.seed_categories = deep_clone(SEED_DATA["categories"])
        self.dashboard_stats = deep_clone(SEED_DATA["dashboardStats"])
        self.database = None
        self._connect_database()

    def _connect_database(self) -> None:
        if mysql is None:
            print("API запущен без активного подключения к MySQL.")
            return

        try:
            bootstrap_connection = mysql.connector.connect(
                host=self.environment.mysql_host,
                port=self.environment.mysql_port,
                user=self.environment.mysql_user,
                password=self.environment.mysql_password,
            )
            bootstrap_connection.autocommit = True
            bootstrap_cursor = bootstrap_connection.cursor()
            bootstrap_cursor.execute(
                f"CREATE DATABASE IF NOT EXISTS `{self.environment.mysql_database}` "
                "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
            )
            bootstrap_cursor.close()
            bootstrap_connection.close()

            self.database = mysql.connector.connect(
                host=self.environment.mysql_host,
                port=self.environment.mysql_port,
                user=self.environment.mysql_user,
                password=self.environment.mysql_password,
                database=self.environment.mysql_database,
            )
            self.database.autocommit = True
            self._ensure_schema()
            self._seed_database()
            print("MySQL подключен")
        except Exception:
            self.database = None
            print("API запущен без активного подключения к MySQL.")

    def get_database_health(self) -> dict[str, Any]:
        if mysql is None:
            return {
                "ok": False,
                "message": "Пакет mysql-connector-python не установлен",
                "database": self.environment.mysql_database,
                "host": self.environment.mysql_host,
                "port": self.environment.mysql_port,
            }

        try:
            if self.database is None or not self.database.is_connected():
                self._connect_database()

            if self.database is None:
                raise ConnectionError("Подключение к базе данных недоступно")

            self.database.ping(reconnect=True, attempts=1, delay=0)
            cursor = self.database.cursor()
            try:
                cursor.execute("SELECT 1 AS ok")
                cursor.fetchone()
            finally:
                cursor.close()

            return {
                "ok": True,
                "message": "Подключение к MySQL доступно",
                "database": self.environment.mysql_database,
                "host": self.environment.mysql_host,
                "port": self.environment.mysql_port,
            }
        except Exception as error:
            self.database = None
            return {
                "ok": False,
                "message": str(error) or "Не удалось подключиться к MySQL",
                "database": self.environment.mysql_database,
                "host": self.environment.mysql_host,
                "port": self.environment.mysql_port,
            }

    def _ensure_schema(self) -> None:
        statements = [
            """
            CREATE TABLE IF NOT EXISTS categories (
                id VARCHAR(64) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                slug VARCHAR(255) NOT NULL UNIQUE,
                description TEXT NOT NULL,
                color VARCHAR(64) NOT NULL
            )
            """,
            """
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
                views INT NOT NULL DEFAULT 0,
                INDEX idx_articles_published_at (published_at),
                INDEX idx_articles_category_slug (category_slug)
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS comments (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                article_id BIGINT NOT NULL,
                author_name VARCHAR(255) NOT NULL,
                author_role VARCHAR(255) NOT NULL,
                body TEXT NOT NULL,
                created_at VARCHAR(64) NOT NULL,
                CONSTRAINT fk_comments_article
                    FOREIGN KEY (article_id) REFERENCES articles(id)
                    ON DELETE CASCADE
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS article_likes (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                article_id BIGINT NOT NULL,
                user_uid VARCHAR(255) NOT NULL,
                created_at VARCHAR(64) NOT NULL,
                CONSTRAINT fk_article_likes_article
                    FOREIGN KEY (article_id) REFERENCES articles(id)
                    ON DELETE CASCADE,
                CONSTRAINT uq_article_likes_article_user UNIQUE (article_id, user_uid)
            )
            """,
        ]
        cursor = self.database.cursor()
        try:
            for statement in statements:
                cursor.execute(statement)
            try:
                cursor.execute("ALTER TABLE articles ADD COLUMN source_url TEXT NOT NULL DEFAULT ''")
            except Exception:
                pass
        finally:
            cursor.close()

    def _seed_database(self) -> None:
        cursor = self.database.cursor(dictionary=True)
        try:
            category_rows = [
                (
                    str(category["id"]),
                    category["name"],
                    category["slug"],
                    category["description"],
                    category["color"],
                )
                for category in self.seed_categories
            ]
            cursor.executemany(
                """
                INSERT INTO categories (id, name, slug, description, color)
                VALUES (%s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    name = VALUES(name),
                    description = VALUES(description),
                    color = VALUES(color)
                """,
                category_rows,
            )
        finally:
            cursor.close()

    def _fetch_rows(
        self, query: str, params: tuple[Any, ...] = (), *, dictionary: bool = True
    ) -> list[dict[str, Any]] | list[tuple[Any, ...]]:
        cursor = self.database.cursor(dictionary=dictionary)
        try:
            cursor.execute(query, params)
            return cursor.fetchall()
        finally:
            cursor.close()

    def _fetch_one(
        self, query: str, params: tuple[Any, ...] = (), *, dictionary: bool = True
    ) -> dict[str, Any] | tuple[Any, ...] | None:
        cursor = self.database.cursor(dictionary=dictionary)
        try:
            cursor.execute(query, params)
            return cursor.fetchone()
        finally:
            cursor.close()

    def _execute(self, query: str, params: tuple[Any, ...] = ()) -> tuple[int, int]:
        cursor = self.database.cursor()
        try:
            cursor.execute(query, params)
            return cursor.rowcount, int(cursor.lastrowid or 0)
        finally:
            cursor.close()

    def _safe_json_loads(self, raw: Any, default: Any) -> Any:
        if raw in (None, ""):
            return deep_clone(default)
        try:
            return json.loads(raw)
        except Exception:
            return deep_clone(default)

    def _normalize_comment_row(self, row: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": str(row["id"]),
            "authorName": row["author_name"],
            "authorRole": row["author_role"],
            "body": row["body"],
            "createdAt": row["created_at"],
        }

    def _normalize_article_row(
        self, row: dict[str, Any], comments_by_article: dict[int, list[dict[str, Any]]]
    ) -> dict[str, Any]:
        article_id = int(row["id"])
        return {
            "id": str(article_id),
            "slug": row["slug"],
            "title": row["title"],
            "excerpt": row["excerpt"],
            "content": list(self._safe_json_loads(row["content_json"], [])),
            "coverImage": row["cover_image"],
            "sourceUrl": row.get("source_url") or "",
            "category": row["category_slug"],
            "categoryName": row["category_name"],
            "publishedAt": row["published_at"],
            "readingTime": int(row["reading_time"]),
            "featured": bool(row["featured"]),
            "popular": bool(row["popular"]),
            "editorPick": bool(row["editor_pick"]),
            "tags": normalize_tags(self._safe_json_loads(row["tags_json"], [])),
            "likes": int(row["likes"]),
            "views": int(row["views"]),
            "comments": comments_by_article.get(article_id, []),
        }

    def _normalize_category_row(self, row: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": row["id"],
            "name": row["name"],
            "slug": row["slug"],
            "description": row["description"],
            "color": row["color"],
        }

    def _read_comments_by_article(self, article_ids: list[int]) -> dict[int, list[dict[str, Any]]]:
        if not article_ids:
            return {}
        placeholders = ", ".join(["%s"] * len(article_ids))
        rows = self._fetch_rows(
            f"""
            SELECT id, article_id, author_name, author_role, body, created_at
            FROM comments
            WHERE article_id IN ({placeholders})
            ORDER BY id ASC
            """,
            tuple(article_ids),
        )
        comments_by_article: dict[int, list[dict[str, Any]]] = {}
        for row in rows:
            article_id = int(row["article_id"])
            comments_by_article.setdefault(article_id, []).append(self._normalize_comment_row(row))
        return comments_by_article

    def _read_articles_from_rows(self, rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
        article_ids = [int(row["id"]) for row in rows]
        comments_by_article = self._read_comments_by_article(article_ids)
        return [self._normalize_article_row(row, comments_by_article) for row in rows]

    def read_all_articles(self) -> list[dict[str, Any]]:
        if self.database is not None:
            try:
                rows = self._fetch_rows(
                    """
                    SELECT
                        id, slug, title, excerpt, content_json, cover_image,
                        source_url, category_slug, category_name, published_at, reading_time,
                        featured, popular, editor_pick, tags_json, likes, views
                    FROM articles
                    ORDER BY published_at DESC
                    """
                )
                return self._read_articles_from_rows(rows)
            except MySQLError:
                pass
        return []

    def read_all_categories(self) -> list[dict[str, Any]]:
        if self.database is not None:
            try:
                rows = self._fetch_rows(
                    """
                    SELECT id, name, slug, description, color
                    FROM categories
                    ORDER BY name ASC
                    """
                )
                if rows:
                    return [self._normalize_category_row(row) for row in rows]
            except MySQLError:
                pass
        return deep_clone(self.seed_categories)

    def get_article_by_slug(self, slug: str) -> dict[str, Any] | None:
        if self.database is not None:
            try:
                row = self._fetch_one(
                    """
                    SELECT
                        id, slug, title, excerpt, content_json, cover_image,
                        source_url, category_slug, category_name, published_at, reading_time,
                        featured, popular, editor_pick, tags_json, likes, views
                    FROM articles
                    WHERE slug = %s
                    LIMIT 1
                    """,
                    (slug,),
                )
                if row:
                    comments_by_article = self._read_comments_by_article([int(row["id"])])
                    return self._normalize_article_row(row, comments_by_article)
            except MySQLError:
                pass
        return None

    def create_article(self, payload: dict[str, Any]) -> dict[str, Any]:
        if self.database is not None:
            try:
                _, article_id = self._execute(
                    """
                    INSERT INTO articles (
                        slug, title, excerpt, content_json, cover_image, source_url,
                        category_slug, category_name, published_at, reading_time,
                        featured, popular, editor_pick, tags_json, likes, views
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        payload["slug"],
                        payload["title"],
                        payload["excerpt"],
                        json.dumps(payload["content"], ensure_ascii=False),
                        payload["coverImage"],
                        payload["sourceUrl"],
                        payload["category"],
                        payload["categoryName"],
                        payload["publishedAt"],
                        int(payload["readingTime"]),
                        int(bool(payload.get("featured", False))),
                        int(bool(payload.get("popular", False))),
                        int(bool(payload.get("editorPick", False))),
                        json.dumps(payload.get("tags", []), ensure_ascii=False),
                        0,
                        0,
                    ),
                )
                if article_id:
                    created = self.get_article_by_slug(payload["slug"])
                    if created is not None:
                        return created
            except MySQLError:
                pass

        raise ConnectionError("Подключение к базе данных недоступно")

    def update_article(self, slug: str, payload: dict[str, Any]) -> dict[str, Any] | None:
        if self.database is not None:
            existing = self.get_article_by_slug(slug)
            if existing is None:
                return None
            try:
                rowcount, _ = self._execute(
                    """
                    UPDATE articles
                    SET
                        slug = %s,
                        title = %s,
                        excerpt = %s,
                        content_json = %s,
                        cover_image = %s,
                        source_url = %s,
                        category_slug = %s,
                        category_name = %s,
                        reading_time = %s,
                        tags_json = %s
                    WHERE slug = %s
                    """,
                    (
                        payload["slug"],
                        payload["title"],
                        payload["excerpt"],
                        json.dumps(payload["content"], ensure_ascii=False),
                        payload["coverImage"],
                        payload["sourceUrl"],
                        payload["category"],
                        payload["categoryName"],
                        int(payload["readingTime"]),
                        json.dumps(payload.get("tags", []), ensure_ascii=False),
                        slug,
                    ),
                )
                if rowcount > 0:
                    return self.get_article_by_slug(payload["slug"])
            except MySQLError as error:
                raise ValueError(str(error) or "Не удалось обновить статью") from error

        return None

    def add_like(self, slug: str, user_uid: str) -> tuple[dict[str, Any] | None, bool]:
        if self.database is not None:
            try:
                article_row = self._fetch_one(
                    "SELECT id FROM articles WHERE slug = %s LIMIT 1",
                    (slug,),
                )
                if article_row:
                    article_id = int(article_row["id"])
                    try:
                        self._execute(
                            """
                            INSERT INTO article_likes (article_id, user_uid, created_at)
                            VALUES (%s, %s, %s)
                            """,
                            (article_id, user_uid, now_iso()),
                        )
                    except MySQLError:
                        existing_like = self._fetch_one(
                            """
                            SELECT id
                            FROM article_likes
                            WHERE article_id = %s AND user_uid = %s
                            LIMIT 1
                            """,
                            (article_id, user_uid),
                        )
                        if existing_like:
                            return self.get_article_by_slug(slug), True
                        raise

                    self._execute(
                        "UPDATE articles SET likes = likes + 1 WHERE id = %s",
                        (article_id,),
                    )
                    return self.get_article_by_slug(slug), False
            except MySQLError:
                pass

        return None, False

    def add_comment(self, slug: str, comment: dict[str, Any]) -> dict[str, Any] | None:
        next_comment = {
            "authorName": comment["authorName"],
            "authorRole": comment["authorRole"],
            "body": comment["body"],
            "createdAt": now_iso(),
        }

        if self.database is not None:
            try:
                article_row = self._fetch_one(
                    "SELECT id FROM articles WHERE slug = %s LIMIT 1",
                    (slug,),
                )
                if article_row:
                    self._execute(
                        """
                        INSERT INTO comments (
                            article_id, author_name, author_role, body, created_at
                        ) VALUES (%s, %s, %s, %s, %s)
                        """,
                        (
                            int(article_row["id"]),
                            next_comment["authorName"],
                            next_comment["authorRole"],
                            next_comment["body"],
                            next_comment["createdAt"],
                        ),
                    )
                    return self.get_article_by_slug(slug)
            except MySQLError:
                pass

        return None


repository = Repository(env)


class NewsService:
    def __init__(self, repo: Repository):
        self.repo = repo

    def get_homepage_feed(self) -> dict[str, Any]:
        articles = self.repo.read_all_articles()
        categories = self.repo.read_all_categories()
        feed = build_homepage_feed(articles, read_firestore_editor_choice_slugs())
        feed["categories"] = categories
        return feed

    def get_all_articles(self) -> list[dict[str, Any]]:
        return self.repo.read_all_articles()

    def get_articles_by_category(self, slug: str) -> list[dict[str, Any]]:
        return [article for article in self.repo.read_all_articles() if article["category"] == slug]

    def search_articles(self, query: str) -> list[dict[str, Any]]:
        normalized = query.lower()
        return [
            article
            for article in self.repo.read_all_articles()
            if normalized
            in " ".join(
                [
                    article["title"],
                    article["excerpt"],
                    " ".join(article["tags"]),
                    article["categoryName"],
                ]
            ).lower()
        ]

    def get_live_dashboard_stats(self) -> dict[str, Any]:
        articles = self.repo.read_all_articles()
        return {
            **self.repo.dashboard_stats,
            "totalArticles": len(articles),
            "totalViews": sum(article["views"] for article in articles),
            "totalComments": sum(len(article["comments"]) for article in articles),
        }

    def create_article_from_admin_payload(self, payload: CreateArticlePayload) -> dict[str, Any]:
        category = self._resolve_category(payload["category"])
        content = payload["content"]
        tags = normalize_tags(payload["tags"])
        return self.repo.create_article(
            {
                "slug": payload["slug"],
                "title": payload["title"],
                "excerpt": payload["excerpt"],
                "content": content,
                "coverImage": payload["coverImage"],
                "sourceUrl": payload["sourceUrl"],
                "category": category["slug"],
                "categoryName": category["name"],
                "publishedAt": now_iso(),
                "readingTime": max(3, -(-len(" ".join(content).split()) // 180)),
                "featured": False,
                "popular": False,
                "editorPick": False,
                "tags": tags,
            }
        )

    def update_article_from_admin_payload(self, slug: str, payload: CreateArticlePayload) -> dict[str, Any]:
        category = self._resolve_category(payload["category"])
        content = payload["content"]
        tags = normalize_tags(payload["tags"])
        updated = self.repo.update_article(
            slug,
            {
                "slug": payload["slug"],
                "title": payload["title"],
                "excerpt": payload["excerpt"],
                "content": content,
                "coverImage": payload["coverImage"],
                "sourceUrl": payload["sourceUrl"],
                "category": category["slug"],
                "categoryName": category["name"],
                "readingTime": max(3, -(-len(" ".join(content).split()) // 180)),
                "tags": tags,
            },
        )
        if updated is None:
            raise LookupError("Статья не найдена")
        return updated

    def _resolve_category(self, category_value: str) -> dict[str, Any]:
        categories = self.repo.read_all_categories()
        category = next(
            (
                item
                for item in categories
                if item.get("slug") == category_value
                or item.get("id") == category_value
                or str(item.get("_id")) == category_value
            ),
            None,
        )

        if category is None:
            raise ValueError("Некорректная категория")
        return category


news_service = NewsService(repository)

class ApiHandler(BaseHTTPRequestHandler):
    server_version = "VectorNewsPythonAPI/1.0"

    def log_message(self, format: str, *args: Any) -> None:
        return

    def end_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", env.client_origin)
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS")
        super().end_headers()

    def do_OPTIONS(self) -> None:
        self.send_response(HTTPStatus.NO_CONTENT)
        self.end_headers()

    def do_GET(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        if path == "/health":
            self.send_json(HTTPStatus.OK, {"ok": True, "service": "vectornews-api"})
            return
        if path == "/api/v1/health/db":
            payload = repository.get_database_health()
            status = HTTPStatus.OK if payload["ok"] else HTTPStatus.SERVICE_UNAVAILABLE
            self.send_json(status, payload)
            return
        if path == "/api/v1/feed":
            self.send_json(HTTPStatus.OK, news_service.get_homepage_feed())
            return
        if path == "/api/v1/articles":
            self.send_json(HTTPStatus.OK, news_service.get_all_articles())
            return
        if path == "/api/v1/categories":
            self.send_json(HTTPStatus.OK, repository.read_all_categories())
            return
        if path == "/api/v1/search":
            self.send_json(HTTPStatus.OK, news_service.search_articles(query.get("q", [""])[0]))
            return
        if path == "/api/v1/admin/stats":
            if not self.require_admin_auth():
                return
            self.send_json(HTTPStatus.OK, news_service.get_live_dashboard_stats())
            return

        article_slug = self.match_path(path, "/api/v1/articles/")
        if article_slug and "/" not in article_slug:
            article = repository.get_article_by_slug(article_slug)
            if article is None:
                self.send_json(HTTPStatus.NOT_FOUND, {"message": "Статья не найдена"})
                return
            self.send_json(HTTPStatus.OK, article)
            return

        category_slug = self.match_path(path, "/api/v1/categories/", "/articles")
        if category_slug:
            self.send_json(HTTPStatus.OK, news_service.get_articles_by_category(category_slug))
            return

        self.send_json(HTTPStatus.NOT_FOUND, {"message": "Не найдено"})

    def do_POST(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/api/v1/articles":
            if not self.require_admin_auth():
                return
            payload = self.read_json_body()
            if payload is None:
                return
            try:
                article = news_service.create_article_from_admin_payload(payload)
            except Exception:
                self.send_json(HTTPStatus.BAD_REQUEST, {"message": "Некорректная категория"})
                return
            self.send_json(HTTPStatus.CREATED, article)
            return

        like_slug = self.match_path(path, "/api/v1/articles/", "/like")
        if like_slug:
            user = self.require_user_action_auth()
            if user is None:
                return
            article, already_liked = repository.add_like(like_slug, str(user["uid"]))
            if article is None:
                self.send_json(HTTPStatus.NOT_FOUND, {"message": "Статья не найдена"})
                return
            if already_liked:
                self.send_json(HTTPStatus.CONFLICT, {"message": "Лайк этой статье уже поставлен", "article": article})
                return
            self.send_json(HTTPStatus.OK, article)
            return

        comment_slug = self.match_path(path, "/api/v1/articles/", "/comments")
        if comment_slug:
            payload = self.read_json_body()
            if payload is None:
                return
            user = self.require_user_action_auth()
            if user is None:
                return
            body = payload.get("body")
            if not isinstance(body, str) or not body.strip():
                self.send_json(HTTPStatus.BAD_REQUEST, {"message": "Текст комментария обязателен"})
                return
            article = repository.add_comment(
                comment_slug,
                {
                    "authorName": str(user["name"]),
                    "authorRole": "Читатель",
                    "body": body.strip(),
                },
            )
            if article is None:
                self.send_json(HTTPStatus.NOT_FOUND, {"message": "Статья не найдена"})
                return
            self.send_json(HTTPStatus.OK, article)
            return

        self.send_json(HTTPStatus.NOT_FOUND, {"message": "Не найдено"})

    def do_PUT(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        article_slug = self.match_path(path, "/api/v1/articles/")
        if article_slug and "/" not in article_slug:
            if not self.require_admin_auth():
                return
            payload = self.read_json_body()
            if payload is None:
                return
            try:
                article = news_service.update_article_from_admin_payload(article_slug, payload)
            except ValueError:
                self.send_json(HTTPStatus.BAD_REQUEST, {"message": "Некорректная категория"})
                return
            except LookupError:
                self.send_json(HTTPStatus.NOT_FOUND, {"message": "Статья не найдена"})
                return
            except Exception:
                self.send_json(HTTPStatus.BAD_REQUEST, {"message": "Не удалось обновить статью"})
                return
            self.send_json(HTTPStatus.OK, article)
            return

        self.send_json(HTTPStatus.NOT_FOUND, {"message": "Не найдено"})

    def read_json_body(self) -> dict[str, Any] | None:
        try:
            content_length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            content_length = 0

        if content_length <= 0 or content_length > 4 * 1024 * 1024:
            self.send_json(HTTPStatus.BAD_REQUEST, {"message": "Некорректное тело JSON"})
            return None

        try:
            body = self.rfile.read(content_length)
            return json.loads(body.decode("utf-8"))
        except Exception:
            self.send_json(HTTPStatus.BAD_REQUEST, {"message": "Некорректное тело JSON"})
            return None

    def require_admin_auth(self) -> bool:
        authorization = self.headers.get("Authorization", "")
        if not authorization.startswith("Bearer "):
            self.send_json(HTTPStatus.UNAUTHORIZED, {"message": "Не авторизован"})
            return False
        token = authorization[len("Bearer ") :]
        try:
            verify_jwt(token, env.admin_jwt_secret)
        except Exception:
            self.send_json(HTTPStatus.UNAUTHORIZED, {"message": "Не авторизован"})
            return False
        return True

    def require_user_action_auth(self) -> dict[str, Any] | None:
        authorization = self.headers.get("Authorization", "")
        if not authorization.startswith("Bearer "):
            self.send_json(HTTPStatus.UNAUTHORIZED, {"message": "Требуется авторизация"})
            return None
        token = authorization[len("Bearer ") :]
        try:
            payload = verify_jwt(token, env.user_action_jwt_secret)
        except Exception:
            self.send_json(HTTPStatus.UNAUTHORIZED, {"message": "Требуется авторизация"})
            return None
        if not payload.get("uid") or not payload.get("name"):
            self.send_json(HTTPStatus.UNAUTHORIZED, {"message": "Требуется авторизация"})
            return None
        return payload

    def send_json(self, status: HTTPStatus, payload: Any) -> None:
        encoded = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    @staticmethod
    def match_path(path: str, prefix: str, suffix: str = "") -> str | None:
        if not path.startswith(prefix):
            return None
        trimmed = path[len(prefix) :]
        if suffix:
            if not trimmed.endswith(suffix):
                return None
            trimmed = trimmed[: -len(suffix)]
        return urllib.parse.unquote(trimmed) if trimmed else None


def main() -> None:
    server = ThreadingHTTPServer(("0.0.0.0", env.port), ApiHandler)
    print(f"VectorNews API listening on http://localhost:{env.port}")
    server.serve_forever()


if __name__ == "__main__":
    main()
