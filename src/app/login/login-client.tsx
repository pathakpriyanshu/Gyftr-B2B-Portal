"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, ArrowLeft, Mail, ShieldCheck, Sparkles, Gift, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OtpInput } from "@/components/ui/otp-input";
import { api, ApiClientError } from "@/lib/client/api";

type Step = "email" | "otp";

export function LoginClient() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";

  const [step, setStep] = React.useState<Step>("email");
  const [email, setEmail] = React.useState("");
  const [otp, setOtp] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [resendIn, setResendIn] = React.useState(0);

  React.useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  const requestOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const data = await api.post<{ devOtp?: string; ttlMinutes: number }>(
        "/api/auth/request-otp",
        { email }
      );
      setStep("otp");
      setResendIn(30);
      if (data.devOtp) {
        toast.success(`OTP sent. Dev code: ${data.devOtp}`, { duration: 8000 });
        setOtp(data.devOtp);
      } else {
        toast.success("We've emailed you a one-time code.");
      }
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Could not send OTP");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (code?: string) => {
    const value = code ?? otp;
    if (value.length < 4) return;
    setLoading(true);
    try {
      await api.post("/api/auth/verify-otp", { email, otp: value });
      toast.success("Welcome back!");
      router.push(next);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Verification failed");
      setOtp("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left brand panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-brand-mesh p-12 text-white lg:flex">
        <Logo invert tag />
        <div className="relative z-10">
          <h1 className="max-w-md text-4xl font-bold leading-tight text-balance">
            Bulk gift vouchers,<br />ordered in minutes.
          </h1>
          <p className="mt-4 max-w-sm text-white/70">
            Order across 300+ brands, pay via wallet or bank transfer, and securely
            download vouchers for your team — all in one place.
          </p>
          <ul className="mt-8 space-y-3">
            {[
              "Client-specific rate cards & real-time pricing",
              "Wallet & bank-transfer payments with audit trail",
              "OTP-secured Excel voucher delivery",
            ].map((f) => (
              <li key={f} className="flex items-center gap-3 text-sm text-white/90">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-300" />
                {f}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative z-10 text-xs text-white/50">
          © {new Date().getFullYear()} Gyftr B2B Portal. All rights reserved.
        </p>
        <Gift className="absolute -bottom-10 -right-10 h-72 w-72 text-white/5" strokeWidth={1} />
      </div>

      {/* Right form panel */}
      <div className="flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>

          {step === "email" ? (
            <>
              <div className="mb-7">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-primary">
                  <Sparkles className="h-3.5 w-3.5" /> Corporate sign-in
                </span>
                <h2 className="mt-4 text-2xl font-bold tracking-tight">Sign in to your account</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Enter your work email and we'll send you a one-time code.
                </p>
              </div>
              <form onSubmit={requestOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Work email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      autoFocus
                      placeholder="you@company.com"
                      className="pl-10"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" size="lg" loading={loading}>
                  Continue <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
              <p className="mt-6 rounded-lg border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Demo accounts:</span>{" "}
                admin@acme.test · finance@acme.test · procurement@acme.test. The OTP is shown
                on screen in demo mode.
              </p>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setStep("email");
                  setOtp("");
                }}
                className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <div className="mb-7">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-primary">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight">Enter verification code</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  We sent a code to <span className="font-semibold text-foreground">{email}</span>
                </p>
              </div>
              <div className="space-y-5">
                <OtpInput value={otp} onChange={setOtp} onComplete={(v) => verifyOtp(v)} />
                <Button
                  className="w-full"
                  size="lg"
                  loading={loading}
                  disabled={otp.length < 4}
                  onClick={() => verifyOtp()}
                >
                  Verify & sign in
                </Button>
                <div className="text-center text-sm text-muted-foreground">
                  Didn't get it?{" "}
                  {resendIn > 0 ? (
                    <span>Resend in {resendIn}s</span>
                  ) : (
                    <button
                      onClick={() => requestOtp()}
                      className="font-semibold text-primary hover:underline"
                    >
                      Resend code
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
