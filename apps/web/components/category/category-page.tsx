import { notFound } from "next/navigation";
import { categories } from "@vectornews/shared";
import { getArticlesByCategory } from "@/lib/content-api";
import { ArticleCard } from "../ui/article-card";

export async function CategoryPage({ slug }: { slug: string }) {
  const category = categories.find((item) => item.slug === slug);
  if (!category) {
    notFound();
  }

  const articles = await getArticlesByCategory(slug);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <section className="rounded-[36px] border border-white/10 bg-[linear-gradient(135deg,rgba(216,183,104,0.14),rgba(15,23,42,0.9))] p-8">
        <p className="text-sm uppercase tracking-[0.3em] text-gold">{category.name}</p>
        <h1 className="heading-page mt-4 font-semibold text-white">{category.description}</h1>
      </section>
      <section className="mt-8 grid gap-5">
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} compact />
        ))}
      </section>
    </main>
  );
}
