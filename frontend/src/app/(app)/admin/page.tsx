"use client";

import * as React from "react";
import Link from "next/link";
import { ShieldCheck, Check, X, FileText, Building2, Clock, Lock } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { usePendingVerifications } from "@/lib/client/hooks";
import { useHasRole } from "@/providers/session";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog } from "@/components/ui/dialog";
import { api, ApiClientError } from "@/lib/client/api";
import { formatINR, formatDate, formatNumber } from "@/lib/utils";
import type { Order } from "@/types";

export default function VerificationsPage() {
  const isFinance = useHasRole("finance");
  const { data, isLoading } = usePendingVerifications();
  const qc = useQueryClient();
  const [rejecting, setRejecting] = React.useState<Order | null>(null);

  if (!isFinance) {
    return (
      <div>
        <PageHeader title="Payment Verifications" />
        <EmptyState
          icon={Lock}
          title="Finance access required"
          description="Only Finance and Administrator roles can verify payments."
        />
      </div>
    );
  }

  const orders = data?.orders ?? [];

  const verify = async (order: Order, action: "approve" | "reject", reason?: string) => {
    try {
      await api.post(`/api/admin/orders/${order.id}/verify`, { action, reason });
      qc.invalidateQueries({ queryKey: ["verifications"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(action === "approve" ? "Payment verified — vouchers issued" : "Order rejected");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Action failed");
    }
  };

  return (
    <div>
      <PageHeader
        title="Payment Verifications"
        description="Review and approve bank-transfer payments awaiting verification."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Verifications" }]}
      />

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="All caught up!"
          description="There are no payments awaiting verification right now."
        />
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Card key={o.id}>
              <CardContent className="pt-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-warning/15 text-amber-700">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <Link href={`/orders/${o.id}`} className="font-semibold hover:text-primary">
                        {o.orderNumber}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {formatNumber(o.totalQuantity)} vouchers · {formatDate(o.createdAt, true)}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5" /> Bank Transfer
                        </span>
                        {o.utrNumber && <span>UTR: {o.utrNumber}</span>}
                        {o.paymentProofUrl && (
                          <a
                            href={o.paymentProofUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            <FileText className="h-3.5 w-3.5" /> Proof
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-lg font-bold tabular-nums">{formatINR(o.payableAmount)}</p>
                      <p className="text-xs text-muted-foreground">Amount to verify</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setRejecting(o)}>
                      <X className="h-4 w-4" /> Reject
                    </Button>
                    <Button variant="success" size="sm" onClick={() => verify(o, "approve")}>
                      <Check className="h-4 w-4" /> Approve
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <RejectDialog
        order={rejecting}
        onClose={() => setRejecting(null)}
        onConfirm={(reason) => {
          if (rejecting) verify(rejecting, "reject", reason);
          setRejecting(null);
        }}
      />
    </div>
  );
}

function RejectDialog({
  order,
  onClose,
  onConfirm,
}: {
  order: Order | null;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = React.useState("");
  React.useEffect(() => {
    if (order) setReason("");
  }, [order]);

  return (
    <Dialog
      open={!!order}
      onClose={onClose}
      title="Reject payment"
      description={order ? `Order ${order.orderNumber} will be marked as rejected.` : ""}
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Reason (optional)</label>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. UTR not found in bank statement"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => onConfirm(reason)}>
            Reject Order
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
