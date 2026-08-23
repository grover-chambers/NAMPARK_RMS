import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * Minimal HS256 JWT sign/verify for the Flutter field app (mobile rep auth).
 * Uses node:crypto only — no external JWT dependency. Tokens are short-lived
 * access tokens; verification is constant-time via sha256 digest comparison
 * and enforces expiry.
 */

const TOKEN_TTL_SECONDS = 12 * 60 * 60; // 12h

export interface MobileJwtClaims {
  sub: string;
  role: string;
  salesRepId: string | null;
  tenantId: string | null;
}

export interface MobileJwtPayload extends MobileJwtClaims {
  iat: number;
  exp: number;
}

function getSecret(): string {
  const secret = process.env.MOBILE_JWT_SECRET;
  if (!secret) {
    throw new Error("MOBILE_JWT_SECRET env var not configured");
  }
  return secret;
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function sign(input: string): Buffer {
  return createHmac("sha256", getSecret()).update(input).digest();
}

export function signMobileJwt(claims: MobileJwtClaims): string {
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload: MobileJwtPayload = {
    ...claims,
    iat: issuedAt,
    exp: issuedAt + TOKEN_TTL_SECONDS,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${header}.${encodedPayload}`;
  return `${signingInput}.${sign(signingInput).toString("base64url")}`;
}

/** Returns the verified payload, or null when invalid/expired/malformed. */
export function verifyMobileJwt(token: string): MobileJwtPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [header, payload, signature] = parts;
  if (!header || !payload || !signature) return null;

  const expected = sign(`${header}.${payload}`);
  // Compare fixed-length sha256 digests so timingSafeEqual never throws on
  // attacker-controlled signature lengths.
  const providedDigest = createHash("sha256")
    .update(Buffer.from(signature, "base64url"))
    .digest();
  const expectedDigest = createHash("sha256").update(expected).digest();

  if (!timingSafeEqual(providedDigest, expectedDigest)) return null;

  let decoded: unknown;
  try {
    decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (
    typeof decoded !== "object" ||
    decoded === null ||
    typeof (decoded as MobileJwtPayload).exp !== "number" ||
    typeof (decoded as MobileJwtPayload).sub !== "string"
  ) {
    return null;
  }

  const claims = decoded as MobileJwtPayload;
  if (claims.exp <= Math.floor(Date.now() / 1000)) return null;

  return claims;
}
