import { getSearchResults } from "@/lib/content-api";
import { ArticleCard } from "../ui/article-card";

export async function SearchPage({ query }: { query?: string }) {
  const normalizedQuery = query?.toLowerCase().trim() ?? "";
  const results = normalizedQuery ? await getSearchResults(normalizedQuery) : [];

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <section className="rounded-[36px] border border-white/10 bg-white/5 p-8">
        <p className="text-sm uppercase tracking-[0.3em] text-gold">Поиск</p>
        <h1 className="mt-4 text-5xl font-semibold text-white">Быстрый поиск по новостям</h1>
        <form className="mt-6">
          <input
            name="q"
            defaultValue={query}
            placeholder="AI, рынки, политика..."
            className="w-full rounded-[24px] border border-white/10 bg-[#0c1324] px-5 py-4 text-white outline-none transition focus:border-gold"
          />
        </form>
      </section>

      <section className="mt-8">
        {normalizedQuery ? (
          <div className="grid gap-5">
            {results.length > 0 ? (
              results.map((article) => <ArticleCard key={article.id} article={article} compact />)
            ) : (
              <div className="rounded-[28px] border border-white/10 bg-[#0d1426] p-8 text-slate-300">
                По запросу ничего не найдено.
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-[28px] border border-white/10 bg-[#0d1426] p-8 text-slate-300">
            Введите запрос, чтобы получить статьи, теги и редакционные материалы.
          </div>
        )}
      </section>
    </main>
  );
}
