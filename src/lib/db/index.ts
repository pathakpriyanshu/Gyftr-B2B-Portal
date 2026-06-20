import "server-only";
import { hasSupabaseConfig } from "@/lib/env";
import { memoryBackend } from "./memory";
import { supabaseBackend } from "./supabase";
import type { Backend } from "./types";

/**
 * Selects the data backend.
 *   DB_BACKEND=memory   → in-memory store (default, zero-config, file-persisted)
 *   DB_BACKEND=supabase → Supabase Postgres (requires real credentials)
 * If unset, auto-detects: uses Supabase when credentials are present.
 */
function pickBackend(): Backend {
  const forced = process.env.DB_BACKEND;
  if (forced === "supabase") return supabaseBackend;
  if (forced === "memory") return memoryBackend;
  return hasSupabaseConfig() ? supabaseBackend : memoryBackend;
}

export const db: Backend = pickBackend();

export type { Backend } from "./types";
