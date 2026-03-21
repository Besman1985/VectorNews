import { NextRequest, NextResponse } from "next/server";
import { proxyToApi } from "@/lib/api-proxy";

export async function POST(request: NextRequest) {
  const { slug, authorName, body } = await request.json();
  const proxied = await proxyToApi(`/api/v1/articles/${slug}/comments`, {
    method: "POST",
    body: JSON.stringify({
      authorName,
      authorRole: "Читатель",
      body
    })
  });
  if (proxied) {
    return proxied;
  }
  return NextResponse.json({ message: "API_URL не настроен" }, { status: 503 });
}
