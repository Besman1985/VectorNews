import { CategoryPage } from "@/components/category/category-page";

export default async function CategoryRoute({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <CategoryPage slug={slug} />;
}
