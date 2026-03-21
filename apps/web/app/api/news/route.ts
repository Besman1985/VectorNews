import { NextResponse } from "next/server";
import { proxyToApi } from "@/lib/api-proxy";

export async function GET() {
  const proxied = await proxyToApi("/api/v1/articles");
  if (proxied) {
    return proxied;
  }
  return NextResponse.json([]);
}
