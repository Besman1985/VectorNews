import Link from "next/link";
import { ArticleCard } from "../ui/article-card";
import { formatDate } from "@/lib/utils";
import { getHomepageFeed } from "@/lib/content-api";
import { getMarketOverview } from "@/lib/market-data";
import { formatTagLabel, normalizeTags } from "@/lib/tag-utils";
import { MarketOverviewTabs } from "./market-overview-tabs";

export async function HomePage() {
  const [{ hero, latest, popular, editorPicks, categories }, marketOverview] = await Promise.all([
    getHomepageFeed(),
    getMarketOverview()
  ]);
  const categoryArticles = [...latest, ...popular, ...editorPicks, ...(hero ? [hero] : [])];

  if (!hero) {
    return (
      <main className="mx-auto max-w-7xl space-y-10 px-4 py-8 lg:px-8 lg:py-10">
        <section className="rounded-[36px] border border-white/10 bg-[linear-gradient(135deg,rgba(216,183,104,0.12),rgba(10,16,32,0.92))] p-8 shadow-glow">
          <div className="max-w-2xl space-y-4">
            <p className="text-xs uppercase tracking-[0.28em] text-gold">Главная новость</p>
            <h1 className="text-4xl font-semibold leading-tight text-white">
              Новостей пока нет
            </h1>
            <p className="text-lg leading-8 text-slate-300">
              Главная лента пуста. Добавьте первую статью через админку или проверьте источник данных API.
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl space-y-10 px-4 py-8 lg:px-8 lg:py-10">
      <section className="grid gap-6 lg:grid-cols-[1.45fr_0.9fr]">
        <Link
          href={`/news/${hero.slug}`}
          className="relative overflow-hidden rounded-[36px] border border-white/10 bg-[linear-gradient(135deg,rgba(216,183,104,0.18),rgba(10,16,32,0.9))] p-8 shadow-glow"
        >
          <div className="absolute inset-0 bg-grid-fade bg-[size:38px_38px] opacity-20" />
          <div className="relative max-w-3xl space-y-6 animate-reveal">
            <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.28em] text-gold">
              <span>Главная новость</span>
              <span className="text-mist">{formatDate(hero.publishedAt)}</span>
            </div>
            <h1 className="max-w-3xl text-5xl font-semibold leading-tight text-white">
              {hero.title}
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-300">{hero.excerpt}</p>
            <div className="flex flex-wrap gap-3 text-sm text-mist">
              {normalizeTags(hero.tags).map((tag) => (
                <span key={tag} className="rounded-full border border-white/10 px-3 py-1">
                  {formatTagLabel(tag)}
                </span>
              ))}
            </div>
          </div>
        </Link>
        <div className="grid gap-4">
          <MarketOverviewTabs overview={marketOverview} />
          {popular.map((article) => (
            <ArticleCard key={article.id} article={article} compact />
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-[30px] border border-white/10 bg-white/5 p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-white">Последние новости</h2>
            <Link href="/search" className="text-sm text-gold">
              Быстрый поиск
            </Link>
          </div>
          <div className="grid gap-5">
            {latest.map((article) => (
              <ArticleCard key={article.id} article={article} compact />
            ))}
          </div>
        </div>

        <div className="rounded-[30px] border border-white/10 bg-[#0d1426] p-6">
          <div className="mb-6">
            <h2 className="text-sm uppercase tracking-[0.3em] text-gold">Выбор редакции</h2>
          </div>
          <div className="grid gap-5">
            {editorPicks.map((article) => (
              <ArticleCard key={article.id} article={article} compact />
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[30px] border border-white/10 bg-white/5 p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-white">Новости по категориям</h2>
            <span className="text-sm text-mist">7 редакционных направлений</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {categories.map((category) => {
              const categoryArticle = categoryArticles.find(
                (article) => article.category === category.slug
              );
              if (!categoryArticle) {
                return null;
              }

              return (
                <Link
                  key={category.id}
                  href={`/category/${category.slug}`}
                  className="rounded-[24px] border border-white/10 bg-[#0f172a] p-5 transition hover:border-gold/60 hover:bg-white/10"
                >
                  <div
                    className="mb-4 h-1.5 w-24 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <p className="text-sm uppercase tracking-[0.25em] text-mist">{category.name}</p>
                  <h3 className="mt-3 text-xl font-semibold text-white">
                    {categoryArticle.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-300">
                    {category.description}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="rounded-[30px] border border-gold/30 bg-[linear-gradient(180deg,rgba(216,183,104,0.12),rgba(255,255,255,0.03))] p-6">
          <p className="text-sm uppercase tracking-[0.35em] text-gold">Рассылка</p>
          <h2 className="mt-4 text-3xl font-semibold text-white">
            Подписка на ключевую мировую повестку без шумового контента.
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            Ежедневная подборка редакции, аналитика по рынкам и самые сильные лонгриды.
          </p>
          <form className="mt-8 space-y-3">
            <input
              type="email"
              placeholder="Адрес эл. почты"
              className="w-full rounded-2xl border border-white/10 bg-[#0c1324] px-4 py-3 text-white outline-none transition focus:border-gold"
            />
            <button
              type="submit"
              className="w-full rounded-2xl bg-gold px-4 py-3 font-medium text-ink transition hover:bg-sand"
            >
              Подписаться
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
