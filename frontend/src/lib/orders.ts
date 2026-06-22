import "server-only";
import { db } from "@/lib/db";
import { issueVouchers } from "@/lib/gyftr";
import { generateVoucherWorkbook } from "@/lib/excel";
import { uploadFile } from "@/lib/storage";
import { sendEmail, downloadLinkEmail } from "@/lib/email";
import { env } from "@/lib/env";
import type { Order } from "@/types";

/**
 * Fulfils a paid order:
 *   1. issues vouchers via Gyftr (or mock)
 *   2. persists vouchers
 *   3. generates + stores the .xlsx delivery file
 *   4. creates a secure download token
 *   5. emails the OTP-gated download link to the user
 *   6. marks the order fulfilled
 *
 * Idempotent: if vouchers already exist it won't re-issue.
 */
export async function fulfillOrder(orderId: string): Promise<Order | null> {
  const order = await db.getOrderById(orderId);
  if (!order) return null;
  if (order.status === "fulfilled") return order;

  await db.updateOrder(orderId, { status: "processing" });

  const existing = await db.listVouchers(orderId);
  if (existing.length === 0) {
    const items = order.items ?? [];
    const vouchers = await issueVouchers({ orderNumber: order.orderNumber, items });
    await db.createVouchers(orderId, vouchers);
  }

  // generate + store the Excel file
  const vouchers = await db.listVouchers(orderId);
  try {
    const buffer = await generateVoucherWorkbook(order, vouchers);
    await uploadFile(
      "voucher-files",
      `${order.orderNumber}.xlsx`,
      buffer,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
  } catch {
    /* file is regenerated on download too; non-fatal */
  }

  // user email for the download link
  const user = await db.getUserById(order.userId);
  const email = user?.email ?? "";
  const token = await db.getOrCreateDownloadToken(orderId, email);

  const fulfilled = await db.updateOrder(orderId, { status: "fulfilled" });

  if (email) {
    const link = `${env.appUrl}/download/${token.token}`;
    const tmpl = downloadLinkEmail(order.orderNumber, link);
    await sendEmail({ to: email, subject: tmpl.subject, html: tmpl.html, text: tmpl.text });
  }

  await db.audit({
    clientId: order.clientId,
    userId: order.userId,
    action: "order.fulfilled",
    entity: "order",
    entityId: orderId,
    metadata: { vouchers: vouchers.length },
  });

  return fulfilled;
}
