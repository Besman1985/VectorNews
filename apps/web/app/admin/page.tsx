import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { getAdminStats, getArticles, getCategories } from "@/lib/content-api";
import { getAdminToken } from "@/lib/admin-token";

export default async function AdminRoute() {
  const adminToken = await getAdminToken();
  const [initialStats, initialArticles, initialCategories] = await Promise.all([
    getAdminStats(adminToken ?? undefined),
    getArticles(),
    getCategories()
  ]);

  return (
    <AdminDashboard
      initialStats={initialStats}
      initialArticles={initialArticles}
      initialCategories={initialCategories}
    />
  );
}
