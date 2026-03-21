import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyJwt } from "@vectornews/shared";
import { adminCookieName, userCookieName } from "./lib/auth-shared";

async function isAdminAuthorized(request: NextRequest) {
  const token = request.cookies.get(adminCookieName)?.value;
  if (!token) {
    return false;
  }

  try {
    await verifyJwt(token, process.env.ADMIN_JWT_SECRET ?? "vectornews-admin-secret");
    return true;
  } catch {
    return false;
  }
}

async function isUserAuthorized(request: NextRequest) {
  const token = request.cookies.get(userCookieName)?.value;
  if (!token) {
    return false;
  }

  try {
    await verifyJwt(token, process.env.USER_JWT_SECRET ?? "vectornews-user-secret");
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdminLogin = pathname === "/admin/login";
  const isProtectedAdminPage = pathname.startsWith("/admin");
  const isProtectedApi = pathname.startsWith("/api/admin");
  const isLoginPage = pathname === "/login";
  const isRegisterPage = pathname === "/register";
  const isAccountPage = pathname.startsWith("/account");

  if (
    !isProtectedAdminPage &&
    !isProtectedApi &&
    !isLoginPage &&
    !isRegisterPage &&
    !isAccountPage
  ) {
    return NextResponse.next();
  }

  const adminAuthorized = await isAdminAuthorized(request);
  const userAuthorized =
    isLoginPage || isRegisterPage || isAccountPage ? await isUserAuthorized(request) : false;

  if (isAdminLogin && adminAuthorized) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  if ((isProtectedAdminPage || isProtectedApi) && !isAdminLogin && !adminAuthorized) {
    if (isProtectedApi) {
      return NextResponse.json({ message: "Не авторизован" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  if ((isLoginPage || isRegisterPage) && userAuthorized) {
    return NextResponse.redirect(new URL("/account", request.url));
  }

  if (isAccountPage && !userAuthorized) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/login", "/register", "/account/:path*"]
};
