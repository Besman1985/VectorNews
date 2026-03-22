import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";
import { userCookieName } from "@/lib/auth-shared";
import { signUserSessionToken } from "@/lib/user-session";
import { shouldUseSecureCookies } from "@/lib/cookie-options";

export async function POST(request: NextRequest) {
  const { idToken } = (await request.json()) as { idToken?: string };

  if (!idToken) {
    return NextResponse.json({ message: "Отсутствует Firebase ID-токен" }, { status: 400 });
  }

  try {
    const decodedToken = await (await getAdminAuth()).verifyIdToken(idToken);
    const token = await signUserSessionToken({
      uid: decodedToken.uid,
      email: decodedToken.email ?? "",
      name: decodedToken.name ?? decodedToken.email ?? "Пользователь",
      picture: decodedToken.picture,
      provider: decodedToken.firebase.sign_in_provider
    });

    const response = NextResponse.json({ ok: true });
    response.cookies.set(userCookieName, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: shouldUseSecureCookies(request),
      path: "/",
      maxAge: 60 * 60 * 24 * 7
    });
    return response;
  } catch {
    return NextResponse.json({ message: "Недействительная сессия Firebase" }, { status: 401 });
  }
}

export async function DELETE(request: NextRequest) {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(userCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookies(request),
    path: "/",
    maxAge: 0
  });
  return response;
}
