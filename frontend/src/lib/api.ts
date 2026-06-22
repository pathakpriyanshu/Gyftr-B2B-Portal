import "server-only";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import type { SessionUser, UserRole } from "@/types";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(error: string, status = 400, code?: string) {
  return NextResponse.json({ ok: false, error, code }, { status });
}

const ROLE_RANK: Record<UserRole, number> = {
  viewer: 0,
  procurement: 1,
  finance: 2,
  admin: 3,
};

/** Returns the session user or a 401 response. */
export async function requireUser(): Promise<
  { user: SessionUser } | { response: NextResponse }
> {
  const user = await getSession();
  if (!user) return { response: fail("Not authenticated", 401, "UNAUTHENTICATED") };
  return { user };
}

/** Whether a role meets a minimum rank. */
export function hasRole(role: UserRole, min: UserRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min];
}

/** Roles allowed to place/modify orders (everyone except viewer). */
export function canTransact(role: UserRole): boolean {
  return role !== "viewer";
}

export async function readJson<T>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}
