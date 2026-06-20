import "server-only";
import crypto from "node:crypto";
import { env } from "@/lib/env";

/** Generate a numeric OTP of the configured length. */
export function generateOtp(length = env.otp.length): string {
  const max = 10 ** length;
  const n = crypto.randomInt(0, max);
  return n.toString().padStart(length, "0");
}

/** Deterministic salted hash so OTPs are never stored in plaintext. */
export function hashOtp(otp: string): string {
  return crypto.createHmac("sha256", env.auth.jwtSecret).update(otp).digest("hex");
}

export function verifyOtpHash(otp: string, hash: string): boolean {
  const computed = hashOtp(otp);
  const a = Buffer.from(computed);
  const b = Buffer.from(hash);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function otpExpiry(): string {
  return new Date(Date.now() + env.otp.ttlMinutes * 60_000).toISOString();
}

export function isExpired(iso: string | null | undefined): boolean {
  if (!iso) return true;
  return new Date(iso).getTime() < Date.now();
}
