"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Comment, NewsArticle } from "@vectornews/shared";
import { articles } from "@vectornews/shared";
import { useAuth } from "@/contexts/auth-context";
import { formatTagLabel, normalizeTags } from "@/lib/tag-utils";
import { formatDate, minutesToReadLabel } from "@/lib/utils";
import articleFallbackImage from "@/logo/img.jpg";

export function ArticleBody({ article }: { article: NewsArticle }) {
  const { configured, loading, user } = useAuth();
  const [likes, setLikes] = useState(article.likes);
  const [comments, setComments] = useState<Comment[]>(article.comments);
  const [commentStatus, setCommentStatus] = useState("");
  const [actionError, setActionError] = useState("");
  const [likePending, setLikePending] = useState(false);
  const [commentPending, setCommentPending] = useState(false);
  const isAuthorized = Boolean(user);
  const normalizedArticleTags = normalizeTags(article.tags);
  const related = articles
    .filter(
      (candidate) =>
        candidate.slug !== article.slug &&
        (candidate.category === article.category ||
          normalizeTags(candidate.tags).some((tag) => normalizedArticleTags.includes(tag)))
    )
    .slice(0, 3);
  const coverImage = article.coverImage?.trim();
  const articleImage =
    coverImage && coverImage.toLowerCase() !== "null" ? coverImage : articleFallbackImage;

  useEffect(() => {
    void fetch(`/api/news/${article.slug}`);
  }, [article.slug]);

  async function handleLike() {
    if (!isAuthorized) {
      setActionError("Войдите в аккаунт, чтобы ставить лайки.");
      return;
    }

    setLikePending(true);
    setActionError("");
    setCommentStatus("");

    try {
      const response = await fetch(`/api/news/${article.slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "like" })
      });

      if (!response.ok) {
        setActionError(
          response.status === 401
            ? "Войдите в аккаунт, чтобы ставить лайки."
            : response.status === 409
              ? "Вы уже поставили лайк этой статье."
              : "Не удалось поставить лайк."
        );
        return;
      }

      const payload: NewsArticle = await response.json();
      setLikes(payload.likes);
    } finally {
      setLikePending(false);
    }
  }

  async function handleCommentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isAuthorized) {
      setCommentStatus("Войдите в аккаунт, чтобы оставлять комментарии.");
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const body = String(formData.get("body") ?? "").trim();

    if (!body) {
      setCommentStatus("Введите текст комментария.");
      return;
    }

    setCommentPending(true);
    setActionError("");
    setCommentStatus("");

    try {
      const response = await fetch(`/api/news/${article.slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "comment",
          body
        })
      });

      if (!response.ok) {
        setCommentStatus(
          response.status === 401
            ? "Войдите в аккаунт, чтобы оставлять комментарии."
            : "Не удалось отправить комментарий."
        );
        return;
      }

      const payload: NewsArticle = await response.json();
      setComments(payload.comments);
      setCommentStatus("Комментарий добавлен.");
      form.reset();
    } finally {
      setCommentPending(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
      <article className="rounded-[36px] border border-white/10 bg-white/5">
        <div className="grid gap-8 p-6 lg:p-10">
          <div className="space-y-5">
            <div className="flex flex-wrap gap-3 text-xs uppercase tracking-[0.3em] text-gold">
              <span>{article.categoryName}</span>
              <span className="text-mist">{formatDate(article.publishedAt)}</span>
            </div>
            <h1 className="max-w-4xl text-5xl font-semibold leading-tight text-white">
              {article.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-mist">
              <span>{minutesToReadLabel(article.readingTime)}</span>
              <span>{article.views.toLocaleString("ru-RU")} просмотров</span>
            </div>
          </div>

          <div className="relative h-[420px] overflow-hidden rounded-[30px]">
            <Image src={articleImage} alt={article.title} fill unoptimized className="object-cover" />
          </div>

          <div className="space-y-6">
            {article.content.map((paragraph) =>
              paragraph.length > 70 ? (
                <p key={paragraph} className="text-lg leading-9 text-slate-200">
                  {paragraph}
                </p>
              ) : (
                <h2 key={paragraph} className="text-2xl font-semibold leading-tight tracking-wide text-white">
                  {paragraph}
                </h2>
              )
            )}

            <div className="flex flex-wrap gap-2">
              {normalizedArticleTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/10 px-3 py-1 text-sm text-mist"
                >
                  {formatTagLabel(tag)}
                </span>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="space-y-4">
                {article.sourceUrl ? (
                  <div className="rounded-[24px] border border-white/10 bg-[#0d1426] p-5">
                    <p className="text-xs uppercase tracking-[0.25em] text-gold">Источник</p>
                    <a
                      href={article.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex break-all text-sm text-slate-300 transition hover:text-gold"
                    >
                      {article.sourceUrl}
                    </a>
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={handleLike}
                  disabled={likePending || loading || !isAuthorized}
                  className="w-full rounded-2xl bg-gold px-4 py-3 font-medium text-ink transition hover:bg-sand disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {likePending ? "Сохранение..." : `Поставить лайк · ${likes}`}
                </button>
                {actionError ? <p className="text-sm text-gold">{actionError}</p> : null}
              </div>

              <div className="rounded-[24px] border border-white/10 bg-[#0d1426] p-5">
                <p className="text-sm uppercase tracking-[0.25em] text-gold">Поделиться</p>
                <div className="mt-4 grid gap-2 text-sm text-slate-300">
                  <button className="rounded-2xl border border-white/10 px-4 py-3 text-left">
                    X / Twitter
                  </button>
                  <button className="rounded-2xl border border-white/10 px-4 py-3 text-left">
                    LinkedIn
                  </button>
                  <button className="rounded-2xl border border-white/10 px-4 py-3 text-left">
                    Telegram
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </article>

      <section className="mt-8 grid gap-8 lg:grid-cols-[1fr_0.9fr]">
        <div className="rounded-[30px] border border-white/10 bg-white/5 p-6">
          <h2 className="text-2xl font-semibold text-white">Комментарии</h2>
          <div className="mt-6 space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="rounded-3xl border border-white/10 bg-[#0d1426] p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-white">{comment.authorName}</p>
                    <p className="text-sm text-mist">{comment.authorRole}</p>
                  </div>
                  <span className="text-xs uppercase tracking-[0.2em] text-mist">
                    {formatDate(comment.createdAt)}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-300">{comment.body}</p>
              </div>
            ))}
          </div>
          <form className="mt-6 grid gap-3" onSubmit={handleCommentSubmit}>
            {!configured ? (
              <p className="text-sm text-mist">
                Комментарии и лайки доступны только после настройки аутентификации Firebase.
              </p>
            ) : null}
            {configured && !user ? (
              <p className="text-sm text-mist">
                Чтобы оставить комментарий или поставить лайк,{" "}
                <Link href="/login" className="text-gold transition hover:text-sand">
                  войдите
                </Link>{" "}
                или{" "}
                <Link href="/register" className="text-gold transition hover:text-sand">
                  зарегистрируйтесь
                </Link>
                .
              </p>
            ) : null}
            {user ? (
              <p className="text-sm text-mist">
                Комментарий будет опубликован от имени{" "}
                <span className="text-white">{user.displayName || user.email || "Пользователь"}</span>.
              </p>
            ) : null}
            <textarea
              name="body"
              placeholder="Добавить комментарий"
              rows={4}
              disabled={commentPending || loading || !isAuthorized}
              className="rounded-2xl border border-white/10 bg-[#0c1324] px-4 py-3 text-white outline-none focus:border-gold disabled:cursor-not-allowed disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={commentPending || loading || !isAuthorized}
              className="w-fit rounded-2xl bg-gold px-5 py-3 font-medium text-ink disabled:cursor-not-allowed disabled:opacity-60"
            >
              {commentPending ? "Отправка..." : "Отправить"}
            </button>
            {commentStatus ? <p className="text-sm text-gold">{commentStatus}</p> : null}
          </form>
        </div>

        <div className="rounded-[30px] border border-white/10 bg-[#0d1426] p-6">
          <h2 className="text-2xl font-semibold text-white">Похожие новости</h2>
          <div className="mt-6 grid gap-4">
            {related.map((item) => (
              <Link
                key={item.id}
                href={`/news/${item.slug}`}
                className="rounded-[24px] border border-white/10 bg-white/5 p-4 transition hover:border-gold/50"
              >
                <p className="text-xs uppercase tracking-[0.25em] text-gold">{item.categoryName}</p>
                <h3 className="mt-2 text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-300">{item.excerpt}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
