import "server-only";
import crypto from "node:crypto";
import { env } from "@/lib/env";
import type { OrderItem } from "@/types";
import type { NewVoucher } from "@/lib/db/types";

/**
 * Client for the Gyftr core APIs (catalog + voucher issuance).
 *
 * When GYFTR_USE_MOCK is true (default until real credentials are supplied)
 * the catalog/issuance are simulated locally so the portal is fully
 * functional end-to-end. Flip GYFTR_USE_MOCK=false and set GYFTR_API_KEY to
 * route these calls to the real Gyftr gateway.
 */

function randomCode(brandExt: string, denomination: number): string {
  const block = () => crypto.randomBytes(2).toString("hex").toUpperCase();
  return `${brandExt}-${block()}-${block()}-${denomination}`;
}
function randomPin(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export interface IssueVoucherRequest {
  orderNumber: string;
  items: OrderItem[];
}

/** Issues vouchers for an order. Returns flat list ready to persist. */
export async function issueVouchers(req: IssueVoucherRequest): Promise<NewVoucher[]> {
  if (!env.gyftr.useMock) {
    return issueViaGyftrApi(req);
  }
  return issueMock(req);
}

function issueMock(req: IssueVoucherRequest): NewVoucher[] {
  const expiry = new Date();
  expiry.setFullYear(expiry.getFullYear() + 1);
  const expiryDate = expiry.toISOString().slice(0, 10);
  const out: NewVoucher[] = [];
  for (const item of req.items) {
    const ext = (item.brandName.replace(/[^A-Z]/gi, "").slice(0, 4) || "GYF").toUpperCase();
    for (let i = 0; i < item.quantity; i++) {
      out.push({
        orderItemId: item.id,
        brandId: item.brandId,
        brandName: item.brandName,
        denomination: item.denomination,
        code: randomCode(ext, item.denomination),
        pin: randomPin(),
        expiryDate,
      });
    }
  }
  return out;
}

async function issueViaGyftrApi(req: IssueVoucherRequest): Promise<NewVoucher[]> {
  const url = `${env.gyftr.baseUrl}${env.gyftr.sendVoucherEndpoint}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.gyftr.apiKey}`,
    },
    body: JSON.stringify({
      orderNumber: req.orderNumber,
      items: req.items.map((i) => ({
        brand: i.brandId,
        denomination: i.denomination,
        quantity: i.quantity,
      })),
    }),
  });
  if (!res.ok) {
    throw new Error(`Gyftr voucher issuance failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as {
    vouchers: Array<{
      orderItemId?: string;
      brandId?: string;
      brandName: string;
      denomination: number;
      code: string;
      pin?: string;
      expiryDate?: string;
    }>;
  };
  return json.vouchers.map((v) => ({
    orderItemId: v.orderItemId ?? "",
    brandId: v.brandId ?? null,
    brandName: v.brandName,
    denomination: v.denomination,
    code: v.code,
    pin: v.pin ?? null,
    expiryDate: v.expiryDate ?? null,
  }));
}
