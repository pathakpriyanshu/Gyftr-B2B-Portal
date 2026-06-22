"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, ArrowLeft, Mail, ShieldCheck, Sparkles, Gift, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion, type Variants } from "motion/react";
import { toast } from "sonner";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OtpInput } from "@/components/ui/otp-input";
import { InteractiveVoucherField } from "@/components/ui/interactive-voucher-field";
import { BrandOffersLoader, SuccessBurst } from "@/components/ui/brand-loader";
import { api, ApiClientError } from "@/lib/client/api";
import { sleep } from "@/lib/utils";

type Step = "email" | "otp";
type Overlay = null | "sending" | "verifying" | "success";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const FEATURES = [
  "Client-specific rate cards & real-time pricing",
  "Wallet & bank-transfer payments with audit trail",
  "OTP-secured Excel voucher delivery",
];

export function LoginClient() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const reduce = useReducedMotion();

  const [step, setStep] = React.useState<Step>("email");
  const [email, setEmail] = React.useState("");
  const [otp, setOtp] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [resendIn, setResendIn] = React.useState(0);
  const [overlay, setOverlay] = React.useState<Overlay>(null);

  // ── Animation variants ──────────────────────────────────────────
  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08, delayChildren: 0.08 } },
  };
  const fadeUp: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : 18 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
  };
  const pop: Variants = {
    hidden: { opacity: 0, scale: reduce ? 1 : 0.6 },
    show: {
      opacity: 1,
      scale: 1,
      transition: reduce ? { duration: 0.3 } : { type: "spring", stiffness: 420, damping: 16 },
    },
  };
  const lineReveal: Variants = {
    hidden: { y: reduce ? 0 : "115%" },
    show: { y: 0, transition: { duration: 0.8, ease: EASE } },
  };
  const stepV: Variants = {
    hidden: { opacity: 0, x: reduce ? 0 : 30 },
    show: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.45, ease: EASE, when: "beforeChildren", staggerChildren: 0.07, delayChildren: 0.05 },
    },
    exit: { opacity: 0, x: reduce ? 0 : -30, transition: { duration: 0.25, ease: EASE } },
  };

  React.useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  const requestOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setOverlay("sending");
    const started = Date.now();
    try {
      await api.post<{ ttlMinutes: number }>("/api/auth/request-otp", { email });
      const elapsed = Date.now() - started;
      if (elapsed < 1900) await sleep(1900 - elapsed); // let the offers reel breathe
      setStep("otp");
      setResendIn(30);
      setOverlay(null);
      toast.success("We've emailed you a one-time code.");
    } catch (err) {
      setOverlay(null);
      toast.error(err instanceof ApiClientError ? err.message : "Could not send OTP");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (code?: string) => {
    const value = code ?? otp;
    if (value.length < 4) return;
    setLoading(true);
    setOverlay("verifying");
    const started = Date.now();
    try {
      await api.post("/api/auth/verify-otp", { email, otp: value });
      const elapsed = Date.now() - started;
      if (elapsed < 1000) await sleep(1000 - elapsed);
      setOverlay("success");
      await sleep(1700); // celebrate, then enter the app
      router.push(next);
      router.refresh();
    } catch (err) {
      setOverlay(null);
      setLoading(false);
      toast.error(err instanceof ApiClientError ? err.message : "Verification failed");
      setOtp("");
    }
  };

  return (
    <>
      <div className="flex min-h-screen">
      {/* ── Left brand panel ── */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-brand-mesh p-12 text-white lg:flex">
        {/* Animated gradient orbs */}
        {!reduce && (
          <>
            <motion.div
              aria-hidden
              className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-brand-500/40 blur-3xl"
              animate={{ x: [0, 70, 0], y: [0, 50, 0], scale: [1, 1.18, 1] }}
              transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              aria-hidden
              className="pointer-events-none absolute right-[-6rem] top-1/4 h-72 w-72 rounded-full bg-brand-400/30 blur-3xl"
              animate={{ x: [0, -60, 0], y: [0, 70, 0], scale: [1, 1.25, 1] }}
              transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              aria-hidden
              className="pointer-events-none absolute bottom-[-9rem] left-1/4 h-96 w-96 rounded-full bg-secondary/60 blur-3xl"
              animate={{ x: [0, 50, 0], y: [0, -40, 0], scale: [1, 1.12, 1] }}
              transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
            />
          </>
        )}

        {/* Interactive constellation + voucher-coin game (login page only) */}
        <InteractiveVoucherField className="pointer-events-none absolute inset-0 z-0" />

        <motion.div className="relative z-10" initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}>
          <Logo invert tag />
        </motion.div>

        <motion.div className="relative z-10" variants={container} initial="hidden" animate="show">
          <motion.h1
            className="max-w-md text-4xl font-bold leading-tight text-balance"
            variants={container}
          >
            <span className="block overflow-hidden">
              <motion.span className="block" variants={lineReveal}>
                Bulk gift vouchers,
              </motion.span>
            </span>
            <span className="block overflow-hidden">
              <motion.span className="block" variants={lineReveal}>
                ordered in minutes.
              </motion.span>
            </span>
          </motion.h1>
          <motion.p className="mt-4 max-w-sm text-white/70" variants={fadeUp}>
            Order across 300+ brands, pay via wallet or bank transfer, and securely
            download vouchers for your team — all in one place.
          </motion.p>
          <motion.ul className="mt-8 space-y-3" variants={container}>
            {FEATURES.map((f) => (
              <motion.li key={f} className="flex items-center gap-3 text-sm text-white/90" variants={fadeUp}>
                <motion.span variants={pop} className="flex">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-300" />
                </motion.span>
                {f}
              </motion.li>
            ))}
          </motion.ul>
        </motion.div>

        <motion.p
          className="relative z-10 text-xs text-white/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          © {new Date().getFullYear()} Gyftr B2B Portal. All rights reserved.
        </motion.p>

        <motion.div
          className="absolute -bottom-10 -right-10"
          animate={reduce ? undefined : { rotate: [0, 8, 0], y: [0, -14, 0] }}
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
        >
          <Gift className="h-72 w-72 text-white/5" strokeWidth={1} />
        </motion.div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          <motion.div
            className="mb-8 lg:hidden"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <Logo />
          </motion.div>

          <AnimatePresence mode="wait" initial>
            {step === "email" ? (
              <motion.div key="email" variants={stepV} initial="hidden" animate="show" exit="exit">
                <motion.div className="mb-7" variants={container} initial="hidden" animate="show">
                  <motion.span
                    variants={pop}
                    className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-primary"
                  >
                    <Sparkles className="h-3.5 w-3.5" /> Corporate sign-in
                  </motion.span>
                  <motion.h2 variants={fadeUp} className="mt-4 text-2xl font-bold tracking-tight">
                    Sign in to your account
                  </motion.h2>
                  <motion.p variants={fadeUp} className="mt-1.5 text-sm text-muted-foreground">
                    Enter your work email and we'll send you a one-time code.
                  </motion.p>
                </motion.div>
                <motion.form onSubmit={requestOtp} className="space-y-4" variants={container} initial="hidden" animate="show">
                  <motion.div className="space-y-1.5" variants={fadeUp}>
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
                  </motion.div>
                  <motion.div variants={fadeUp}>
                    <Button type="submit" className="w-full" size="lg" loading={loading}>
                      Continue <ArrowRight className="h-4 w-4" />
                    </Button>
                  </motion.div>
                </motion.form>
                <motion.p
                  variants={fadeUp}
                  initial="hidden"
                  animate="show"
                  className="mt-6 rounded-lg border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground"
                >
                  <span className="font-semibold text-foreground">Demo accounts:</span>{" "}
                  admin@acme.test · finance@acme.test · procurement@acme.test. Enter the
                  one-time code we email you.
                </motion.p>
              </motion.div>
            ) : (
              <motion.div key="otp" variants={stepV} initial="hidden" animate="show" exit="exit">
                <motion.button
                  variants={fadeUp}
                  onClick={() => {
                    setStep("email");
                    setOtp("");
                  }}
                  className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </motion.button>
                <motion.div className="mb-7" variants={container} initial="hidden" animate="show">
                  <motion.div
                    variants={pop}
                    className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-primary"
                  >
                    <ShieldCheck className="h-6 w-6" />
                  </motion.div>
                  <motion.h2 variants={fadeUp} className="text-2xl font-bold tracking-tight">
                    Enter verification code
                  </motion.h2>
                  <motion.p variants={fadeUp} className="mt-1.5 text-sm text-muted-foreground">
                    We sent a code to <span className="font-semibold text-foreground">{email}</span>
                  </motion.p>
                </motion.div>
                <motion.div className="space-y-5" variants={container} initial="hidden" animate="show">
                  <motion.div variants={fadeUp}>
                    <OtpInput value={otp} onChange={setOtp} onComplete={(v) => verifyOtp(v)} />
                  </motion.div>
                  <motion.div variants={fadeUp}>
                    <Button
                      className="w-full"
                      size="lg"
                      loading={loading}
                      disabled={otp.length < 4}
                      onClick={() => verifyOtp()}
                    >
                      Verify & sign in
                    </Button>
                  </motion.div>
                  <motion.div variants={fadeUp} className="text-center text-sm text-muted-foreground">
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
                  </motion.div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      </div>

      <AnimatePresence>
        {overlay === "sending" && (
          <BrandOffersLoader key="sending" label="Sending your secure code" />
        )}
        {overlay === "verifying" && (
          <BrandOffersLoader key="verifying" label="Verifying & signing you in" />
        )}
        {overlay === "success" && <SuccessBurst key="success" />}
      </AnimatePresence>
    </>
  );
}
