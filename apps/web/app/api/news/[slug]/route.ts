import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { proxyToApi } from "@/lib/api-proxy";
import { userCookieName } from "@/lib/auth-shared";
import { signUserActionToken } from "@/lib/user-action-auth";
import { verifyUserSessionToken } from "@/lib/user-session";

async function requireUserActionHeaders() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(userCookieName)?.value;

  if (!sessionToken) {
    return null;
  }

  try {
    const session = await verifyUserSessionToken(sessionToken);
    const actionToken = await signUserActionToken({
      uid: session.uid,
      email: session.email,
      name: session.name,
      provider: session.provider ?? "session"
    });

    return {
      Authorization: `Bearer ${actionToken}`
    };
  } catch {
    return null;
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const proxied = await proxyToApi(`/api/v1/articles/${slug}`);
  if (proxied) {
    return proxied;
  }
  return NextResponse.json({ message: "API_URL не настроен" }, { status: 503 });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { action, body } = await request.json();
  const { slug } = await params;
  const userHeaders = await requireUserActionHeaders();

  if (!userHeaders) {
    return NextResponse.json({ message: "Требуется авторизация" }, { status: 401 });
  }

  if (action === "like") {
    const proxied = await proxyToApi(`/api/v1/articles/${slug}/like`, {
      method: "POST",
      headers: userHeaders
    });
    if (proxied) {
      return proxied;
    }
    return NextResponse.json({ message: "API_URL не настроен" }, { status: 503 });
  }

  if (action === "comment") {
    if (!body || typeof body !== "string" || !body.trim()) {
      return NextResponse.json({ message: "Текст комментария обязателен" }, { status: 400 });
    }

    const proxied = await proxyToApi(`/api/v1/articles/${slug}/comments`, {
      method: "POST",
      headers: userHeaders,
      body: JSON.stringify({
        body: body.trim()
      })
    });
    if (proxied) {
      return proxied;
    }
    return NextResponse.json({ message: "API_URL не настроен" }, { status: 503 });
  }

  return NextResponse.json({ message: "Неподдерживаемое действие" }, { status: 400 });
}
