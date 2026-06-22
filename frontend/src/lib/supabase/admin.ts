import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

let cached: SupabaseClient | null = null;

/**
 * Service-role Supabase client for server-side use only.
 * Bypasses RLS — never import this into client components.
 */
export function supabaseAdmin(): SupabaseClient {
  if (cached) return cached;
  const url = env.supabase.url;
  const key = env.supabase.serviceRoleKey;
  if (!url || !key) {
    throw new Error(
      "Supabase admin client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    );
  }
  cached = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cached;
}
