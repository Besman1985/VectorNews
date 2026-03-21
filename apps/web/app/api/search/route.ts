import { NextRequest, NextResponse } from "next/server";
import { proxyToApi } from "@/lib/api-proxy";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? "";
  const proxied = await proxyToApi(`/api/v1/search?q=${encodeURIComponent(query)}`);
  if (proxied) {
    return proxied;
  }
  return NextResponse.json([]);
}
