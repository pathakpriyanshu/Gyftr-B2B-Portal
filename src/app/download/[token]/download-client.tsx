"use client";

import * as React from "react";
import {
  ShieldCheck,
  Mail,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { OtpInput } from "@/components/ui/otp-input";
import { PageLoader } from "@/components/ui/spinner";
import { api, ApiClientError } from "@/lib/client/api";

interface Info {
  orderNumber: string;
  voucherCount: number;
  email: string;
  verified: boolean;
  ready: boolean;
}

type Stage = "landing" | "otp" | "done";

export function DownloadClient({ token }: { token: string }) {
  const [info, setInfo] = React.useState<Info | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [stage, setStage] = React.useState<Stage>("landing");
  const [otp, setOtp] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [resendIn, setResendIn] = React.useState(0);

  React.useEffect(() => {
    api
      .get<Info>(`/api/download/${token}`)
      .then((d) => {
        setInfo(d);
        if (d.verified) setStage("done");
      })
      .catch((e) => setError(e instanceof ApiClientError ? e.message : "Invalid link"));
  }, [token]);

  React.useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  const sendOtp = async () => {
    setSending(true);
    try {
      const d = await api.post<{ devOtp?: string }>(`/api/download/${token}/request-otp`);
      setStage("otp");
      setResendIn(30);
      if (d.devOtp) {
        toast.success(`OTP sent. Dev code: ${d.devOtp}`, { duration: 8000 });
        setOtp(d.devOtp);
      } else {
        toast.success("We've emailed you a verification code.");
      }
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Could not send OTP");
    } finally {
      setSending(false);
    }
  };

  const verify = async (code?: string) => {
    const value = code ?? otp;
    if (value.length < 4) return;
    setLoading(true);
    try {
      await api.post(`/api/download/${token}/verify-otp`, { otp: value });
      setStage("done");
      toast.success("Verified! Your download is ready.");
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "Verification failed");
      setOtp("");
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    window.location.href = `/api/download/${token}/file`;
  };

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-3xl items-center px-6">
          <Logo />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          {error ? (
            <Panel>
              <div className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                  <AlertTriangle className="h-7 w-7" />
                </div>
                <h1 className="mt-4 text-xl font-bold">Link unavailable</h1>
                <p className="mt-1.5 text-sm text-muted-foreground">{error}</p>
              </div>
            </Panel>
          ) : !info ? (
            <Panel>
              <PageLoader label="Loading your order…" />
            </Panel>
          ) : !info.ready ? (
            <Panel>
              <div className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-warning/15 text-amber-700">
                  <Lock className="h-7 w-7" />
                </div>
                <h1 className="mt-4 text-xl font-bold">Vouchers not ready yet</h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Order <b>{info.orderNumber}</b> is still being processed. We'll email you the
                  moment your vouchers are ready.
                </p>
              </div>
            </Panel>
          ) : stage === "landing" ? (
            <Panel>
              <div className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-primary">
                  <ShieldCheck className="h-7 w-7" />
                </div>
                <h1 className="mt-4 text-xl font-bold">Verify to download your vouchers</h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  For security, we'll send a one-time code to{" "}
                  <span className="font-semibold text-foreground">{info.email}</span> before you can
                  download.
                </p>
              </div>
              <OrderMeta orderNumber={info.orderNumber} count={info.voucherCount} />
              <Button className="mt-5 w-full" size="lg" onClick={sendOtp} loading={sending}>
                <Mail className="h-4 w-4" /> Send verification code
              </Button>
            </Panel>
          ) : stage === "otp" ? (
            <Panel>
              <div className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-primary">
                  <Mail className="h-7 w-7" />
                </div>
                <h1 className="mt-4 text-xl font-bold">Enter verification code</h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Sent to <span className="font-semibold text-foreground">{info.email}</span>
                </p>
              </div>
              <div className="mt-6 flex flex-col items-center gap-5">
                <OtpInput value={otp} onChange={setOtp} onComplete={(v) => verify(v)} />
                <Button className="w-full" size="lg" loading={loading} disabled={otp.length < 4} onClick={() => verify()}>
                  Verify & continue
                </Button>
                <div className="text-sm text-muted-foreground">
                  {resendIn > 0 ? (
                    <span>Resend code in {resendIn}s</span>
                  ) : (
                    <button onClick={sendOtp} className="font-semibold text-primary hover:underline">
                      Resend code
                    </button>
                  )}
                </div>
              </div>
            </Panel>
          ) : (
            <Panel>
              <div className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <h1 className="mt-4 text-xl font-bold">Payment Verified</h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Your gift vouchers are ready to download.
                </p>
              </div>
              <OrderMeta orderNumber={info.orderNumber} count={info.voucherCount} />
              <Button className="mt-5 w-full" size="lg" onClick={download}>
                <Download className="h-4 w-4" /> Download Gift Vouchers (.xlsx)
              </Button>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                The file contains voucher codes &amp; PINs. Keep it secure.
              </p>
            </Panel>
          )}

          <p className="mt-6 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} Gyftr B2B Portal
          </p>
        </div>
      </main>
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-7 card-shadow-lg">{children}</div>
  );
}

function OrderMeta({ orderNumber, count }: { orderNumber: string; count: number }) {
  return (
    <div className="mt-5 flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success">
        <FileSpreadsheet className="h-5 w-5" />
      </div>
      <div className="text-sm">
        <p className="font-semibold">{orderNumber}</p>
        <p className="text-muted-foreground">{count} vouchers · Excel (.xlsx)</p>
      </div>
    </div>
  );
}
