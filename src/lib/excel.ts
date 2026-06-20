import "server-only";
import ExcelJS from "exceljs";
import { formatDate } from "@/lib/utils";
import type { Order, Voucher } from "@/types";

/**
 * Generates the .xlsx voucher delivery file for an order
 * (voucher codes & PINs), per PRD §5.10 / §6.
 */
export async function generateVoucherWorkbook(
  order: Order,
  vouchers: Voucher[]
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Gyftr B2B Portal";
  wb.created = new Date();

  // --- Summary sheet ---
  const summary = wb.addWorksheet("Summary");
  summary.columns = [
    { header: "Field", key: "field", width: 28 },
    { header: "Value", key: "value", width: 40 },
  ];
  summary.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  summary.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1A2552" },
  };
  const rows: Array<[string, string]> = [
    ["Order Number", order.orderNumber],
    ["Order Date", formatDate(order.createdAt, true)],
    ["Total Vouchers", String(vouchers.length)],
    ["Total Face Value", `INR ${order.totalFaceValue.toLocaleString("en-IN")}`],
    ["Payment Status", order.paymentStatus],
    ["Generated On", formatDate(new Date(), true)],
  ];
  rows.forEach((r) => summary.addRow({ field: r[0], value: r[1] }));

  // --- Vouchers sheet ---
  const sheet = wb.addWorksheet("Vouchers");
  sheet.columns = [
    { header: "S.No", key: "sno", width: 8 },
    { header: "Brand", key: "brand", width: 26 },
    { header: "Denomination (INR)", key: "denom", width: 20 },
    { header: "Voucher Code", key: "code", width: 30 },
    { header: "PIN", key: "pin", width: 14 },
    { header: "Expiry Date", key: "expiry", width: 16 },
  ];
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE6007E" } };
  header.alignment = { vertical: "middle" };
  header.height = 22;

  vouchers.forEach((v, i) => {
    const row = sheet.addRow({
      sno: i + 1,
      brand: v.brandName,
      denom: v.denomination,
      code: v.code,
      pin: v.pin ?? "—",
      expiry: v.expiryDate ? formatDate(v.expiryDate) : "—",
    });
    if (i % 2 === 1) {
      row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFDF2F8" } };
    }
  });

  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFE5E7EB" } },
        bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
        left: { style: "thin", color: { argb: "FFE5E7EB" } },
        right: { style: "thin", color: { argb: "FFE5E7EB" } },
      };
    });
  });

  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
