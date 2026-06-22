"""Transactional email (console default, optional Resend) — mirrors `src/lib/email.ts`."""
import re
import sys

from django.conf import settings


def send_email(to: str, subject: str, html: str, text: str | None = None) -> dict:
    cfg = settings.APP["email"]
    key = cfg["resend_api_key"]
    if cfg["provider"] == "resend" and key and "YOUR_" not in key:
        try:
            import requests

            res = requests.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                json={"from": cfg["from"], "to": to, "subject": subject, "html": html, "text": text},
                timeout=20,
            )
            return {"delivered": res.ok}
        except Exception:
            return {"delivered": False}

    body = text or _strip_html(html)
    _safe_print(f"\n[EMAIL -> {to}] {subject}\n{body}\n")
    return {"delivered": True}


def _safe_print(msg: str) -> None:
    """Print without crashing on consoles (e.g. Windows cp1252) that can't
    encode unicode like the rupee sign."""
    enc = (getattr(sys.stdout, "encoding", None) or "utf-8")
    try:
        sys.stdout.write(msg + "\n")
    except UnicodeEncodeError:
        sys.stdout.write(msg.encode(enc, "replace").decode(enc) + "\n")
    # Flush so the message shows immediately on block-buffered consoles
    # (e.g. the VS Code integrated terminal, which isn't a TTY).
    sys.stdout.flush()


def _strip_html(html: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", html)).strip()


# --------------------------------------------------------------------------
#  Templates
# --------------------------------------------------------------------------
def _shell(title: str, body: str) -> str:
    return f"""
  <div style="font-family:Inter,Arial,sans-serif;background:#f4f5f8;padding:32px">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #eceef2">
      <div style="background:#1a2552;padding:20px 28px">
        <span style="color:#fff;font-size:18px;font-weight:700;letter-spacing:.3px">Gy<span style="color:#e6007e">FTR</span> B2B</span>
      </div>
      <div style="padding:28px">
        <h1 style="font-size:18px;color:#1a2552;margin:0 0 12px">{title}</h1>
        {body}
      </div>
      <div style="padding:16px 28px;background:#fafbfc;color:#8a93a6;font-size:12px;border-top:1px solid #eceef2">
        This is an automated message from the Gyftr B2B Voucher Portal.
      </div>
    </div>
  </div>"""


def _otp_block(otp: str) -> str:
    return (
        '<div style="font-size:30px;font-weight:700;letter-spacing:8px;color:#e6007e;'
        'background:#fdf2f8;border-radius:12px;padding:16px;text-align:center;margin:16px 0">'
        f"{otp}</div>"
    )


def login_otp_email(otp: str) -> dict:
    ttl = settings.APP["otp"]["ttl_minutes"]
    return {
        "subject": f"{otp} is your Gyftr B2B login code",
        "html": _shell(
            "Sign in to Gyftr B2B",
            f'<p style="color:#4a5169">Use the one-time code below to sign in. It expires in '
            f"{ttl} minutes.</p>{_otp_block(otp)}"
            '<p style="color:#8a93a6;font-size:13px">If you didn\'t request this, you can ignore this email.</p>',
        ),
        "text": f"Your Gyftr B2B login code is {otp}. It expires in {ttl} minutes.",
    }


def download_link_email(order_number: str, link: str) -> dict:
    return {
        "subject": f"Your Gyftr vouchers for order {order_number} are ready",
        "html": _shell(
            "Your gift vouchers are ready",
            f'<p style="color:#4a5169">Payment for order <b>{order_number}</b> has been verified. '
            "Click below and verify the OTP to securely download your gift vouchers.</p>"
            f'<a href="{link}" style="display:inline-block;background:#e6007e;color:#fff;'
            "text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;margin:12px 0\">"
            "Download vouchers</a>"
            '<p style="color:#8a93a6;font-size:13px">For security, you\'ll be asked to verify an OTP before downloading.</p>',
        ),
        "text": f"Your vouchers for order {order_number} are ready. Download: {link}",
    }


def download_otp_email(otp: str) -> dict:
    ttl = settings.APP["otp"]["ttl_minutes"]
    return {
        "subject": f"{otp} is your voucher download code",
        "html": _shell(
            "Verify to download vouchers",
            f'<p style="color:#4a5169">Enter the code below to download your gift vouchers. '
            f"It expires in {ttl} minutes.</p>{_otp_block(otp)}",
        ),
        "text": f"Your voucher download code is {otp}.",
    }


def order_confirmation_email(order_number: str, amount: str) -> dict:
    return {
        "subject": f"Order {order_number} received",
        "html": _shell(
            "Order received",
            f'<p style="color:#4a5169">We\'ve received your order <b>{order_number}</b> for '
            f"<b>{amount}</b>. We'll email you a secure download link once payment is verified.</p>",
        ),
        "text": f"Order {order_number} for {amount} received. We'll email a download link after verification.",
    }
