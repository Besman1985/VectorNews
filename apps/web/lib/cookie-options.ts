import type { NextRequest } from "next/server";

function parseBoolean(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "true") {
    return true;
  }

  if (normalized === "false") {
    return false;
  }

  return undefined;
}

export function shouldUseSecureCookies(request?: NextRequest) {
  const forced = parseBoolean(process.env.COOKIE_SECURE);
  if (forced !== undefined) {
    return forced;
  }

  const forwardedProto = request?.headers.get("x-forwarded-proto");
  if (forwardedProto) {
    return forwardedProto.split(",")[0]?.trim() === "https";
  }

  if (request) {
    return request.nextUrl.protocol === "https:";
  }

  return process.env.NODE_ENV === "production";
}
