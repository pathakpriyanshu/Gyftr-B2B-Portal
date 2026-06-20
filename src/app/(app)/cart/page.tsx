"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2, ShoppingCart, ArrowRight, Tag, ShoppingBag } from "lucide-react";
import { useCart } from "@/store/cart";
import { useCanTransact } from "@/providers/session";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { BrandLogo } from "@/components/brand-logo";
import { formatINR, formatNumber } from "@/lib/utils";

export default function CartPage() {
  const router = useRouter();
  const canTransact = useCanTransact();
  const lines = useCart((s) => s.lines);
  const setQuantity = useCart((s) => s.setQuantity);
  const removeItem = useCart((s) => s.removeItem);
  const clear = useCart((s) => s.clear);
  const summary = useCart((s) => s.summary());

  if (lines.length === 0) {
    return (
      <div>
        <PageHeader
          title="Your Cart"
          breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Cart" }]}
        />
        <EmptyState
          icon={ShoppingBag}
          title="Your cart is empty"
          description="Browse brands and add gift vouchers to get started."
          action={
            <Link href="/brands">
              <Button>
                <ShoppingCart className="h-4 w-4" /> Browse Brands
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Your Cart"
        description={`${formatNumber(summary.totalQuantity)} voucher${summary.totalQuantity === 1 ? "" : "s"} across ${lines.length} line item${lines.length === 1 ? "" : "s"}`}
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Cart" }]}
        actions={
          <Button variant="ghost" size="sm" onClick={clear} className="text-muted-foreground">
            <Trash2 className="h-4 w-4" /> Clear cart
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Items */}
        <div className="space-y-3 lg:col-span-2">
          {lines.map((l) => (
            <Card key={`${l.brandId}-${l.denomination}`}>
              <CardContent className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-center">
                <BrandLogo name={l.brandName} src={l.brandLogoUrl} className="h-14 w-14 text-xl" />

                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold">{l.brandName}</h3>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                    <span>Denomination: {formatINR(l.denomination)}</span>
                    {l.discountPct > 0 && (
                      <span className="inline-flex items-center gap-1 text-success">
                        <Tag className="h-3 w-3" /> {l.discountPct}% off
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>Face value: {formatINR(l.faceValueTotal)}</span>
                    <span className="text-success">Discount: – {formatINR(l.discountTotal)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                  <div className="flex items-center rounded-lg border border-input">
                    <button
                      onClick={() => setQuantity(l.brandId, l.denomination, l.quantity - 1)}
                      className="flex h-9 w-9 items-center justify-center rounded-l-lg text-foreground/70 hover:bg-muted"
                      aria-label="Decrease"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <input
                      type="number"
                      value={l.quantity}
                      min={1}
                      onChange={(e) =>
                        setQuantity(l.brandId, l.denomination, Math.max(1, Number(e.target.value) || 1))
                      }
                      className="h-9 w-14 border-x border-input bg-transparent text-center text-sm font-semibold focus:outline-none"
                    />
                    <button
                      onClick={() => setQuantity(l.brandId, l.denomination, l.quantity + 1)}
                      className="flex h-9 w-9 items-center justify-center rounded-r-lg text-foreground/70 hover:bg-muted"
                      aria-label="Increase"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-bold tabular-nums">{formatINR(l.finalPrice)}</p>
                    <button
                      onClick={() => removeItem(l.brandId, l.denomination)}
                      className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-destructive hover:underline"
                    >
                      <Trash2 className="h-3 w-3" /> Remove
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-20">
            <CardContent className="pt-6">
              <h3 className="text-base font-semibold">Order Summary</h3>
              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Total Face Value</dt>
                  <dd className="font-medium tabular-nums">{formatINR(summary.totalFaceValue)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Total Discount</dt>
                  <dd className="font-semibold tabular-nums text-success">
                    – {formatINR(summary.totalDiscount)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Total Vouchers</dt>
                  <dd className="font-medium tabular-nums">{formatNumber(summary.totalQuantity)}</dd>
                </div>
                <div className="border-t border-border pt-3">
                  <div className="flex items-baseline justify-between">
                    <dt className="font-semibold">Final Payable</dt>
                    <dd className="text-2xl font-bold tabular-nums">
                      {formatINR(summary.payableAmount)}
                    </dd>
                  </div>
                </div>
              </dl>

              <Button
                className="mt-6 w-full"
                size="lg"
                disabled={!canTransact}
                onClick={() => router.push("/checkout")}
              >
                Proceed to Checkout <ArrowRight className="h-4 w-4" />
              </Button>
              {!canTransact && (
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  Your role has view-only access.
                </p>
              )}
              <Link
                href="/brands"
                className="mt-3 flex items-center justify-center text-sm font-medium text-primary hover:underline"
              >
                Continue shopping
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
