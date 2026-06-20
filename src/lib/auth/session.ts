import "server-only";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { signSession, verifySession } from "./jwt";
import type { SessionUser } from "@/types";

export async function setSessionCookie(user: SessionUser) {
  const token = await signSession(user);
  cookies().set(env.auth.cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: env.auth.sessionTtlHours * 3600,
  });
}

export function clearSessionCookie() {
  cookies().set(env.auth.cookieName, "", { path: "/", maxAge: 0 });
}

/** Reads + verifies the current session from cookies. Returns null if absent/invalid. */
export async function getSession(): Promise<SessionUser | null> {
  const token = cookies().get(env.auth.cookieName)?.value;
  if (!token) return null;
  return verifySession(token);
}
