import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address");

export const requestOtpSchema = z.object({
  email: emailSchema,
});

export const verifyOtpSchema = z.object({
  email: emailSchema,
  otp: z.string().regex(/^\d{4,8}$/, "Enter the OTP"),
});

export const cartLineSchema = z.object({
  brandId: z.string().min(1),
  brandName: z.string(),
  brandLogoUrl: z.string().nullable(),
  denomination: z.number().positive(),
  quantity: z.number().int().positive().max(100000),
  discountPct: z.number().min(0).max(100),
  faceValueTotal: z.number().nonnegative(),
  discountTotal: z.number().nonnegative(),
  finalPrice: z.number().nonnegative(),
});

export const saveCartSchema = z.object({
  lines: z.array(cartLineSchema).max(200),
});

export const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        brandId: z.string().min(1),
        denomination: z.number().positive(),
        quantity: z.number().int().positive().max(100000),
      })
    )
    .min(1, "Cart is empty"),
});

export const submitPaymentSchema = z.object({
  method: z.enum(["wallet", "bank_transfer"]),
  utrNumber: z.string().trim().max(40).optional(),
  paymentProofKey: z.string().optional(),
  paymentProofUrl: z.string().optional(),
});

export const downloadVerifySchema = z.object({
  otp: z.string().regex(/^\d{4,8}$/, "Enter the OTP"),
});

export const createUserSchema = z.object({
  email: emailSchema,
  fullName: z.string().trim().min(2, "Name is required").max(120),
  phone: z.string().trim().max(20).optional().nullable(),
  role: z.enum(["admin", "finance", "procurement", "viewer"]),
});

export const updateUserSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().max(20).optional().nullable(),
  role: z.enum(["admin", "finance", "procurement", "viewer"]).optional(),
  status: z.enum(["active", "disabled", "invited"]).optional(),
});

export const verifyOrderSchema = z.object({
  action: z.enum(["approve", "reject"]),
  reason: z.string().trim().max(300).optional(),
});

export function firstError(err: z.ZodError): string {
  return err.issues[0]?.message ?? "Invalid request";
}
