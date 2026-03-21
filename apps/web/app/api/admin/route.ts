import { NextRequest, NextResponse } from "next/server";
import { getAdminToken } from "@/lib/admin-token";
import { proxyToApi } from "@/lib/api-proxy";

export async function POST(request: NextRequest) {
  const payload = await request.json();
  const token = await getAdminToken();
  const proxied = await proxyToApi("/api/v1/articles", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (proxied) {
    return proxied;
  }
  return NextResponse.json({ message: "API_URL не настроен" }, { status: 503 });
}
