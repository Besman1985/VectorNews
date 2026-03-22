import { notFound } from "next/navigation";
import { getArticlesByAuthor, getAuthors } from "@/lib/content-api";
import { ArticleCard } from "../ui/article-card";

export async function AuthorPage({ slug }: { slug: string }) {
  const authors = await getAuthors();
  const author = authors.find((item) => item.slug === slug);
  if (!author) {
    notFound();
  }

  const articles = await getArticlesByAuthor(author.id);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <section className="rounded-[36px] border border-white/10 bg-white/5 p-8">
        <p className="text-sm uppercase tracking-[0.3em] text-gold">{author.role}</p>
        <h1 className="heading-page mt-4 font-semibold text-white">{author.name}</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">{author.bio}</p>
      </section>
      <section className="mt-8 grid gap-5">
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} compact />
        ))}
      </section>
    </main>
  );
}
