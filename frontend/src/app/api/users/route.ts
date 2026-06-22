import { db } from "@/lib/db";
import { ok, fail, requireUser, readJson, hasRole } from "@/lib/api";
import { createUserSchema, firstError } from "@/lib/schemas";

export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const users = await db.listUsersByClient(auth.user.clientId);
  return ok({ users });
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  if (!hasRole(auth.user.role, "admin"))
    return fail("Only administrators can add users.", 403, "FORBIDDEN");

  const body = await readJson<unknown>(req);
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) return fail(firstError(parsed.error), 422);

  // one user → one client; reject if the email is already used anywhere
  const existing = await db.getUserByEmail(parsed.data.email);
  if (existing) return fail("A user with this email already exists.", 409, "DUPLICATE");

  const user = await db.createUser({
    clientId: auth.user.clientId,
    email: parsed.data.email,
    fullName: parsed.data.fullName,
    phone: parsed.data.phone ?? null,
    role: parsed.data.role,
    status: "active",
  });

  await db.audit({
    clientId: auth.user.clientId,
    userId: auth.user.id,
    action: "user.created",
    entity: "user",
    entityId: user.id,
    metadata: { email: user.email, role: user.role },
  });

  return ok({ user });
}
