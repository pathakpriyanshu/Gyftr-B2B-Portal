import "server-only";
import crypto from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { money } from "@/lib/utils";
import type {
  AppUser,
  Brand,
  CartLine,
  Client,
  Order,
  OrderItem,
  Voucher,
  WalletTransaction,
} from "@/types";
import type {
  Backend,
  CreateOrderInput,
  DashboardStats,
  DownloadTokenRow,
  LoginOtpRow,
  NewVoucher,
  WalletState,
} from "./types";

const now = () => new Date().toISOString();

// ---- row mappers ---------------------------------------------------------
type Row = Record<string, any>;
const mapClient = (r: Row): Client => ({
  id: r.id,
  name: r.name,
  legalName: r.legal_name,
  logoUrl: r.logo_url,
  gstNumber: r.gst_number,
  status: r.status,
  allowWallet: r.allow_wallet,
  allowBankTransfer: r.allow_bank_transfer,
});
const mapUser = (r: Row): AppUser => ({
  id: r.id,
  clientId: r.client_id,
  email: r.email,
  fullName: r.full_name,
  phone: r.phone,
  role: r.role,
  status: r.status,
  lastLoginAt: r.last_login_at,
  createdAt: r.created_at,
});
const mapOrder = (r: Row, items?: OrderItem[]): Order => ({
  id: r.id,
  orderNumber: r.order_number,
  clientId: r.client_id,
  userId: r.user_id,
  status: r.status,
  totalFaceValue: Number(r.total_face_value),
  totalDiscount: Number(r.total_discount),
  payableAmount: Number(r.payable_amount),
  totalQuantity: r.total_quantity,
  paymentMethod: r.payment_method,
  paymentStatus: r.payment_status,
  paymentProofUrl: r.payment_proof_url,
  utrNumber: r.utr_number,
  paymentSubmittedAt: r.payment_submitted_at,
  paymentVerifiedAt: r.payment_verified_at,
  rejectionReason: r.rejection_reason,
  createdAt: r.created_at,
  items,
});
const mapItem = (r: Row): OrderItem => ({
  id: r.id,
  brandId: r.brand_id,
  brandName: r.brand_name,
  brandLogoUrl: r.brand_logo_url,
  denomination: Number(r.denomination),
  quantity: r.quantity,
  discountPct: Number(r.discount_pct),
  faceValueTotal: Number(r.face_value_total),
  discountTotal: Number(r.discount_total),
  finalPrice: Number(r.final_price),
});
const mapTxn = (r: Row): WalletTransaction => ({
  id: r.id,
  type: r.type,
  amount: Number(r.amount),
  balanceAfter: Number(r.balance_after),
  reference: r.reference,
  description: r.description,
  createdAt: r.created_at,
});
const mapToken = (r: Row): DownloadTokenRow => ({
  id: r.id,
  orderId: r.order_id,
  token: r.token,
  email: r.email,
  otpHash: r.otp_hash,
  otpExpiresAt: r.otp_expires_at,
  otpSentAt: r.otp_sent_at,
  attempts: r.attempts,
  verified: r.verified,
  verifiedAt: r.verified_at,
  createdAt: r.created_at,
});

