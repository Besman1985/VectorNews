"use client";

import { FormEvent, useState } from "react";
import type { Category, CreateArticlePayload, DashboardStats, NewsArticle } from "@vectornews/shared";
import { normalizeTags } from "@/lib/tag-utils";

const fieldClassName =
  "w-full rounded-[22px] border border-white/10 bg-[#0c1324] px-4 py-3 text-white outline-none transition focus:border-gold";

type ArticleFormState = {
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string;
  sourceUrl: string;
  category: string;
  content: string;
  tags: string;
};

const emptyFormState: ArticleFormState = {
  title: "",
  slug: "",
  excerpt: "",
  coverImage: "",
  sourceUrl: "",
  category: "",
  content: "",
  tags: ""
};

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
      <p className="text-sm uppercase tracking-[0.25em] text-mist">{label}</p>
      <p className="mt-3 text-4xl font-semibold text-white">{value.toLocaleString("ru-RU")}</p>
    </div>
  );
}

function toFormState(article: NewsArticle): ArticleFormState {
  return {
    title: article.title,
    slug: article.slug,
    excerpt: article.excerpt,
    coverImage: article.coverImage,
    sourceUrl: article.sourceUrl,
    category: article.category,
    content: article.content.join("\n"),
    tags: normalizeTags(article.tags).join(", ")
  };
}

function toPayload(form: ArticleFormState): CreateArticlePayload {
  return {
    title: form.title.trim(),
    slug: form.slug.trim(),
    excerpt: form.excerpt.trim(),
    coverImage: form.coverImage.trim(),
    sourceUrl: form.sourceUrl.trim(),
    category: form.category,
    content: form.content
      .split("\n")
      .map((paragraph) => paragraph.trim())
      .filter(Boolean),
    tags: normalizeTags(
      form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
    )
  };
}

