import { NextResponse } from "next/server";
import { getAdminToken } from "@/lib/admin-token";
import { proxyToApi } from "@/lib/api-proxy";

export async function GET() {
  const token = await getAdminToken();
  const proxied = await proxyToApi("/api/v1/admin/stats", {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (proxied) {
    return proxied;
  }
  return NextResponse.json({ totalArticles: 0, totalViews: 0, totalComments: 0 });
}
