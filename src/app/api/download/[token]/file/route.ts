import { db } from "@/lib/db";
import { fail } from "@/lib/api";
import { generateVoucherWorkbook } from "@/lib/excel";

/** Streams the .xlsx voucher file. Requires a verified download token. */
export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const token = await db.getDownloadTokenByToken(params.token);
  if (!token) return fail("This download link is invalid or has expired.", 404, "BAD_TOKEN");
  if (!token.verified) return fail("Please verify the OTP before downloading.", 403, "NOT_VERIFIED");

  const order = await db.getOrderById(token.orderId);
  if (!order || order.status !== "fulfilled")
    return fail("Vouchers are not ready for this order.", 409, "NOT_READY");

  const vouchers = await db.listVouchers(order.id);
  const buffer = await generateVoucherWorkbook(order, vouchers);

  await db.audit({
    clientId: order.clientId,
    action: "voucher.downloaded",
    entity: "order",
    entityId: order.id,
    metadata: { vouchers: vouchers.length },
  });

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${order.orderNumber}-vouchers.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
