import { readLocalFile } from "@/lib/storage";
import { requireUser } from "@/lib/api";

/** Serves locally-stored files (dev/no-Supabase fallback). Auth required. */
export async function GET(_req: Request, { params }: { params: { path: string[] } }) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const key = params.path.join("/");
  const file = readLocalFile(key);
  if (!file) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
