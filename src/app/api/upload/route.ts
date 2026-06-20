import { ok, fail, requireUser } from "@/lib/api";
import { uploadFile } from "@/lib/storage";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "application/pdf"];

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const form = await req.formData().catch(() => null);
  if (!form) return fail("Invalid upload", 400);

  const file = form.get("file");
  if (!(file instanceof File)) return fail("No file provided", 422);
  if (file.size > MAX_BYTES) return fail("File too large (max 8 MB)", 413);
  if (!ALLOWED.includes(file.type))
    return fail("Only PNG, JPG, WEBP or PDF files are allowed", 415);

  const buffer = Buffer.from(await file.arrayBuffer());
  const stored = await uploadFile("payment-proofs", file.name || "proof", buffer, file.type);

  return ok({ key: stored.key, url: stored.url, name: file.name, size: file.size });
}
