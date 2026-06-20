"use client";

import Link from "next/link";
import {
  Wallet,
  Receipt,
  Plus,
  ArrowRight,
  Activity,
  Store,
  LifeBuoy,
  Settings,
  TrendingUp,
} from "lucide-react";
import { useDashboard } from "@/lib/client/hooks";
import { useSession, useCanTransact } from "@/providers/session";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { OrderStatusBadge } from "@/components/status-badge";
import { formatINR, formatDate, cn } from "@/lib/utils";

export default function DashboardPage() {
  const user = useSession();
  const canTransact = useCanTransact();
  const { data, isLoading } = useDashboard();
  const stats = data?.stats;
  const orders = data?.orders ?? [];
  const firstName = user.fullName.split(" ")[0];

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back, {firstName} 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here's what's happening with {user.clientName} today.
          </p>
        </div>
        {canTransact && (
          <Link href="/brands">
            <Button size="lg">
              <Plus className="h-4 w-4" /> Place New Order
            </Button>
          </Link>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          loading={isLoading}
          icon={Wallet}
          label="Wallet Balance"
          value={stats ? formatINR(stats.walletBalance) : "—"}
          tone="primary"
          footer={
            <Link href="/wallet" className="text-primary hover:underline">
              View transactions
            </Link>
          }
        />
        <StatCard
          loading={isLoading}
          icon={Receipt}
          label="Total Orders"
          value={stats ? String(stats.totalOrders) : "—"}
          tone="secondary"
          footer={
            <span className="text-muted-foreground">
              {stats?.pendingOrders ?? 0} in progress · {stats?.fulfilledOrders ?? 0} fulfilled
            </span>
          }
        />
        <StatCard
          loading={isLoading}
          icon={Activity}
          label="Last Order Status"
          value={
            stats?.lastOrder ? (
              <span className="flex items-center">
                <OrderStatusBadge status={stats.lastOrder.status} />
              </span>
            ) : (
              "No orders yet"
            )
          }
          tone="success"
          footer={
            stats?.lastOrder ? (
              <Link href={`/orders/${stats.lastOrder.id}`} className="text-primary hover:underline">
                {stats.lastOrder.orderNumber}
              </Link>
            ) : (
              <span className="text-muted-foreground">Place your first order</span>
            )
          }
        />
      </div>

      {/* Quick actions */}
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <QuickAction href="/brands" icon={Store} title="Browse Brands" desc="300+ brands available" />
        <QuickAction href="/orders" icon={TrendingUp} title="Track Orders" desc="Status & history" />
        <QuickAction href="/support" icon={LifeBuoy} title="Support" desc="Get help fast" />
      </div>

      {/* Recent orders */}
      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Orders</h2>
          <Link
            href="/orders"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <Card>
          {isLoading ? (
            <div className="space-y-3 p-5">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <CardContent className="pt-5">
              <EmptyState
                icon={Receipt}
                title="No orders yet"
                description="Browse brands and place your first bulk voucher order."
                action={
                  canTransact && (
                    <Link href="/brands">
                      <Button>
                        <Plus className="h-4 w-4" /> Place New Order
                      </Button>
                    </Link>
                  )
                }
              />
            </CardContent>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-5 py-3 font-semibold">Order ID</th>
                    <th className="px-5 py-3 font-semibold">Date</th>
                    <th className="px-5 py-3 text-right font-semibold">Amount</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr
                      key={o.id}
                      className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/40"
                    >
                      <td className="px-5 py-3.5 font-semibold">{o.orderNumber}</td>
                      <td className="px-5 py-3.5 text-muted-foreground">
                        {formatDate(o.createdAt)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold tabular-nums">
                        {formatINR(o.payableAmount)}
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
          )}
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  loading,
  icon: Icon,
  label,
  value,
  footer,
  tone,
}: {
  loading: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  footer?: React.ReactNode;
  tone: "primary" | "secondary" | "success";
}) {
  const tones = {
    primary: "bg-accent text-primary",
    secondary: "bg-secondary/10 text-secondary",
    success: "bg-success/10 text-success",
  };
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", tones[tone])}>
            <Icon className="h-[18px] w-[18px]" />
          </div>
        </div>
        <div className="mt-3 text-2xl font-bold tracking-tight">
          {loading ? <Skeleton className="h-8 w-28" /> : value}
        </div>
        {footer && <div className="mt-2 text-xs">{footer}</div>}
      </CardContent>
    </Card>
  );
}

function QuickAction({
  href,
  icon: Icon,
  title,
  desc,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <Link href={href}>
      <Card className="group transition-all hover:border-primary/30 hover:card-shadow-lg">
        <CardContent className="flex items-center gap-4 pt-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-foreground/70 transition-colors group-hover:bg-accent group-hover:text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold">{title}</p>
            <p className="text-xs text-muted-foreground">{desc}</p>
          </div>
          <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
        </CardContent>
      </Card>
    </Link>
  );
}
