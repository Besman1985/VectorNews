import { adminCookieName } from "./auth-shared";
import { signJwt, verifyJwt } from "@vectornews/shared";

export async function signAdminToken(email: string) {
  return signJwt(
    { email, role: "admin" },
    process.env.ADMIN_JWT_SECRET ?? "vectornews-admin-secret",
    60 * 60 * 12
  );
}

export async function verifyAdminToken(token: string) {
  return verifyJwt(token, process.env.ADMIN_JWT_SECRET ?? "vectornews-admin-secret");
}

export { adminCookieName };
