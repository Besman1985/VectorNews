import { NextRequest, NextResponse } from "next/server";
import { signAdminToken } from "@/lib/auth";
import { validateAdminCredentials } from "@/lib/admin-users";
import { adminCookieName } from "@/lib/auth-shared";

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  const adminUser = await validateAdminCredentials(String(email), String(password));
  if (!adminUser) {
    return NextResponse.json({ message: "Неверные учетные данные" }, { status: 401 });
  }

  const token = await signAdminToken(adminUser.email);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(adminCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12
  });
  return response;
}
