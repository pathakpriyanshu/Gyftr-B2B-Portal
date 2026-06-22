import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/env";
import type { SessionUser } from "@/types";

const alg = "HS256";

function secretKey() {
  return new TextEncoder().encode(env.auth.jwtSecret);
}

export async function signSession(user: SessionUser): Promise<string> {
  return new SignJWT({
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    clientId: user.clientId,
    clientName: user.clientName,
  })
    .setProtectedHeader({ alg })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${env.auth.sessionTtlHours}h`)
    .sign(secretKey());
}

export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: [alg] });
    if (!payload.sub) return null;
    return {
      id: payload.sub,
      email: String(payload.email),
      fullName: String(payload.fullName),
      role: payload.role as SessionUser["role"],
      clientId: String(payload.clientId),
      clientName: String(payload.clientName),
    };
  } catch {
    return null;
  }
}

/** Short-lived signed token for the voucher-download flow (carries order id). */
export async function signDownloadGrant(orderId: string, tokenId: string): Promise<string> {
  return new SignJWT({ orderId, kind: "voucher-download" })
    .setProtectedHeader({ alg })
    .setSubject(tokenId)
    .setIssuedAt()
    .setExpirationTime("30m")
    .sign(secretKey());
}

export async function verifyDownloadGrant(
  token: string
): Promise<{ orderId: string; tokenId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: [alg] });
    if (payload.kind !== "voucher-download" || !payload.sub) return null;
    return { orderId: String(payload.orderId), tokenId: payload.sub };
  } catch {
    return null;
  }
}
