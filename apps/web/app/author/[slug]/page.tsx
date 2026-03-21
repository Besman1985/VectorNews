import { AuthorPage } from "@/components/author/author-page";

export default async function AuthorRoute({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <AuthorPage slug={slug} />;
}