export function AdminDashboard({
  initialStats,
  initialArticles,
  initialCategories
}: {
  initialStats: DashboardStats;
  initialArticles: NewsArticle[];
  initialCategories: Category[];
}) {
  const [stats, setStats] = useState(initialStats);
  const [status, setStatus] = useState("");
  const [lookupSlug, setLookupSlug] = useState("");
  const [isLoadingArticle, setIsLoadingArticle] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [articles, setArticles] = useState(initialArticles.slice(0, 6));
  const [form, setForm] = useState<ArticleFormState>({
    ...emptyFormState,
    category: initialCategories[0]?.slug ?? ""
  });

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  async function refreshStats() {
    const nextStatsResponse = await fetch("/api/admin/stats");
    if (!nextStatsResponse.ok) {
      return;
    }

    const nextStats: DashboardStats = await nextStatsResponse.json();
    setStats(nextStats);
  }

  function resetForm() {
    setForm({
      ...emptyFormState,
      category: initialCategories[0]?.slug ?? ""
    });
    setLookupSlug("");
    setEditingSlug(null);
  }

  async function handleFindArticle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const slug = lookupSlug.trim();

    if (!slug) {
      setStatus("Укажите slug статьи");
      return;
    }

    setIsLoadingArticle(true);
    setStatus("");

    const response = await fetch(`/api/admin/${encodeURIComponent(slug)}`);
    setIsLoadingArticle(false);

    if (response.status === 404) {
      setStatus("Статья с таким slug не найдена");
      return;
    }

    if (!response.ok) {
      setStatus("Не удалось загрузить статью");
      return;
    }

    const article: NewsArticle = await response.json();
    setForm(toFormState(article));
    setLookupSlug(article.slug);
    setEditingSlug(article.slug);
    setStatus(`Загружена статья: ${article.title}`);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = toPayload(form);

    if (!payload.category) {
      setStatus("Выберите категорию");
      return;
    }

    setIsSubmitting(true);
    setStatus("");

    const response = await fetch(editingSlug ? `/api/admin/${encodeURIComponent(editingSlug)}` : "/api/admin", {
      method: editingSlug ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    setIsSubmitting(false);

    if (!response.ok) {
      setStatus(editingSlug ? "Не удалось обновить статью" : "Не удалось сохранить статью");
      return;
    }

    const savedArticle: NewsArticle = await response.json();
    setArticles((current) => {
      const next = [savedArticle, ...current.filter((article) => article.id !== savedArticle.id)];
      return next.slice(0, 6);
    });
    setForm(toFormState(savedArticle));
    setLookupSlug(savedArticle.slug);
    setEditingSlug(savedArticle.slug);
    await refreshStats();
    setStatus(editingSlug ? "Статья обновлена" : "Статья опубликована");
  }

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 lg:px-8">
      <section className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-gold">CMS с авторизацией</p>
          <h1 className="heading-page mt-3 font-semibold text-white">Редакционная панель</h1>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-2xl border border-white/10 px-4 py-3 text-sm text-white transition hover:border-gold hover:text-gold"
        >
          Выйти
        </button>
      </section>

      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-3">
        <StatCard label="Статей" value={stats.totalArticles} />
        <StatCard label="Просмотров" value={stats.totalViews} />
        <StatCard label="Комментариев" value={stats.totalComments} />
      </section>

      <section className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[32px] border border-white/10 bg-white/5 p-6">
          <div className="mb-6 flex flex-col gap-5">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-gold">Публикация</p>
              <h2 className="heading-section mt-3 font-semibold text-white">
                {editingSlug ? "Редактирование статьи" : "Публикация новости"}
              </h2>
            </div>

            <form className="grid gap-3 md:grid-cols-[1fr_auto]" onSubmit={handleFindArticle}>
              <input
                value={lookupSlug}
                onChange={(event) => setLookupSlug(event.target.value)}
                placeholder="Найти статью по slug"
                className={fieldClassName}
              />
              <button
                type="submit"
                disabled={isLoadingArticle}
                className="rounded-2xl border border-gold/40 px-5 py-3 text-sm font-medium text-gold transition hover:border-gold hover:bg-gold hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoadingArticle ? "Поиск..." : "Найти"}
              </button>
            </form>

            {editingSlug ? (
              <button
                type="button"
                onClick={resetForm}
                className="w-fit rounded-2xl border border-white/10 px-4 py-3 text-sm text-white transition hover:border-gold hover:text-gold"
              >
                Создать новую статью
              </button>
            ) : null}
          </div>

          <form className="grid gap-4" onSubmit={handleSubmit}>
            <input
              name="title"
              required
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Заголовок"
              className={fieldClassName}
            />
            <input
              name="slug"
              required
              value={form.slug}
              onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
              placeholder="slug-materiala"
              className={fieldClassName}
            />
            <input
              name="coverImage"
              required
              value={form.coverImage}
              onChange={(event) => setForm((current) => ({ ...current, coverImage: event.target.value }))}
              placeholder="URL изображения"
              className={fieldClassName}
            />
            <input
              name="sourceUrl"
              required
              value={form.sourceUrl}
              onChange={(event) => setForm((current) => ({ ...current, sourceUrl: event.target.value }))}
              placeholder="Ссылка на источник"
              className={fieldClassName}
            />
            <textarea
              name="excerpt"
              required
              rows={3}
              value={form.excerpt}
              onChange={(event) => setForm((current) => ({ ...current, excerpt: event.target.value }))}
              placeholder="Короткий анонс"
              className={fieldClassName}
            />
            <textarea
              name="content"
              required
              rows={6}
              value={form.content}
              onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
              placeholder="Абзацы материала, каждый с новой строки"
              className={fieldClassName}
            />
            <input
              name="tags"
              required
              value={form.tags}
              onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
              placeholder="AI, политика, рынки"
              className={fieldClassName}
            />
            <select
              name="category"
              value={form.category}
              onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
              className={fieldClassName}
            >
              {initialCategories.map((category) => (
                <option key={category.id} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-fit rounded-2xl bg-gold px-5 py-3 font-medium text-ink transition hover:bg-sand disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Сохранение..." : editingSlug ? "Сохранить изменения" : "Опубликовать"}
            </button>
            {status ? <p className="text-sm text-gold">{status}</p> : null}
          </form>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-[#0d1426] p-6">
          <h2 className="heading-section font-semibold text-white">Последние материалы</h2>
          <div className="mt-6 grid gap-4">
            {articles.map((article) => (
              <div key={article.id} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-gold">{article.categoryName}</p>
                <h3 className="heading-card mt-2 font-semibold text-white">{article.title}</h3>
                <p className="mt-2 text-sm text-slate-300">{article.views.toLocaleString("ru-RU")} просмотров</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
