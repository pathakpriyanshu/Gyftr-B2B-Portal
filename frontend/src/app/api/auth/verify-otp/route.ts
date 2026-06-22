import { db } from "@/lib/db";
import { ok, fail, readJson } from "@/lib/api";
import { verifyOtpHash, isExpired } from "@/lib/auth/otp";
import { setSessionCookie } from "@/lib/auth/session";
import { verifyOtpSchema, firstError } from "@/lib/schemas";

const MAX_ATTEMPTS = 5;

export async function POST(req: Request) {
  const body = await readJson<unknown>(req);
  const parsed = verifyOtpSchema.safeParse(body);
  if (!parsed.success) return fail(firstError(parsed.error), 422);

  const { email, otp } = parsed.data;
  const user = await db.getUserByEmail(email);
  if (!user) return fail("No account found for this email.", 404, "NO_ACCOUNT");
  if (user.status === "disabled") return fail("This account has been disabled.", 403, "ACCOUNT_DISABLED");

  const record = await db.getLatestLoginOtp(email);
  if (!record) return fail("No active code. Please request a new OTP.", 400, "NO_OTP");
  if (record.consumed) return fail("This code was already used. Request a new OTP.", 400, "OTP_USED");
  if (isExpired(record.expiresAt)) return fail("Your code has expired. Request a new OTP.", 400, "OTP_EXPIRED");
  if (record.attempts >= MAX_ATTEMPTS)
    return fail("Too many incorrect attempts. Request a new OTP.", 429, "TOO_MANY_ATTEMPTS");

  if (!verifyOtpHash(otp, record.otpHash)) {
    await db.bumpLoginOtpAttempts(record.id);
    return fail("Incorrect code. Please try again.", 401, "INVALID_OTP");
  }

  await db.consumeLoginOtp(record.id);
  await db.touchUserLogin(user.id);

  const client = await db.getClientById(user.clientId);

  await setSessionCookie({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    clientId: user.clientId,
    clientName: client?.name ?? "",
  });

  await db.audit({
    clientId: user.clientId,
    userId: user.id,
    action: "auth.login",
    entity: "user",
    entityId: user.id,
  });

  return ok({
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      clientId: user.clientId,
      clientName: client?.name ?? "",
    },
  });
}
