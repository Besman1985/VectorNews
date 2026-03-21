type JwtPayload = Record<string, unknown> & {
  exp?: number;
  iat?: number;
};

function encodeBase64Url(value: Uint8Array) {
  const base64 =
    typeof Buffer !== "undefined"
      ? Buffer.from(value).toString("base64")
      : btoa(String.fromCharCode(...value));

  return base64
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  if (typeof Buffer !== "undefined") {
    return Uint8Array.from(Buffer.from(padded, "base64"));
  }

  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function importKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signJwt(payload: JwtPayload, secret: string, expiresInSeconds: number) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const body = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds
  };

  const encodedHeader = encodeBase64Url(new TextEncoder().encode(JSON.stringify(header)));
  const encodedPayload = encodeBase64Url(new TextEncoder().encode(JSON.stringify(body)));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const signature = await crypto.subtle.sign(
    "HMAC",
    await importKey(secret),
    new TextEncoder().encode(unsignedToken)
  );

  return `${unsignedToken}.${encodeBase64Url(new Uint8Array(signature))}`;
}

export async function verifyJwt(token: string, secret: string) {
  const [header, payload, signature] = token.split(".");
  if (!header || !payload || !signature) {
    throw new Error("Invalid token");
  }

  const unsignedToken = `${header}.${payload}`;
  const isValid = await crypto.subtle.verify(
    "HMAC",
    await importKey(secret),
    decodeBase64Url(signature),
    new TextEncoder().encode(unsignedToken)
  );

  if (!isValid) {
    throw new Error("Invalid signature");
  }

  const parsedPayload = JSON.parse(
    new TextDecoder().decode(decodeBase64Url(payload))
  ) as JwtPayload;

  if (parsedPayload.exp && parsedPayload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Token expired");
  }

  return parsedPayload;
}
