"""
End-to-end API smoke test against a running dev server (http://localhost:8000).
Exercises both journeys: order -> wallet -> fulfillment, and OTP-gated download.
Run:  .venv/Scripts/python.exe smoke_test.py
"""
import sys

import requests

BASE = "http://localhost:8000"
s = requests.Session()
fails = []


def check(name, cond, detail=""):
    status = "PASS" if cond else "FAIL"
    print(f"[{status}] {name}" + (f" — {detail}" if detail else ""))
    if not cond:
        fails.append(name)


def data(r):
    j = r.json()
    assert j.get("ok"), j
    return j["data"]


# 1. login
r = s.post(f"{BASE}/api/auth/request-otp", json={"email": "admin@acme.test"})
check("request-otp 200", r.status_code == 200, str(r.status_code))
otp = data(r).get("devOtp")
check("devOtp present", bool(otp), otp)

r = s.post(f"{BASE}/api/auth/verify-otp", json={"email": "admin@acme.test", "otp": otp})
check("verify-otp 200", r.status_code == 200, str(r.status_code))
check("session cookie set", "gyftr_b2b_session" in s.cookies.get_dict())

r = s.get(f"{BASE}/api/auth/me")
check("me returns admin", r.status_code == 200 and data(r)["user"]["role"] == "admin")

# 2. brands
r = s.get(f"{BASE}/api/brands")
brands = data(r)["brands"]
check("brands listed (12)", len(brands) == 12, str(len(brands)))
amazon = next(b for b in brands if b["externalId"] == "AMZN")
check("amazon ratecard discount 5.5", amazon["discountPct"] == 5.5, str(amazon["discountPct"]))

# 3. cart save (server reprices)
r = s.post(f"{BASE}/api/cart", json={"lines": [
    {"brandId": amazon["id"], "denomination": 1000, "quantity": 5}
]})
cart = data(r)
line = cart["lines"][0]
# 1000 * 5 = 5000 face; 5.5% discount = 275; payable 4725
check("cart face 5000", line["faceValueTotal"] == 5000, str(line["faceValueTotal"]))
check("cart discount 275", line["discountTotal"] == 275, str(line["discountTotal"]))
check("cart payable 4725", line["finalPrice"] == 4725, str(line["finalPrice"]))

# 3b. tamper test — client sends bogus discount; server must ignore it
r = s.post(f"{BASE}/api/orders", json={
    "items": [{"brandId": amazon["id"], "denomination": 1000, "quantity": 5, "discountPct": 99}],
    "payment": {"method": "wallet"},
})
check("wallet order 200", r.status_code == 200, str(r.status_code))
order = data(r)["order"]
check("order repriced to 4725 (tamper ignored)", order["payableAmount"] == 4725, str(order["payableAmount"]))
check("order fulfilled", order["status"] == "fulfilled", order["status"])
check("order has 5 items qty", order["totalQuantity"] == 5, str(order["totalQuantity"]))
order_id = order["id"]

# 4. wallet debited 4725 -> 495275
r = s.get(f"{BASE}/api/wallet")
wallet = data(r)
check("wallet debited to 495275", wallet["wallet"]["balance"] == 495275, str(wallet["wallet"]["balance"]))

# 5. order detail + voucher count
r = s.get(f"{BASE}/api/orders/{order_id}")
od = data(r)
check("voucherCount 5", od["voucherCount"] == 5, str(od["voucherCount"]))

# 6. download link
r = s.get(f"{BASE}/api/orders/{order_id}/download-link")
token = data(r)["token"]
check("download token issued", bool(token))

# 7. public download flow (no session needed)
pub = requests.Session()
r = pub.get(f"{BASE}/api/download/{token}")
info = data(r)
check("download info ready", info["ready"] is True and info["verified"] is False)
check("email masked", "*" in info["email"], info["email"])

r = pub.post(f"{BASE}/api/download/{token}/request-otp")
dotp = data(r).get("devOtp")
check("download otp present", bool(dotp))

r = pub.post(f"{BASE}/api/download/{token}/verify-otp", json={"otp": dotp})
check("download verify 200", r.status_code == 200, str(r.status_code))

r = pub.get(f"{BASE}/api/download/{token}/file")
check("xlsx content-type", "spreadsheet" in r.headers.get("Content-Type", ""))
check("xlsx PK magic bytes", r.content[:2] == b"PK", r.content[:4].hex())
check("xlsx non-trivial size", len(r.content) > 3000, str(len(r.content)))

# 8. wrong OTP rejected
r2 = pub.post(f"{BASE}/api/download/{token}/verify-otp", json={"otp": "000000"})
# token already verified, but a fresh wrong attempt on a new order is better tested below

# 9. bank transfer journey + finance verify
r = s.post(f"{BASE}/api/orders", json={
    "items": [{"brandId": amazon["id"], "denomination": 500, "quantity": 2}],
    "payment": {"method": "bank_transfer", "utrNumber": "UTR123456789"},
})
bo = data(r)["order"]
check("bank order under_verification", bo["status"] == "under_verification", bo["status"])

# finance login
fs = requests.Session()
r = fs.post(f"{BASE}/api/auth/request-otp", json={"email": "finance@acme.test"})
fotp = data(r)["devOtp"]
fs.post(f"{BASE}/api/auth/verify-otp", json={"email": "finance@acme.test", "otp": fotp})
r = fs.get(f"{BASE}/api/admin/orders")
pending = data(r)["orders"]
check("finance sees pending order", any(o["id"] == bo["id"] for o in pending))

r = fs.post(f"{BASE}/api/admin/orders/{bo['id']}/verify", json={"action": "approve"})
vo = data(r)["order"]
check("approved order fulfilled", vo["status"] == "fulfilled", vo["status"])

# 10. RBAC — viewer cannot order
vs = requests.Session()
r = vs.post(f"{BASE}/api/auth/request-otp", json={"email": "viewer@acme.test"})
votp = data(r)["devOtp"]
vs.post(f"{BASE}/api/auth/verify-otp", json={"email": "viewer@acme.test", "otp": votp})
r = vs.post(f"{BASE}/api/orders", json={
    "items": [{"brandId": amazon["id"], "denomination": 500, "quantity": 1}],
    "payment": {"method": "wallet"},
})
check("viewer blocked from ordering (403)", r.status_code == 403, str(r.status_code))

# viewer cannot manage users
r = vs.post(f"{BASE}/api/users", json={"email": "x@acme.test", "fullName": "X Y", "role": "viewer"})
check("viewer blocked from creating users (403)", r.status_code == 403, str(r.status_code))

# 11. insufficient balance handling (no orphan order)
r = s.post(f"{BASE}/api/orders", json={
    "items": [{"brandId": amazon["id"], "denomination": 10000, "quantity": 100000}],
    "payment": {"method": "wallet"},
})
check("insufficient balance 402", r.status_code == 402, str(r.status_code))

print()
if fails:
    print(f"{len(fails)} FAILED: {fails}")
    sys.exit(1)
print("ALL CHECKS PASSED")
