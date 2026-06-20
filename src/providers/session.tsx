"use client";

import * as React from "react";
import type { SessionUser } from "@/types";

const SessionContext = React.createContext<SessionUser | null>(null);

export function SessionProvider({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  return <SessionContext.Provider value={user}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionUser {
  const ctx = React.useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}

/** Role helpers for conditionally rendering UI. */
const RANK: Record<SessionUser["role"], number> = {
  viewer: 0,
  procurement: 1,
  finance: 2,
  admin: 3,
};
export function useHasRole(min: SessionUser["role"]) {
  const user = useSession();
  return RANK[user.role] >= RANK[min];
}
export function useCanTransact() {
  const user = useSession();
  return user.role !== "viewer";
}
