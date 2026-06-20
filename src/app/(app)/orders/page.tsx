"use client";

import * as React from "react";
import Link from "next/link";
import { Receipt, Search, Plus, Package } from "lucide-react";
import { useOrders } from "@/lib/client/hooks";
import { useCanTransact } from "@/providers/session";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { OrderStatusBadge } from "@/components/status-badge";
import { formatINR, formatDate, formatNumber, cn } from "@/lib/utils";
import type { OrderStatus } from "@/types";

const FILTERS: { label: string; value: OrderStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending_payment" },
  { label: "Verifying", value: "under_verification" },
  { label: "Processing", value: "processing" },
  { label: "Fulfilled", value: "fulfilled" },
  { label: "Rejected", value: "rejected" },
];

export default function OrdersPage() {
  const { data, isLoading } = useOrders();
  const canTransact = useCanTransact();
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<OrderStatus | "all">("all");

  const orders = data?.orders ?? [];
  const filtered = orders.filter((o) => {
    const matchesFilter = filter === "all" || o.status === filter;
    const matchesSearch = !search || o.orderNumber.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div>
      <PageHeader
        title="Order History"
        description="Track the status of all your voucher orders."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Orders" }]}
        actions={
          canTransact && (
            <Link href="/brands">
              <Button>
                <Plus className="h-4 w-4" /> New Order
              </Button>
            </Link>
          )
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by order ID…"
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
                filter === f.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-primary"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <Card>
          <div className="space-y-3 p-5">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        </Card>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={orders.length === 0 ? "No orders yet" : "No matching orders"}
          description={
            orders.length === 0
              ? "Your placed orders will appear here."
              : "Try adjusting your search or filters."
          }
          action={
            orders.length === 0 &&
            canTransact && (
              <Link href="/brands">
                <Button>
                  <Plus className="h-4 w-4" /> Place Order
                </Button>
              </Link>
            )
          }
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3 font-semibold">Order ID</th>
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 text-right font-semibold">Vouchers</th>
                  <th className="px-5 py-3 text-right font-semibold">Amount</th>
                  <th className="px-5 py-3 font-semibold">Payment</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr
                    key={o.id}
                    className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/40"
                  >
                    <td className="px-5 py-3.5 font-semibold">{o.orderNumber}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{formatDate(o.createdAt)}</td>
                    <td className="px-5 py-3.5 text-right tabular-nums">
                      {formatNumber(o.totalQuantity)}
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold tabular-nums">
                      {formatINR(o.payableAmount)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        {o.paymentMethod === "wallet" ? (
                          <Package className="h-3.5 w-3.5" />
                        ) : null}
                        {o.paymentMethod === "wallet"
                          ? "Wallet"
                          : o.paymentMethod === "bank_transfer"
                            ? "Bank Transfer"
                            : "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <OrderStatusBadge status={o.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        href={`/orders/${o.id}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
