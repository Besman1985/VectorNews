import { NextResponse } from "next/server";
import { apiBaseUrl } from "./content-api";

export async function proxyToApi(path: string, init?: RequestInit) {
  if (!apiBaseUrl) {
    return null;
  }

  const headers = new Headers(init?.headers ?? {});
  const isMultipart = typeof FormData !== "undefined" && init?.body instanceof FormData;
  if (!isMultipart && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers,
    cache: "no-store"
  });

  const text = await response.text();

  return new NextResponse(text, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") ?? "application/json"
    }
  });
}
