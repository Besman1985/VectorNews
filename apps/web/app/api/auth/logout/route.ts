import { NextRequest, NextResponse } from "next/server";
import { adminCookieName } from "@/lib/auth-shared";
import { shouldUseSecureCookies } from "@/lib/cookie-options";

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(adminCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookies(request),
    path: "/",
    maxAge: 0
  });
  return response;
}
