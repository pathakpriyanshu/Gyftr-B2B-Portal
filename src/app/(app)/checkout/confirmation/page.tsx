"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Clock, Mail, ArrowRight, Receipt, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/ui/spinner";

function Confirmation() {
  const params = useSearchParams();
  const orderId = params.get("order") ?? "";
  const orderNumber = params.get("number") ?? "";
  const status = params.get("status") ?? "under_verification";
  const verified = status === "verified";

  return (
    <div className="mx-auto max-w-xl py-6">
      <Card className="overflow-hidden">
        <div
          className={`flex flex-col items-center px-6 pb-2 pt-10 text-center ${
            verified ? "bg-success/5" : "bg-accent/40"
          }`}
        >
          <div
            className={`flex h-16 w-16 items-center justify-center rounded-full ${
              verified ? "bg-success/15 text-success" : "bg-primary/15 text-primary"
            }`}
          >
            {verified ? <CheckCircle2 className="h-9 w-9" /> : <Clock className="h-9 w-9" />}
          </div>
          <h1 className="mt-4 text-2xl font-bold">
            {verified ? "Payment Received!" : "Order Submitted"}
          </h1>
          <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
            {verified
              ? "Your wallet payment was successful and your vouchers are being prepared."
              : "Your order has been received and your payment is under verification."}
          </p>
        </div>

        <CardContent className="pt-6">
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Order ID</span>
              <span className="font-bold">{orderNumber}</span>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Payment Status</span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  verified ? "bg-success/12 text-success" : "bg-warning/15 text-amber-700"
                }`}
              >
                {verified ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                {verified ? "Payment Received" : "Under Verification"}
              </span>
            </div>
          </div>

          <div className="mt-5 flex items-start gap-3 rounded-xl bg-accent/40 p-4">
            <Mail className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <p className="text-sm text-foreground/80">
              A secure voucher download link will be shared via{" "}
              <span className="font-semibold">email</span>{" "}
              {verified ? "shortly" : "once your payment is verified"}. You'll verify an OTP to
              download your gift vouchers as an Excel file.
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href="/dashboard" className="flex-1">
              <Button variant="outline" className="w-full">
                Go to Dashboard
              </Button>
            </Link>
            <Link href={`/orders/${orderId}`} className="flex-1">
              <Button className="w-full">
                {verified ? (
                  <>
                    <Download className="h-4 w-4" /> View Order
                  </>
                ) : (
                  <>
                    <Receipt className="h-4 w-4" /> Track Order
                  </>
                )}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Confirmation />
    </Suspense>
  );
}
