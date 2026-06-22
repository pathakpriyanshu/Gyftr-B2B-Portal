import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { ok, fail } from "@/lib/api";
import { generateOtp, hashOtp, otpExpiry } from "@/lib/auth/otp";
import { sendEmail, downloadOtpEmail } from "@/lib/email";

export async function POST(_req: Request, { params }: { params: { token: string } }) {
  const token = await db.getDownloadTokenByToken(params.token);
  if (!token) return fail("This download link is invalid or has expired.", 404, "BAD_TOKEN");

  const order = await db.getOrderById(token.orderId);
  if (!order || order.status !== "fulfilled")
    return fail("Vouchers are not ready for this order yet.", 409, "NOT_READY");

  // resend cooldown
  if (token.otpSentAt) {
    const since = Date.now() - new Date(token.otpSentAt).getTime();
    if (since < env.otp.resendCooldownSeconds * 1000) {
      const wait = Math.ceil((env.otp.resendCooldownSeconds * 1000 - since) / 1000);
      return fail(`Please wait ${wait}s before requesting another code.`, 429, "COOLDOWN");
    }
  }

  const otp = generateOtp();
  await db.setDownloadOtp(token.id, hashOtp(otp), otpExpiry());

  const tmpl = downloadOtpEmail(otp);
  await sendEmail({ to: token.email, subject: tmpl.subject, html: tmpl.html, text: tmpl.text });

  return ok({
    sent: true,
    ttlMinutes: env.otp.ttlMinutes,
    devOtp: env.otp.devMode ? otp : undefined,
  });
}
