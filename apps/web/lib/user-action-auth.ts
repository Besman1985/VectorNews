import "server-only";
import { signJwt, verifyJwt } from "@vectornews/shared";

const userActionSecret = process.env.USER_ACTION_JWT_SECRET ?? "vectornews-user-action-secret";

export interface UserActionClaims {
  uid: string;
  email: string;
  name: string;
  provider: string;
}

export async function signUserActionToken(claims: UserActionClaims) {
  return signJwt(
    claims as Record<string, unknown> & UserActionClaims,
    userActionSecret,
    60 * 5
  );
}

export async function verifyUserActionToken(token: string) {
  const payload = await verifyJwt(token, userActionSecret);
  return payload as unknown as UserActionClaims & { exp?: number; iat?: number };
}
