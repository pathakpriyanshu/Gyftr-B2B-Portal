"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  Wallet,
  Receipt,
  Plus,
  ArrowRight,
  Activity,
  Store,
  LifeBuoy,
  TrendingUp,
} from "lucide-react";
import { useDashboard } from "@/lib/client/hooks";
import { useSession, useCanTransact } from "@/providers/session";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { OrderStatusBadge } from "@/components/status-badge";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Stagger, StaggerItem, EASE } from "@/components/ui/motion";
import { formatINR, formatNumber, formatDate, cn } from "@/lib/utils";

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
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back, {firstName}{" "}
            <motion.span
              className="inline-block"
              style={{ transformOrigin: "70% 80%" }}
              animate={{ rotate: [0, 18, -8, 16, 0] }}
              transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 1.8, ease: "easeInOut" }}
            >
              👋
            </motion.span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here&apos;s what&apos;s happening with {user.clientName} today.
          </p>
        </motion.div>
        {canTransact && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.1 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <Link href="/brands">
              <Button size="lg">
                <Plus className="h-4 w-4" /> Place New Order
              </Button>
            </Link>
          </motion.div>
        )}
      </div>

      {/* Summary cards */}
      <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" gap={0.09}>
        <StatCard
          loading={isLoading}
          icon={Wallet}
          label="Wallet Balance"
          value={stats ? <AnimatedNumber value={stats.walletBalance} format={(n) => formatINR(n)} /> : "—"}
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
          value={
            stats ? <AnimatedNumber value={stats.totalOrders} format={(n) => formatNumber(Math.round(n))} /> : "—"
          }
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
      </Stagger>

      {/* Quick actions */}
      <Stagger className="mt-4 grid gap-4 sm:grid-cols-3" gap={0.08} delayChildren={0.12}>
        <QuickAction href="/brands" icon={Store} title="Browse Brands" desc="300+ brands available" />
        <QuickAction href="/orders" icon={TrendingUp} title="Track Orders" desc="Status & history" />
        <QuickAction href="/support" icon={LifeBuoy} title="Support" desc="Get help fast" />
      </Stagger>

      {/* Recent orders */}
      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Orders</h2>
          <Link
            href="/orders"
            className="group inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            View all <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
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
                  {orders.map((o, i) => (
                    <motion.tr
                      key={o.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, ease: EASE, delay: i * 0.05 }}
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
                    </motion.tr>
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
    <StaggerItem>
      <Card className="group h-full transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:card-shadow-lg">
        <CardContent className="pt-5">
          <div className="flex items-start justify-between">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6",
                tones[tone]
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight tabular-nums">
            {loading ? <Skeleton className="h-8 w-28" /> : value}
          </div>
          {footer && <div className="mt-2 text-xs">{footer}</div>}
        </CardContent>
      </Card>
    </StaggerItem>
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
    <StaggerItem>
      <Link href={href}>
        <Card className="group h-full transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:card-shadow-lg">
          <CardContent className="flex items-center gap-4 pt-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-foreground/70 transition-colors duration-300 group-hover:bg-accent group-hover:text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold">{title}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
            <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground transition-transform duration-300 group-hover:translate-x-1 group-hover:text-primary" />
          </CardContent>
        </Card>
      </Link>
    </StaggerItem>
  );
}
