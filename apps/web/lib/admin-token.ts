import { cookies } from "next/headers";
import { adminCookieName } from "./auth-shared";

export async function getAdminToken() {
  const cookieStore = await cookies();
  return cookieStore.get(adminCookieName)?.value ?? null;
}
