import { db } from "@/lib/db";
import { ok, fail, readJson } from "@/lib/api";
import { verifyOtpHash, isExpired } from "@/lib/auth/otp";
import { downloadVerifySchema, firstError } from "@/lib/schemas";

const MAX_ATTEMPTS = 5;

export async function POST(req: Request, { params }: { params: { token: string } }) {
  const token = await db.getDownloadTokenByToken(params.token);
  if (!token) return fail("This download link is invalid or has expired.", 404, "BAD_TOKEN");

  const body = await readJson<unknown>(req);
  const parsed = downloadVerifySchema.safeParse(body);
  if (!parsed.success) return fail(firstError(parsed.error), 422);

  if (!token.otpHash) return fail("Please request an OTP first.", 400, "NO_OTP");
  if (isExpired(token.otpExpiresAt)) return fail("Your code has expired. Request a new OTP.", 400, "OTP_EXPIRED");
  if (token.attempts >= MAX_ATTEMPTS)
    return fail("Too many incorrect attempts. Request a new OTP.", 429, "TOO_MANY_ATTEMPTS");

  if (!verifyOtpHash(parsed.data.otp, token.otpHash)) {
    await db.bumpDownloadAttempts(token.id);
    return fail("Incorrect code. Please try again.", 401, "INVALID_OTP");
  }

  await db.markDownloadVerified(token.id);

  const order = await db.getOrderById(token.orderId);
  const vouchers = await db.listVouchers(token.orderId);

  await db.audit({
    clientId: order?.clientId ?? null,
    action: "voucher.download_verified",
    entity: "order",
    entityId: token.orderId,
  });

  return ok({
    verified: true,
    orderNumber: order?.orderNumber,
    voucherCount: vouchers.length,
    downloadUrl: `/api/download/${params.token}/file`,
  });
}
