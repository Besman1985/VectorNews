import Image from "next/image";
import Link from "next/link";
import type { NewsArticle } from "@vectornews/shared";
import { formatDate, minutesToReadLabel } from "@/lib/utils";
import articleFallbackImage from "@/logo/img.jpg";

export function ArticleCard({
  article,
  compact = false
}: {
  article: NewsArticle;
  compact?: boolean;
}) {
  const coverImage = article.coverImage?.trim();
  const articleImage =
    coverImage && coverImage.toLowerCase() !== "null" ? coverImage : articleFallbackImage;

  return (
    <Link
      href={`/news/${article.slug}`}
      className="group overflow-hidden rounded-[28px] border border-white/10 bg-white/5 transition hover:-translate-y-1 hover:border-gold/60 hover:bg-white/10"
    >
      <div className={compact ? "grid gap-4 p-4 md:grid-cols-[180px_1fr]" : "grid gap-5"}>
        <div className={compact ? "relative h-40 overflow-hidden rounded-2xl" : "relative h-64"}>
          <Image
            src={articleImage}
            alt={article.title}
            fill
            unoptimized
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        </div>
        <div className={compact ? "py-1" : "space-y-4 p-6"}>
          <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.25em] text-gold">
            <span>{article.categoryName}</span>
            <span className="text-mist">{formatDate(article.publishedAt)}</span>
          </div>
          <h3 className="heading-card font-semibold text-white">{article.title}</h3>
          <p className="text-sm leading-7 text-slate-300">{article.excerpt}</p>
          <div className="flex flex-wrap gap-4 text-sm text-mist">
            <span>{minutesToReadLabel(article.readingTime)}</span>
            <span>{article.views.toLocaleString("ru-RU")} просмотров</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
