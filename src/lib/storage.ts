import "server-only";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { env, hasSupabaseConfig } from "@/lib/env";

/**
 * File storage abstraction for payment proofs and generated voucher files.
 *   - Supabase configured → Supabase Storage (private buckets, signed URLs).
 *   - Otherwise           → local `.data/uploads`, served via /api/files/[...].
 */

const UPLOAD_DIR = path.join(process.cwd(), ".data", "uploads");

export interface StoredFile {
  /** Key used to retrieve the file later (bucket-relative path or local path). */
  key: string;
  /** A URL the browser can use to view/download the file. */
  url: string;
}

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
}

export async function uploadFile(
  bucket: "payment-proofs" | "voucher-files",
  filename: string,
  data: Buffer | Uint8Array,
  contentType: string
): Promise<StoredFile> {
  const key = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${safeName(filename)}`;

  if (hasSupabaseConfig()) {
    const { supabaseAdmin } = await import("@/lib/supabase/admin");
    const bucketId =
      bucket === "payment-proofs"
        ? env.supabase.paymentProofBucket
        : env.supabase.voucherFileBucket;
    const { error } = await supabaseAdmin()
      .storage.from(bucketId)
      .upload(key, data, { contentType, upsert: false });
    if (error) throw error;
    return { key: `${bucketId}/${key}`, url: await signedUrl(`${bucketId}/${key}`) };
  }

  // local fallback
  const dir = path.join(UPLOAD_DIR, bucket, path.dirname(key));
  fs.mkdirSync(dir, { recursive: true });
  const full = path.join(UPLOAD_DIR, bucket, key);
  fs.writeFileSync(full, data);
  const localKey = `${bucket}/${key}`;
  return { key: localKey, url: `/api/files/${localKey}` };
}

/** Returns a browser-usable URL for a stored key. */
export async function signedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
  if (hasSupabaseConfig() && key.includes("/")) {
    const [bucketId, ...rest] = key.split("/");
    const objectPath = rest.join("/");
    const { supabaseAdmin } = await import("@/lib/supabase/admin");
    const { data, error } = await supabaseAdmin()
      .storage.from(bucketId)
      .createSignedUrl(objectPath, expiresInSeconds);
    if (error || !data) throw error ?? new Error("Could not sign URL");
    return data.signedUrl;
  }
  return `/api/files/${key}`;
}

/** Reads a locally-stored file (used by the /api/files fallback route). */
export function readLocalFile(key: string): { data: Buffer; contentType: string } | null {
  const full = path.join(UPLOAD_DIR, key);
  if (!full.startsWith(UPLOAD_DIR) || !fs.existsSync(full)) return null;
  const ext = path.extname(full).toLowerCase();
  const types: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".pdf": "application/pdf",
    ".webp": "image/webp",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
  return { data: fs.readFileSync(full), contentType: types[ext] ?? "application/octet-stream" };
}
