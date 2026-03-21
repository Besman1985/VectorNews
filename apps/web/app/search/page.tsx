import { SearchPage } from "@/components/search/search-page";

export default async function SearchRoute({
  searchParams
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  return <SearchPage query={q} />;
}
