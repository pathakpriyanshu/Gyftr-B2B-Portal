"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Download,
  Package,
  Building2,
  Wallet,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useOrder } from "@/lib/client/hooks";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/status-badge";
import { BrandLogo } from "@/components/brand-logo";
import { api, ApiClientError } from "@/lib/client/api";
import { formatINR, formatDate, formatNumber } from "@/lib/utils";
import type { OrderStatus } from "@/types";

const TIMELINE: { key: OrderStatus; label: string }[] = [
  { key: "pending_payment", label: "Order Placed" },
  { key: "under_verification", label: "Payment Verification" },
  { key: "paid", label: "Payment Confirmed" },
  { key: "fulfilled", label: "Vouchers Ready" },
];

function stageIndex(status: OrderStatus): number {
  switch (status) {
    case "pending_payment":
      return 0;
    case "under_verification":
      return 1;
    case "paid":
    case "processing":
      return 2;
    case "fulfilled":
      return 3;
    default:
      return -1;
  }
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading } = useOrder(params.id);
  const [loadingLink, setLoadingLink] = React.useState(false);

  const order = data?.order;

  const goToDownload = async () => {
    if (!order) return;
    setLoadingLink(true);
    try {
      const res = await api.get<{ url: string }>(`/api/orders/${order.id}/download-link`);
      router.push(res.url);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Could not open download");
      setLoadingLink(false);
    }
  };

  if (isLoading) {
    return (
      <div>
        <Skeleton className="mb-6 h-8 w-64" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted-foreground">Order not found.</p>
        <Link href="/orders" className="mt-3 inline-block font-medium text-primary hover:underline">
          ← Back to orders
        </Link>
      </div>
    );
  }

  const rejected = order.status === "rejected";
  const current = stageIndex(order.status);

  return (
    <div>
      <PageHeader
        title={order.orderNumber}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Orders", href: "/orders" },
          { label: order.orderNumber },
        ]}
        actions={<OrderStatusBadge status={order.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Fulfilled banner */}
          {order.status === "fulfilled" && (
            <Card className="border-success/30 bg-success/5">
              <CardContent className="flex flex-col items-start gap-4 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-success/15 text-success">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">Vouchers are ready to download</p>
                    <p className="text-sm text-muted-foreground">
                      {formatNumber(order.totalQuantity)} vouchers · secured with OTP
                    </p>
                  </div>
                </div>
                <Button onClick={goToDownload} loading={loadingLink}>
                  <Download className="h-4 w-4" /> Download Vouchers
                </Button>
              </CardContent>
            </Card>
          )}

          {rejected && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="flex items-start gap-3 pt-5">
                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                <div>
                  <p className="font-semibold text-destructive">Payment rejected</p>
                  <p className="text-sm text-muted-foreground">
                    {order.rejectionReason || "Your payment could not be verified."}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Items */}
          <Card>
            <CardContent className="pt-6">
              <h2 className="mb-4 text-lg font-semibold">Order Items</h2>
              <div className="space-y-3">
                {(order.items ?? []).map((it) => (
                  <div
                    key={it.id}
                    className="flex items-center gap-3 rounded-lg border border-border p-3"
                  >
                    <BrandLogo name={it.brandName} src={it.brandLogoUrl} className="h-11 w-11 text-base" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{it.brandName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatINR(it.denomination)} × {formatNumber(it.quantity)} · {it.discountPct}% off
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold tabular-nums">{formatINR(it.finalPrice)}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        FV {formatINR(it.faceValueTotal)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <dl className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Total Face Value</dt>
                  <dd className="tabular-nums">{formatINR(order.totalFaceValue)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Total Discount</dt>
                  <dd className="tabular-nums text-success">– {formatINR(order.totalDiscount)}</dd>
                </div>
                <div className="flex items-baseline justify-between border-t border-border pt-2">
                  <dt className="font-semibold">Amount Paid</dt>
                  <dd className="text-xl font-bold tabular-nums">{formatINR(order.payableAmount)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: status timeline + payment */}
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <h3 className="mb-4 text-base font-semibold">Order Status</h3>
              {rejected ? (
                <div className="flex items-center gap-2 text-destructive">
                  <XCircle className="h-5 w-5" /> Order rejected
                </div>
              ) : (
                <ol className="relative space-y-5 border-l border-border pl-5">
                  {TIMELINE.map((stage, i) => {
                    const done = current > i;
                    const active = current === i;
                    return (
                      <li key={stage.key} className="relative">
                        <span
                          className={`absolute -left-[26px] flex h-5 w-5 items-center justify-center rounded-full ${
                            done
                              ? "bg-success text-success-foreground"
                              : active
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {done ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : active ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Clock className="h-3 w-3" />
                          )}
                        </span>
                        <p
                          className={`text-sm font-medium ${
                            done || active ? "text-foreground" : "text-muted-foreground"
                          }`}
                        >
                          {stage.label}
                        </p>
                      </li>
                    );
                  })}
                </ol>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h3 className="mb-4 text-base font-semibold">Payment</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Method</span>
                  <span className="flex items-center gap-1.5 font-medium">
                    {order.paymentMethod === "wallet" ? (
                      <>
                        <Wallet className="h-4 w-4" /> Wallet
                      </>
                    ) : order.paymentMethod === "bank_transfer" ? (
                      <>
                        <Building2 className="h-4 w-4" /> Bank Transfer
                      </>
                    ) : (
                      "—"
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <PaymentStatusBadge status={order.paymentStatus} />
                </div>
                {order.utrNumber && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">UTR</span>
                    <span className="font-medium">{order.utrNumber}</span>
                  </div>
                )}
                {order.paymentProofUrl && (
                  <a
                    href={order.paymentProofUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                  >
                    <FileText className="h-4 w-4" /> View payment proof
                  </a>
                )}
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <span className="text-muted-foreground">Placed on</span>
                  <span className="font-medium">{formatDate(order.createdAt, true)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
