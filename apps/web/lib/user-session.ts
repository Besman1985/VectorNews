import "server-only";
import { signJwt, verifyJwt } from "@vectornews/shared";

const userSessionSecret = process.env.USER_JWT_SECRET ?? "vectornews-user-secret";

export interface UserSessionClaims {
  uid: string;
  email: string;
  name: string;
  picture?: string;
  provider?: string;
}

export async function signUserSessionToken(claims: UserSessionClaims) {
  return signJwt({ ...claims }, userSessionSecret, 60 * 60 * 24 * 7);
}

export async function verifyUserSessionToken(token: string) {
  const payload = await verifyJwt(token, userSessionSecret);
  return payload as unknown as UserSessionClaims & { exp?: number; iat?: number };
}
