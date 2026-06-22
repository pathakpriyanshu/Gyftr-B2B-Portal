"use client";

import { Wallet, ArrowDownLeft, ArrowUpRight, RotateCcw, Info } from "lucide-react";
import { motion } from "motion/react";
import { useWallet } from "@/lib/client/hooks";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { EASE } from "@/components/ui/motion";
import { formatINR, formatDate } from "@/lib/utils";
import type { WalletTxnType } from "@/types";

const TXN_META: Record<WalletTxnType, { icon: typeof ArrowDownLeft; tone: string; sign: string }> = {
  credit: { icon: ArrowDownLeft, tone: "text-success bg-success/10", sign: "+" },
  refund: { icon: RotateCcw, tone: "text-secondary bg-secondary/10", sign: "+" },
  debit: { icon: ArrowUpRight, tone: "text-destructive bg-destructive/10", sign: "–" },
};

export default function WalletPage() {
  const { data, isLoading } = useWallet();
  const wallet = data?.wallet;
  const txns = data?.transactions ?? [];

  return (
    <div>
      <PageHeader
        title="Wallet"
        description="Your prepaid balance and transaction history."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Wallet" }]}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Balance card */}
        <div className="lg:col-span-1">
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <Card className="relative overflow-hidden bg-brand-mesh text-white">
              <motion.div
                aria-hidden
                className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl"
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              />
              <CardContent className="relative pt-6">
                <div className="flex items-center gap-2 text-white/80">
                  <Wallet className="h-5 w-5" />
                  <span className="text-sm font-medium">Available Balance</span>
                </div>
                <p className="mt-3 text-4xl font-bold tabular-nums">
                  {isLoading ? (
                    <Skeleton className="h-10 w-40 bg-white/20" />
                  ) : (
                    <AnimatedNumber value={wallet?.balance ?? 0} format={(n) => formatINR(n)} />
                  )}
                </p>
                <p className="mt-1 text-sm text-white/60">{wallet?.currency ?? "INR"} Wallet</p>
              </CardContent>
            </Card>
          </motion.div>

          <div className="mt-4 flex items-start gap-2 rounded-xl border border-border bg-muted/40 p-4 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            To top up your wallet, contact your Gyftr account manager. Top-ups reflect here once
            processed by the finance team.
          </div>
        </div>

        {/* Transactions */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="pt-6">
              <h2 className="mb-4 text-base font-semibold">Transaction History</h2>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : txns.length === 0 ? (
                <EmptyState icon={Wallet} title="No transactions yet" description="Your wallet activity will appear here." />
              ) : (
                <ul className="divide-y divide-border">
                  {txns.map((t, i) => {
                    const meta = TXN_META[t.type];
                    const Icon = meta.icon;
                    return (
                      <motion.li
                        key={t.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, ease: EASE, delay: Math.min(i, 8) * 0.05 }}
                        className="flex items-center gap-3 py-3.5"
                      >
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${meta.tone}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{t.description || t.type}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(t.createdAt, true)}
                            {t.reference ? ` · ${t.reference}` : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <p
                            className={`font-semibold tabular-nums ${
                              t.type === "debit" ? "text-destructive" : "text-success"
                            }`}
                          >
                            {meta.sign} {formatINR(t.amount)}
                          </p>
                          <p className="text-xs text-muted-foreground tabular-nums">
                            Bal: {formatINR(t.balanceAfter)}
                          </p>
                        </div>
                      </motion.li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
