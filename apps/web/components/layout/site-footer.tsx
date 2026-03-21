import Link from "next/link";
import { categories } from "@vectornews/shared";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#070c18]">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 lg:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
        <div className="space-y-4">
          <p className="text-sm uppercase tracking-[0.3em] text-gold">VectorNews</p>
          <h2 className="max-w-md text-3xl font-semibold text-white">
            Международная редакция с фокусом на скорость, ясность и сильный визуальный контекст.
          </h2>
        </div>
        <div>
          <p className="mb-4 text-sm uppercase tracking-[0.25em] text-mist">Категории</p>
          <div className="grid gap-2">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/category/${category.slug}`}
                className="text-sm text-slate-300 transition hover:text-white"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-4 text-sm uppercase tracking-[0.25em] text-mist">Сервис</p>
          <div className="grid gap-2 text-sm text-slate-300">
            <Link href="/search" className="transition hover:text-white">
              Поиск
            </Link>
            <Link href="/api/rss.xml" className="transition hover:text-white">
              RSS-лента
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
