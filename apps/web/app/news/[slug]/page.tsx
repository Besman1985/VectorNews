import { notFound } from "next/navigation";
import { ArticleBody } from "@/components/article/article-body";
import { getArticle } from "@/lib/content-api";

export default async function NewsArticlePage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) {
    notFound();
  }

  return <ArticleBody article={article} />;
}
