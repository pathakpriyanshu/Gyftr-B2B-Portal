"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Wallet,
  Building2,
  Upload,
  Check,
  ArrowRight,
  ArrowLeft,
  Copy,
  FileText,
  AlertTriangle,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/store/cart";
import { useCheckoutConfig, useWallet } from "@/lib/client/hooks";
import { useCanTransact } from "@/providers/session";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLogo } from "@/components/brand-logo";
import { api, ApiClientError } from "@/lib/client/api";
import { formatINR, formatNumber, cn } from "@/lib/utils";
import type { PaymentMethod } from "@/types";

export default function CheckoutPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const canTransact = useCanTransact();
  const lines = useCart((s) => s.lines);
  const summary = useCart((s) => s.summary());
  const { data: config } = useCheckoutConfig();
  const { data: walletData } = useWallet();

  const [step, setStep] = React.useState<1 | 2>(1);
  const [method, setMethod] = React.useState<PaymentMethod>("wallet");
  const [utr, setUtr] = React.useState("");
  const [proof, setProof] = React.useState<{ key: string; url: string; name: string } | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const balance = walletData?.wallet.balance ?? 0;
  const insufficient = method === "wallet" && balance < summary.payableAmount;
  const walletEnabled = config?.paymentMethods.wallet ?? true;
  const bankEnabled = config?.paymentMethods.bankTransfer ?? true;

  React.useEffect(() => {
    if (!walletEnabled && bankEnabled) setMethod("bank_transfer");
  }, [walletEnabled, bankEnabled]);

  if (lines.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted-foreground">Your cart is empty.</p>
        <Link href="/brands" className="mt-3 inline-block font-medium text-primary hover:underline">
          Browse brands →
        </Link>
      </div>
    );
  }

  // brand-wise grouping for the summary
  const byBrand = lines.reduce<Record<string, typeof lines>>((acc, l) => {
    (acc[l.brandName] ??= []).push(l);
    return acc;
  }, {});

  const uploadProof = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const data = await api.postForm<{ key: string; url: string; name: string }>("/api/upload", form);
      setProof(data);
      toast.success("Payment proof uploaded");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (method === "wallet" && insufficient) return;
    if (method === "bank_transfer" && utr.trim().length < 4) {
      toast.error("Please enter the UTR / payment reference number.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        items: lines.map((l) => ({
          brandId: l.brandId,
          denomination: l.denomination,
          quantity: l.quantity,
        })),
        payment: {
          method,
          utrNumber: method === "bank_transfer" ? utr.trim() : undefined,
          paymentProofKey: proof?.key,
          paymentProofUrl: proof?.url,
        },
      };
      const data = await api.post<{ order: { id: string; orderNumber: string }; paymentStatus: string }>(
        "/api/orders",
        payload
      );
      useCart.getState().clear();
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      router.push(
        `/checkout/confirmation?order=${data.order.id}&number=${data.order.orderNumber}&status=${data.paymentStatus}`
      );
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Could not submit order");
      setSubmitting(false);
    }
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  return (
    <div>
      <PageHeader
        title="Checkout"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Cart", href: "/cart" },
          { label: "Checkout" },
        ]}
      />

      {/* Stepper */}
      <div className="mb-6 flex items-center gap-3">
        <StepPill index={1} label="Order Summary" active={step === 1} done={step > 1} />
        <div className="h-px flex-1 bg-border" />
        <StepPill index={2} label="Payment" active={step === 2} done={false} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {step === 1 ? (
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-lg font-semibold">Order Summary</h2>
                <p className="text-sm text-muted-foreground">Review your order before payment.</p>

                <div className="mt-5 space-y-5">
                  {Object.entries(byBrand).map(([brand, items]) => (
                    <div key={brand}>
                      <div className="mb-2 flex items-center gap-2">
                        <BrandLogo name={brand} src={items[0].brandLogoUrl} className="h-8 w-8 text-sm" />
                        <h3 className="font-semibold">{brand}</h3>
                      </div>
                      <div className="overflow-hidden rounded-lg border border-border">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                            <tr>
                              <th className="px-3 py-2 text-left font-semibold">Denomination</th>
                              <th className="px-3 py-2 text-right font-semibold">Qty</th>
                              <th className="px-3 py-2 text-right font-semibold">Face Value</th>
                              <th className="px-3 py-2 text-right font-semibold">Discount</th>
                              <th className="px-3 py-2 text-right font-semibold">Payable</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((l) => (
                              <tr key={l.denomination} className="border-t border-border">
                                <td className="px-3 py-2">{formatINR(l.denomination)}</td>
                                <td className="px-3 py-2 text-right tabular-nums">{l.quantity}</td>
                                <td className="px-3 py-2 text-right tabular-nums">
                                  {formatINR(l.faceValueTotal)}
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums text-success">
                                  – {formatINR(l.discountTotal)}
                                </td>
                                <td className="px-3 py-2 text-right font-semibold tabular-nums">
                                  {formatINR(l.finalPrice)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex justify-end">
                  <Button onClick={() => setStep(2)} disabled={!canTransact}>
                    Continue to Payment <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-lg font-semibold">Payment Method</h2>
                <p className="text-sm text-muted-foreground">
                  Choose how you'd like to pay for this order.
                </p>

                <div className="mt-5 space-y-3">
                  {walletEnabled && (
                    <PaymentOption
                      selected={method === "wallet"}
                      onSelect={() => setMethod("wallet")}
                      icon={Wallet}
                      title="Wallet Payment"
                      subtitle={`Available balance: ${formatINR(balance)}`}
                    >
                      {method === "wallet" && insufficient && (
                        <div className="mt-3 flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>
                            Insufficient balance. You need{" "}
                            <b>{formatINR(summary.payableAmount - balance)}</b> more. Top up your
                            wallet or use bank transfer.
                          </span>
                        </div>
                      )}
                    </PaymentOption>
                  )}

                  {bankEnabled && (
                    <PaymentOption
                      selected={method === "bank_transfer"}
                      onSelect={() => setMethod("bank_transfer")}
                      icon={Building2}
                      title="Bank Transfer (NEFT / RTGS / IMPS)"
                      subtitle="Transfer offline and upload the payment proof"
                    >
                      {method === "bank_transfer" && config && (
                        <div className="mt-3 space-y-4">
                          <div className="rounded-lg border border-border bg-muted/40 p-4">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Beneficiary Bank Details
                            </p>
                            <div className="grid gap-2 text-sm sm:grid-cols-2">
                              <BankRow label="Account Name" value={config.bank.accountName} onCopy={copy} />
                              <BankRow label="Account Number" value={config.bank.accountNumber} onCopy={copy} />
                              <BankRow label="IFSC" value={config.bank.ifsc} onCopy={copy} />
                              <BankRow label="Bank" value={`${config.bank.bankName}, ${config.bank.branch}`} />
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="utr">UTR / Payment Reference Number *</Label>
                            <Input
                              id="utr"
                              placeholder="e.g. AXISR52025062012345"
                              value={utr}
                              onChange={(e) => setUtr(e.target.value)}
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label>Upload Payment Proof (optional)</Label>
                            <label
                              className={cn(
                                "flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-border bg-card p-3 transition-colors hover:border-primary/40 hover:bg-accent/40",
                                proof && "border-success/40 bg-success/5"
                              )}
                            >
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                {uploading ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : proof ? (
                                  <FileText className="h-4 w-4 text-success" />
                                ) : (
                                  <Upload className="h-4 w-4" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1 text-sm">
                                {proof ? (
                                  <p className="truncate font-medium text-success">{proof.name}</p>
                                ) : (
                                  <p className="font-medium">Click to upload receipt</p>
                                )}
                                <p className="text-xs text-muted-foreground">PNG, JPG or PDF · max 8 MB</p>
                              </div>
                              <input
                                type="file"
                                accept="image/png,image/jpeg,image/webp,application/pdf"
                                className="hidden"
                                onChange={(e) => e.target.files?.[0] && uploadProof(e.target.files[0])}
                              />
                            </label>
                          </div>
                        </div>
                      )}
                    </PaymentOption>
                  )}
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <Button variant="ghost" onClick={() => setStep(1)}>
                    <ArrowLeft className="h-4 w-4" /> Back
                  </Button>
                  <Button
                    size="lg"
                    onClick={submit}
                    loading={submitting}
                    disabled={(method === "wallet" && insufficient) || !canTransact}
                  >
                    <ShieldCheck className="h-4 w-4" /> Submit Order ·{" "}
                    {formatINR(summary.payableAmount)}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sticky totals */}
        <div className="lg:col-span-1">
          <Card className="sticky top-20">
            <CardContent className="pt-6">
              <h3 className="text-base font-semibold">Amount Payable</h3>
              <dl className="mt-4 space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Total Face Value</dt>
                  <dd className="tabular-nums">{formatINR(summary.totalFaceValue)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Total Discount</dt>
                  <dd className="tabular-nums text-success">– {formatINR(summary.totalDiscount)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Vouchers</dt>
                  <dd className="tabular-nums">{formatNumber(summary.totalQuantity)}</dd>
                </div>
              </dl>
              <div className="mt-4 border-t border-border pt-4">
                <div className="flex items-baseline justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="text-2xl font-bold tabular-nums">
                    {formatINR(summary.payableAmount)}
                  </span>
                </div>
              </div>
              <div className="mt-4 flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                Vouchers are delivered via a secure, OTP-protected download link after payment
                verification.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StepPill({
  index,
  label,
  active,
  done,
}: {
  index: number;
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors",
          done
            ? "bg-success text-success-foreground"
            : active
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
        )}
      >
        {done ? <Check className="h-4 w-4" /> : index}
      </div>
      <span className={cn("text-sm font-semibold", active || done ? "text-foreground" : "text-muted-foreground")}>
        {label}
      </span>
    </div>
  );
}

function PaymentOption({
  selected,
  onSelect,
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-colors",
        selected ? "border-primary bg-accent/40" : "border-border hover:border-primary/30"
      )}
    >
      <button onClick={onSelect} className="flex w-full items-center gap-3 text-left">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg",
            selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="font-semibold">{title}</p>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded-full border-2",
            selected ? "border-primary bg-primary" : "border-border"
          )}
        >
          {selected && <Check className="h-3 w-3 text-primary-foreground" />}
        </div>
      </button>
      {children}
    </div>
  );
}

function BankRow({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy?: (text: string, label: string) => void;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex items-center gap-1.5">
        <p className="font-semibold">{value}</p>
        {onCopy && (
          <button onClick={() => onCopy(value, label)} className="text-muted-foreground hover:text-primary">
            <Copy className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
