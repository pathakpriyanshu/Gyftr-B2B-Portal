"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { CheckCircle2, Clock, Mail, ArrowRight, Receipt, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/ui/spinner";
import { EASE } from "@/components/ui/motion";

function Confirmation() {
  const params = useSearchParams();
  const orderId = params.get("order") ?? "";
  const orderNumber = params.get("number") ?? "";
  const status = params.get("status") ?? "under_verification";
  const verified = status === "verified";

  return (
    <motion.div
      className="mx-auto max-w-xl py-6"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
    >
      <Card className="overflow-hidden">
        <div
          className={`flex flex-col items-center px-6 pb-2 pt-10 text-center ${
            verified ? "bg-success/5" : "bg-accent/40"
          }`}
        >
          <div className="relative flex h-16 w-16 items-center justify-center">
            {verified &&
              Array.from({ length: 10 }).map((_, idx) => (
                <motion.span
                  key={idx}
                  className="absolute left-1/2 top-1/2 h-7 w-1 rounded-full bg-success/70"
                  style={{ rotate: `${idx * 36}deg`, transformOrigin: "50% 150%" }}
                  initial={{ scaleY: 0, opacity: 0 }}
                  animate={{ scaleY: [0, 1, 0], opacity: [0, 1, 0] }}
                  transition={{ duration: 0.7, delay: 0.25 + idx * 0.015, ease: "easeOut" }}
                />
              ))}
            <motion.div
              className={`flex h-16 w-16 items-center justify-center rounded-full ${
                verified ? "bg-success/15 text-success" : "bg-primary/15 text-primary"
              }`}
              initial={{ scale: 0, rotate: verified ? -90 : 0 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 15, delay: 0.1 }}
            >
              {verified ? <CheckCircle2 className="h-9 w-9" /> : <Clock className="h-9 w-9" />}
            </motion.div>
          </div>
          <motion.h1
            className="mt-4 text-2xl font-bold"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4, ease: EASE }}
          >
            {verified ? "Payment Received!" : "Order Submitted"}
          </motion.h1>
          <motion.p
            className="mt-1.5 max-w-sm text-sm text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.42, duration: 0.4 }}
          >
            {verified
              ? "Your wallet payment was successful and your vouchers are being prepared."
              : "Your order has been received and your payment is under verification."}
          </motion.p>
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
    </motion.div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Confirmation />
    </Suspense>
  );
}