export const supabaseBackend: Backend = {
  name: "supabase",

  async init() {
    /* schema is managed via supabase/schema.sql */
  },

  // --- clients & users ---
  async getClientById(id) {
    const { data } = await supabaseAdmin().from("clients").select("*").eq("id", id).maybeSingle();
    return data ? mapClient(data) : null;
  },
  async getUserByEmail(email) {
    const { data } = await supabaseAdmin()
      .from("users")
      .select("*")
      .ilike("email", email)
      .maybeSingle();
    return data ? mapUser(data) : null;
  },
  async getUserById(id) {
    const { data } = await supabaseAdmin().from("users").select("*").eq("id", id).maybeSingle();
    return data ? mapUser(data) : null;
  },
  async listUsersByClient(clientId) {
    const { data } = await supabaseAdmin()
      .from("users")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: true });
    return (data ?? []).map(mapUser);
  },
  async createUser(input) {
    const { data, error } = await supabaseAdmin()
      .from("users")
      .insert({
        client_id: input.clientId,
        email: input.email.toLowerCase(),
        full_name: input.fullName,
        phone: input.phone ?? null,
        role: input.role,
        status: input.status ?? "active",
      })
      .select("*")
      .single();
    if (error) throw error;
    return mapUser(data);
  },
  async updateUser(id, patch) {
    const payload: Record<string, unknown> = {};
    if (patch.fullName !== undefined) payload.full_name = patch.fullName;
    if (patch.phone !== undefined) payload.phone = patch.phone;
    if (patch.role !== undefined) payload.role = patch.role;
    if (patch.status !== undefined) payload.status = patch.status;
    const { data } = await supabaseAdmin()
      .from("users")
      .update(payload)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    return data ? mapUser(data) : null;
  },
  async touchUserLogin(id) {
    await supabaseAdmin().from("users").update({ last_login_at: now() }).eq("id", id);
  },

  // --- login otp ---
  async createLoginOtp(email, otpHash, expiresAt) {
    const { data, error } = await supabaseAdmin()
      .from("login_otps")
      .insert({ email: email.toLowerCase(), otp_hash: otpHash, expires_at: expiresAt })
      .select("*")
      .single();
    if (error) throw error;
    return {
      id: data.id,
      email: data.email,
      otpHash: data.otp_hash,
      expiresAt: data.expires_at,
      attempts: data.attempts,
      consumed: data.consumed,
      createdAt: data.created_at,
    };
  },
  async getLatestLoginOtp(email) {
    const { data } = await supabaseAdmin()
      .from("login_otps")
      .select("*")
      .ilike("email", email)
      .eq("consumed", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return null;
    return {
      id: data.id,
      email: data.email,
      otpHash: data.otp_hash,
      expiresAt: data.expires_at,
      attempts: data.attempts,
      consumed: data.consumed,
      createdAt: data.created_at,
    };
  },
  async bumpLoginOtpAttempts(id) {
    const { data } = await supabaseAdmin()
      .from("login_otps")
      .select("attempts")
      .eq("id", id)
      .maybeSingle();
    await supabaseAdmin()
      .from("login_otps")
      .update({ attempts: (data?.attempts ?? 0) + 1 })
      .eq("id", id);
  },
  async consumeLoginOtp(id) {
    await supabaseAdmin().from("login_otps").update({ consumed: true }).eq("id", id);
  },

  // --- wallet ---
  async getWallet(clientId): Promise<WalletState> {
    const { data } = await supabaseAdmin()
      .from("wallets")
      .select("*")
      .eq("client_id", clientId)
      .maybeSingle();
    return {
      clientId,
      balance: data ? Number(data.balance) : 0,
      currency: data?.currency ?? "INR",
    };
  },
  async listWalletTransactions(clientId, limit = 100) {
    const { data } = await supabaseAdmin()
      .from("wallet_transactions")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data ?? []).map(mapTxn);
  },
  async debitWallet(clientId, amount, reference, description, userId) {
    const sb = supabaseAdmin();
    const { data: w } = await sb.from("wallets").select("*").eq("client_id", clientId).maybeSingle();
    if (!w) throw new Error("Wallet not found");
    if (Number(w.balance) < amount) throw new Error("INSUFFICIENT_BALANCE");
    const newBalance = money(Number(w.balance) - amount);
    await sb.from("wallets").update({ balance: newBalance, updated_at: now() }).eq("client_id", clientId);
    const { data, error } = await sb
      .from("wallet_transactions")
      .insert({
        client_id: clientId,
        type: "debit",
        amount: money(amount),
        balance_after: newBalance,
        reference,
        description,
        created_by: userId ?? null,
      })
      .select("*")
      .single();
    if (error) throw error;
    return mapTxn(data);
  },
  async creditWallet(clientId, amount, reference, description, type = "credit", userId) {
    const sb = supabaseAdmin();
    const { data: w } = await sb.from("wallets").select("*").eq("client_id", clientId).maybeSingle();
    if (!w) throw new Error("Wallet not found");
    const newBalance = money(Number(w.balance) + amount);
    await sb.from("wallets").update({ balance: newBalance, updated_at: now() }).eq("client_id", clientId);
    const { data, error } = await sb
      .from("wallet_transactions")
      .insert({
        client_id: clientId,
        type,
        amount: money(amount),
        balance_after: newBalance,
        reference,
        description,
        created_by: userId ?? null,
      })
      .select("*")
      .single();
    if (error) throw error;
    return mapTxn(data);
  },

  // --- catalog ---
  async listBrandsForClient(clientId) {
    const sb = supabaseAdmin();
    const [{ data: brands }, { data: denoms }, { data: rates }] = await Promise.all([
      sb.from("brands").select("*").eq("status", "active").order("sort_order"),
      sb.from("denominations").select("brand_id, face_value").eq("status", "active"),
      sb.from("ratecards").select("brand_id, discount_pct").eq("client_id", clientId),
    ]);
    const rateMap = new Map<string, number>(
      (rates ?? []).map((r) => [r.brand_id, Number(r.discount_pct)])
    );
    const denomMap = new Map<string, number[]>();
    for (const d of denoms ?? []) {
      const arr = denomMap.get(d.brand_id) ?? [];
      arr.push(Number(d.face_value));
      denomMap.set(d.brand_id, arr);
    }
    return (brands ?? []).map((b): Brand => ({
      id: b.id,
      externalId: b.external_id,
      name: b.name,
      slug: b.slug,
      category: b.category,
      logoUrl: b.logo_url,
      description: b.description,
      terms: b.terms,
      defaultDiscountPct: Number(b.default_discount_pct),
      status: b.status,
      denominations: (denomMap.get(b.id) ?? []).sort((a, c) => a - c),
      discountPct: rateMap.has(b.id) ? rateMap.get(b.id)! : Number(b.default_discount_pct),
    }));
  },
  async getBrandForClient(clientId, brandId) {
    const all = await this.listBrandsForClient(clientId);
    return all.find((b) => b.id === brandId) ?? null;
  },

  // --- cart ---
  async getCart(userId) {
    const sb = supabaseAdmin();
    const { data: cart } = await sb.from("carts").select("id").eq("user_id", userId).maybeSingle();
    if (!cart) return [];
    const { data: items } = await sb
      .from("cart_items")
      .select("*, brands(name, logo_url)")
      .eq("cart_id", cart.id);
    return (items ?? []).map((it: Row): CartLine => {
      const faceValueTotal = Number(it.denomination) * it.quantity;
      const discountTotal = money((faceValueTotal * Number(it.discount_pct)) / 100);
      return {
        brandId: it.brand_id,
        brandName: it.brands?.name ?? "",
        brandLogoUrl: it.brands?.logo_url ?? null,
        denomination: Number(it.denomination),
        quantity: it.quantity,
        discountPct: Number(it.discount_pct),
        faceValueTotal,
        discountTotal,
        finalPrice: money(faceValueTotal - discountTotal),
      };
    });
  },
  async saveCart(userId, clientId, lines) {
    const sb = supabaseAdmin();
    let { data: cart } = await sb.from("carts").select("id").eq("user_id", userId).maybeSingle();
    if (!cart) {
      const ins = await sb
        .from("carts")
        .insert({ user_id: userId, client_id: clientId })
        .select("id")
        .single();
      cart = ins.data;
    }
    await sb.from("cart_items").delete().eq("cart_id", cart!.id);
    if (lines.length) {
      await sb.from("cart_items").insert(
        lines.map((l) => ({
          cart_id: cart!.id,
          brand_id: l.brandId,
          denomination: l.denomination,
          quantity: l.quantity,
          discount_pct: l.discountPct,
        }))
      );
    }
    await sb.from("carts").update({ updated_at: now() }).eq("id", cart!.id);
  },
  async clearCart(userId) {
    const sb = supabaseAdmin();
    const { data: cart } = await sb.from("carts").select("id").eq("user_id", userId).maybeSingle();
    if (cart) await sb.from("cart_items").delete().eq("cart_id", cart.id);
  },

  // --- orders ---
  async createOrder(input: CreateOrderInput) {
    const sb = supabaseAdmin();
    const year = new Date().getFullYear();
    const orderNumber = `GYF${year}${Date.now().toString().slice(-6)}`;
    const { data: order, error } = await sb
      .from("orders")
      .insert({
        order_number: orderNumber,
        client_id: input.clientId,
        user_id: input.userId,
        status: "pending_payment",
        total_face_value: input.totalFaceValue,
        total_discount: input.totalDiscount,
        payable_amount: input.payableAmount,
        total_quantity: input.totalQuantity,
        payment_status: "unpaid",
      })
      .select("*")
      .single();
    if (error) throw error;
    const itemsPayload = input.items.map((it) => ({
      order_id: order.id,
      brand_id: it.brandId,
      brand_name: it.brandName,
      brand_logo_url: it.brandLogoUrl,
      denomination: it.denomination,
      quantity: it.quantity,
      discount_pct: it.discountPct,
      face_value_total: it.faceValueTotal,
      discount_total: it.discountTotal,
      final_price: it.finalPrice,
    }));
    const { data: items } = await sb.from("order_items").insert(itemsPayload).select("*");
    return mapOrder(order, (items ?? []).map(mapItem));
  },
  async getOrderById(id) {
    const sb = supabaseAdmin();
    const { data: order } = await sb.from("orders").select("*").eq("id", id).maybeSingle();
    if (!order) return null;
    const { data: items } = await sb.from("order_items").select("*").eq("order_id", id);
    return mapOrder(order, (items ?? []).map(mapItem));
  },
  async getOrderByNumber(orderNumber) {
    const sb = supabaseAdmin();
    const { data: order } = await sb
      .from("orders")
      .select("*")
      .eq("order_number", orderNumber)
      .maybeSingle();
    if (!order) return null;
    const { data: items } = await sb.from("order_items").select("*").eq("order_id", order.id);
    return mapOrder(order, (items ?? []).map(mapItem));
  },
  async listOrders(clientId, limit = 100) {
    const { data } = await supabaseAdmin()
      .from("orders")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data ?? []).map((o) => mapOrder(o));
  },
  async updateOrder(id, patch) {
    const payload: Record<string, unknown> = {};
    const map: Record<string, string> = {
      status: "status",
      paymentMethod: "payment_method",
      paymentStatus: "payment_status",
      paymentProofUrl: "payment_proof_url",
      utrNumber: "utr_number",
      paymentSubmittedAt: "payment_submitted_at",
      paymentVerifiedAt: "payment_verified_at",
      verifiedBy: "verified_by",
      rejectionReason: "rejection_reason",
    };
    for (const [k, v] of Object.entries(patch)) {
      if (map[k]) payload[map[k]] = v;
    }
    const { data } = await supabaseAdmin()
      .from("orders")
      .update(payload)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    return data ? mapOrder(data) : null;
  },
  async getDashboardStats(clientId) {
    const sb = supabaseAdmin();
    const [{ data: w }, { data: orders }] = await Promise.all([
      sb.from("wallets").select("*").eq("client_id", clientId).maybeSingle(),
      sb
        .from("orders")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false }),
    ]);
    const list = orders ?? [];
    const stats: DashboardStats = {
      walletBalance: w ? Number(w.balance) : 0,
      walletCurrency: w?.currency ?? "INR",
      totalOrders: list.length,
      pendingOrders: list.filter((o) =>
        ["pending_payment", "under_verification", "processing", "paid"].includes(o.status)
      ).length,
      fulfilledOrders: list.filter((o) => o.status === "fulfilled").length,
      lastOrder: list[0] ? mapOrder(list[0]) : null,
    };
    return stats;
  },

  // --- vouchers ---
  async createVouchers(orderId, vouchers: NewVoucher[]) {
    await supabaseAdmin()
      .from("vouchers")
      .insert(
        vouchers.map((v) => ({
          order_id: orderId,
          order_item_id: v.orderItemId,
          brand_id: v.brandId,
          brand_name: v.brandName,
          denomination: v.denomination,
          code: v.code,
          pin: v.pin,
          expiry_date: v.expiryDate,
          status: "issued",
        }))
      );
  },
  async listVouchers(orderId) {
    const { data } = await supabaseAdmin()
      .from("vouchers")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });
    return (data ?? []).map((v): Voucher => ({
      id: v.id,
      brandName: v.brand_name,
      denomination: Number(v.denomination),
      code: v.code,
      pin: v.pin,
      expiryDate: v.expiry_date,
      status: v.status,
    }));
  },

  // --- voucher download tokens ---
  async getOrCreateDownloadToken(orderId, email) {
    const sb = supabaseAdmin();
    const { data: existing } = await sb
      .from("voucher_download_tokens")
      .select("*")
      .eq("order_id", orderId)
      .maybeSingle();
    if (existing) return mapToken(existing);
    const { data, error } = await sb
      .from("voucher_download_tokens")
      .insert({ order_id: orderId, token: crypto.randomBytes(24).toString("base64url"), email })
      .select("*")
      .single();
    if (error) throw error;
    return mapToken(data);
  },
  async getDownloadTokenByToken(token) {
    const { data } = await supabaseAdmin()
      .from("voucher_download_tokens")
      .select("*")
      .eq("token", token)
      .maybeSingle();
    return data ? mapToken(data) : null;
  },
  async setDownloadOtp(id, otpHash, expiresAt) {
    await supabaseAdmin()
      .from("voucher_download_tokens")
      .update({ otp_hash: otpHash, otp_expires_at: expiresAt, otp_sent_at: now(), attempts: 0 })
      .eq("id", id);
  },
  async bumpDownloadAttempts(id) {
    const { data } = await supabaseAdmin()
      .from("voucher_download_tokens")
      .select("attempts")
      .eq("id", id)
      .maybeSingle();
    await supabaseAdmin()
      .from("voucher_download_tokens")
      .update({ attempts: (data?.attempts ?? 0) + 1 })
      .eq("id", id);
  },
  async markDownloadVerified(id) {
    await supabaseAdmin()
      .from("voucher_download_tokens")
      .update({ verified: true, verified_at: now() })
      .eq("id", id);
  },

  // --- audit ---
  async audit(input) {
    await supabaseAdmin().from("audit_logs").insert({
      client_id: input.clientId ?? null,
      user_id: input.userId ?? null,
      action: input.action,
      entity: input.entity ?? null,
      entity_id: input.entityId ?? null,
      metadata: input.metadata ?? null,
    });
  },
};
