import { NextResponse } from "next/server";
import { categories } from "@/lib/store";
import { proxyToApi } from "@/lib/api-proxy";

export async function GET() {
  const proxied = await proxyToApi("/api/v1/categories");
  if (proxied) {
    return proxied;
  }
  return NextResponse.json(categories);
}
