import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { ok, fail, readJson } from "@/lib/api";
import { generateOtp, hashOtp, otpExpiry } from "@/lib/auth/otp";
import { sendEmail, loginOtpEmail } from "@/lib/email";
import { requestOtpSchema, firstError } from "@/lib/schemas";

export async function POST(req: Request) {
  const body = await readJson<unknown>(req);
  const parsed = requestOtpSchema.safeParse(body);
  if (!parsed.success) return fail(firstError(parsed.error), 422);

  const { email } = parsed.data;
  const user = await db.getUserByEmail(email);

  if (!user) {
    return fail("No account is registered with this email. Contact your administrator.", 404, "NO_ACCOUNT");
  }
  if (user.status === "disabled") {
    return fail("This account has been disabled. Contact your administrator.", 403, "ACCOUNT_DISABLED");
  }

  // resend cooldown
  const latest = await db.getLatestLoginOtp(email);
  if (latest) {
    const since = Date.now() - new Date(latest.createdAt).getTime();
    if (since < env.otp.resendCooldownSeconds * 1000) {
      const wait = Math.ceil((env.otp.resendCooldownSeconds * 1000 - since) / 1000);
      return fail(`Please wait ${wait}s before requesting another code.`, 429, "COOLDOWN");
    }
  }

  const otp = generateOtp();
  await db.createLoginOtp(email, hashOtp(otp), otpExpiry());

  const tmpl = loginOtpEmail(otp);
  await sendEmail({ to: email, subject: tmpl.subject, html: tmpl.html, text: tmpl.text });

  await db.audit({
    clientId: user.clientId,
    userId: user.id,
    action: "auth.otp_requested",
    entity: "user",
    entityId: user.id,
  });

  return ok({
    sent: true,
    ttlMinutes: env.otp.ttlMinutes,
    // DEV ONLY: surface the OTP so it can be entered without real email.
    devOtp: env.otp.devMode ? otp : undefined,
  });
}
