import { Badge, type BadgeProps } from "@/components/ui/badge";
import type { OrderStatus, PaymentStatus } from "@/types";

const ORDER_META: Record<OrderStatus, { label: string; variant: BadgeProps["variant"] }> = {
  pending_payment: { label: "Pending Payment", variant: "warning" },
  under_verification: { label: "Under Verification", variant: "info" },
  paid: { label: "Paid", variant: "success" },
  processing: { label: "Processing", variant: "info" },
  fulfilled: { label: "Fulfilled", variant: "success" },
  cancelled: { label: "Cancelled", variant: "secondary" },
  rejected: { label: "Rejected", variant: "destructive" },
};

const PAYMENT_META: Record<PaymentStatus, { label: string; variant: BadgeProps["variant"] }> = {
  unpaid: { label: "Unpaid", variant: "secondary" },
  received: { label: "Payment Received", variant: "info" },
  under_verification: { label: "Under Verification", variant: "warning" },
  verified: { label: "Verified", variant: "success" },
  rejected: { label: "Rejected", variant: "destructive" },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const m = ORDER_META[status] ?? { label: status, variant: "secondary" as const };
  return <Badge variant={m.variant}>{m.label}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const m = PAYMENT_META[status] ?? { label: status, variant: "secondary" as const };
  return <Badge variant={m.variant}>{m.label}</Badge>;
}
