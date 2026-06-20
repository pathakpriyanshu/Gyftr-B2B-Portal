import { db } from "@/lib/db";
import { ok, fail, requireUser, readJson, hasRole } from "@/lib/api";
import { updateUserSchema, firstError } from "@/lib/schemas";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  if (!hasRole(auth.user.role, "admin"))
    return fail("Only administrators can modify users.", 403, "FORBIDDEN");

  const target = await db.getUserById(params.id);
  if (!target || target.clientId !== auth.user.clientId) return fail("User not found", 404);

  const body = await readJson<unknown>(req);
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) return fail(firstError(parsed.error), 422);

  // guard: don't let an admin disable / demote themselves into lockout
  if (target.id === auth.user.id) {
    if (parsed.data.status === "disabled")
      return fail("You cannot disable your own account.", 400, "SELF_DISABLE");
    if (parsed.data.role && parsed.data.role !== "admin")
      return fail("You cannot change your own role.", 400, "SELF_DEMOTE");
  }

  const updated = await db.updateUser(target.id, parsed.data);

  await db.audit({
    clientId: auth.user.clientId,
    userId: auth.user.id,
    action: "user.updated",
    entity: "user",
    entityId: target.id,
    metadata: parsed.data,
  });

  return ok({ user: updated });
}
