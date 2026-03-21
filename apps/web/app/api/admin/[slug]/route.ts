import { NextRequest, NextResponse } from "next/server";
import { getAdminToken } from "@/lib/admin-token";
import { proxyToApi } from "@/lib/api-proxy";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const token = await getAdminToken();
  const proxied = await proxyToApi(`/api/v1/articles/${slug}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (proxied) {
    return proxied;
  }
  return NextResponse.json({ message: "API_URL не настроен" }, { status: 503 });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const payload = await request.json();
  const token = await getAdminToken();
  const proxied = await proxyToApi(`/api/v1/articles/${slug}`, {
    method: "PUT",
    body: JSON.stringify(payload),
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (proxied) {
    return proxied;
  }
  return NextResponse.json({ message: "API_URL не настроен" }, { status: 503 });
}
