import "server-only";
import { env } from "@/lib/env";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Sends a transactional email via the configured provider.
 * Defaults to console logging so the app works with zero config.
 */
export async function sendEmail(msg: EmailMessage): Promise<{ delivered: boolean }> {
  if (env.email.provider === "resend" && env.email.resendApiKey && !env.email.resendApiKey.includes("YOUR_")) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.email.resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: env.email.from,
          to: msg.to,
          subject: msg.subject,
          html: msg.html,
          text: msg.text,
        }),
      });
      return { delivered: res.ok };
    } catch {
      return { delivered: false };
    }
  }

  // console fallback
  // eslint-disable-next-line no-console
  console.log(
    `\n📧 [EMAIL → ${msg.to}] ${msg.subject}\n${msg.text ?? stripHtml(msg.html)}\n`
  );
  return { delivered: true };
}

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

// --------------------------------------------------------------------------
//  Templates
// --------------------------------------------------------------------------
function shell(title: string, body: string) {
  return `
  <div style="font-family:Inter,Arial,sans-serif;background:#f4f5f8;padding:32px">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #eceef2">
      <div style="background:#1a2552;padding:20px 28px">
        <span style="color:#fff;font-size:18px;font-weight:700;letter-spacing:.3px">Gy<span style="color:#e6007e">FTR</span> B2B</span>
      </div>
      <div style="padding:28px">
        <h1 style="font-size:18px;color:#1a2552;margin:0 0 12px">${title}</h1>
        ${body}
      </div>
      <div style="padding:16px 28px;background:#fafbfc;color:#8a93a6;font-size:12px;border-top:1px solid #eceef2">
        This is an automated message from the Gyftr B2B Voucher Portal.
      </div>
    </div>
  </div>`;
}

function otpBlock(otp: string) {
  return `<div style="font-size:30px;font-weight:700;letter-spacing:8px;color:#e6007e;background:#fdf2f8;border-radius:12px;padding:16px;text-align:center;margin:16px 0">${otp}</div>`;
}

export function loginOtpEmail(otp: string): { subject: string; html: string; text: string } {
  return {
    subject: `${otp} is your Gyftr B2B login code`,
    html: shell(
      "Sign in to Gyftr B2B",
      `<p style="color:#4a5169">Use the one-time code below to sign in. It expires in ${env.otp.ttlMinutes} minutes.</p>${otpBlock(otp)}<p style="color:#8a93a6;font-size:13px">If you didn't request this, you can ignore this email.</p>`
    ),
    text: `Your Gyftr B2B login code is ${otp}. It expires in ${env.otp.ttlMinutes} minutes.`,
  };
}

export function downloadLinkEmail(orderNumber: string, link: string) {
  return {
    subject: `Your Gyftr vouchers for order ${orderNumber} are ready`,
    html: shell(
      "Your gift vouchers are ready",
      `<p style="color:#4a5169">Payment for order <b>${orderNumber}</b> has been verified. Click below and verify the OTP to securely download your gift vouchers.</p>
       <a href="${link}" style="display:inline-block;background:#e6007e;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;margin:12px 0">Download vouchers</a>
       <p style="color:#8a93a6;font-size:13px">For security, you'll be asked to verify an OTP before downloading.</p>`
    ),
    text: `Your vouchers for order ${orderNumber} are ready. Download: ${link}`,
  };
}

export function downloadOtpEmail(otp: string) {
  return {
    subject: `${otp} is your voucher download code`,
    html: shell(
      "Verify to download vouchers",
      `<p style="color:#4a5169">Enter the code below to download your gift vouchers. It expires in ${env.otp.ttlMinutes} minutes.</p>${otpBlock(otp)}`
    ),
    text: `Your voucher download code is ${otp}.`,
  };
}

export function orderConfirmationEmail(orderNumber: string, amount: string) {
  return {
    subject: `Order ${orderNumber} received`,
    html: shell(
      "Order received",
      `<p style="color:#4a5169">We've received your order <b>${orderNumber}</b> for <b>${amount}</b>. We'll email you a secure download link once payment is verified.</p>`
    ),
    text: `Order ${orderNumber} for ${amount} received. We'll email a download link after verification.`,
  };
}
