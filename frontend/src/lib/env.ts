/**
 * Centralised, typed access to environment variables.
 * Server-only values throw if read in the browser.
 */

function required(name: string, value: string | undefined): string {
  if (!value || value.trim() === "") {
    // In mock mode we tolerate missing external creds; callers that truly
    // need a value should validate at the point of use.
    return "";
  }
  return value;
}

const isServer = typeof window === "undefined";

export const env = {
  appName: process.env.NEXT_PUBLIC_APP_NAME || "Gyftr B2B Portal",
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",

  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    get serviceRoleKey() {
      if (!isServer) throw new Error("serviceRoleKey is server-only");
      return process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    },
    paymentProofBucket: process.env.SUPABASE_PAYMENT_PROOF_BUCKET || "payment-proofs",
    voucherFileBucket: process.env.SUPABASE_VOUCHER_FILE_BUCKET || "voucher-files",
  },

  auth: {
    get jwtSecret() {
      if (!isServer) throw new Error("jwtSecret is server-only");
      return process.env.AUTH_JWT_SECRET || "dev_only_insecure_secret_change_me_now_000000";
    },
    cookieName: process.env.SESSION_COOKIE_NAME || "gyftr_b2b_session",
    sessionTtlHours: Number(process.env.SESSION_TTL_HOURS || 12),
  },

  otp: {
    length: Number(process.env.OTP_LENGTH || 6),
    ttlMinutes: Number(process.env.OTP_TTL_MINUTES || 5),
    resendCooldownSeconds: Number(process.env.OTP_RESEND_COOLDOWN_SECONDS || 30),
    devMode: (process.env.OTP_DEV_MODE || "true") === "true",
  },

  email: {
    provider: (process.env.EMAIL_PROVIDER || "console") as "console" | "resend" | "smtp",
    from: process.env.EMAIL_FROM || "Gyftr B2B <no-reply@gyftr.net>",
    resendApiKey: process.env.RESEND_API_KEY || "",
  },

  gyftr: {
    baseUrl: process.env.GYFTR_API_BASE_URL || "",
    apiKey: process.env.GYFTR_API_KEY || "",
    catalogEndpoint: process.env.GYFTR_CATALOG_ENDPOINT || "/catalog/brands",
    sendVoucherEndpoint: process.env.GYFTR_SEND_VOUCHER_ENDPOINT || "/voucher/issue",
    useMock:
      (process.env.GYFTR_USE_MOCK || "true") === "true" ||
      !process.env.GYFTR_API_KEY ||
      process.env.GYFTR_API_KEY === "YOUR_GYFTR_API_KEY",
  },

  bank: {
    accountName: process.env.PAYMENT_BANK_ACCOUNT_NAME || "GYFTR pvt. Ltd.",
    accountNumber: process.env.PAYMENT_BANK_ACCOUNT_NUMBER || "000111222333444",
    ifsc: process.env.PAYMENT_BANK_IFSC || "HDFC0000001",
    bankName: process.env.PAYMENT_BANK_NAME || "HDFC Bank",
    branch: process.env.PAYMENT_BANK_BRANCH || "Gurugram",
  },
};

/** True when Supabase credentials look real (not placeholder). */
export function hasSupabaseConfig(): boolean {
  const { url, anonKey } = env.supabase;
  return (
    !!url &&
    url.startsWith("http") &&
    !url.includes("YOUR_") &&
    !!anonKey &&
    !anonKey.includes("YOUR_")
  );
}

export { required };
