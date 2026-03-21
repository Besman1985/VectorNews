import { NextResponse } from "next/server";
import { authors } from "@/lib/store";
import { proxyToApi } from "@/lib/api-proxy";

export async function GET() {
  const proxied = await proxyToApi("/api/v1/authors");
  if (proxied) {
    return proxied;
  }
  return NextResponse.json(authors);
}
