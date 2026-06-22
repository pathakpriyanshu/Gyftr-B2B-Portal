import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

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
import { money } from "@/lib/utils";
import type {
  Backend,
  CreateOrderInput,
  DashboardStats,
  DownloadTokenRow,
  LoginOtpRow,
  NewVoucher,
  WalletState,
} from "./types";

// ---------------------------------------------------------------------------
//  Internal row shapes (camelCase mirror of the SQL schema)
// ---------------------------------------------------------------------------
interface BrandRow {
  id: string;
  externalId: string | null;
  name: string;
  slug: string | null;
  category: string | null;
  logoUrl: string | null;
  description: string | null;
  terms: string | null;
  defaultDiscountPct: number;
  status: string;
  sortOrder: number;
  denominations: number[];
}
interface RatecardRow {
  clientId: string;
  brandId: string;
  discountPct: number;
}
interface WalletRow {
  clientId: string;
  balance: number;
  currency: string;
}
interface WalletTxnRow extends WalletTransaction {
  clientId: string;
}
interface CartRow {
  userId: string;
  clientId: string;
  lines: CartLine[];
  updatedAt: string;
}
interface OrderRow extends Order {}
interface VoucherRow extends Voucher {
  orderId: string;
  brandId: string | null;
  orderItemId: string | null;
}

interface DB {
  clients: Client[];
  users: AppUser[];
  wallets: WalletRow[];
  walletTxns: WalletTxnRow[];
  brands: BrandRow[];
  ratecards: RatecardRow[];
  carts: CartRow[];
  orders: OrderRow[];
  vouchers: VoucherRow[];
  loginOtps: LoginOtpRow[];
  downloadTokens: DownloadTokenRow[];
  audit: Array<Record<string, unknown>>;
  seq: number;
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "db.json");
const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

// ---------------------------------------------------------------------------
//  Seed data (mirrors supabase/seed.sql)
// ---------------------------------------------------------------------------
const DEMO_CLIENT_ID = "11111111-1111-1111-1111-111111111111";

function seedBrands(): BrandRow[] {
  const denoms = [250, 500, 1000, 2000, 5000, 10000];
  const raw: Array<[string, string, string, string, string, number]> = [
    ["AMZN", "Amazon Shopping", "amazon", "E-commerce", "amazon.in", 4.0],
    ["FLPK", "Flipkart", "flipkart", "E-commerce", "flipkart.com", 3.5],
    ["MYNT", "Myntra", "myntra", "Fashion", "myntra.com", 6.0],
    ["SWGY", "Swiggy", "swiggy", "Food", "swiggy.com", 5.0],
    ["ZOMT", "Zomato", "zomato", "Food", "zomato.com", 5.0],
    ["BMS", "BookMyShow", "bookmyshow", "Entertainment", "bookmyshow.com", 7.0],
    ["TAJ", "Taj Experiences", "taj", "Travel", "tajhotels.com", 8.0],
    ["UBER", "Uber", "uber", "Travel", "uber.com", 4.5],
    ["CROMA", "Croma", "croma", "Electronics", "croma.com", 3.0],
    ["NYKA", "Nykaa", "nykaa", "Beauty", "nykaa.com", 6.5],
    ["PVR", "PVR Cinemas", "pvr", "Entertainment", "pvrcinemas.com", 7.0],
    ["LIFE", "Lifestyle", "lifestyle", "Fashion", "lifestylestores.com", 6.0],
  ];
  return raw.map(([ext, name, slug, category, domain, disc], i) => ({
    id: `21111111-0000-0000-0000-0000000000${String(i + 1).padStart(2, "0")}`,
    externalId: ext,
    name,
    slug,
    category,
    logoUrl: `https://logo.clearbit.com/${domain}`,
    description: `${name} gift vouchers — redeemable across ${name} platforms.`,
    terms: "Valid for 12 months from date of issue. Not redeemable for cash.",
    defaultDiscountPct: disc,
    status: "active",
    sortOrder: i + 1,
    denominations: denoms,
  }));
}

function seed(): DB {
  const brands = seedBrands();
  const client: Client = {
    id: DEMO_CLIENT_ID,
    name: "HDFC Corporation",
    legalName: "HDFC Corporation Pvt. Ltd.",
    logoUrl: null,
    gstNumber: "06AABCA1234A1Z5",
    status: "active",
    allowWallet: true,
    allowBankTransfer: true,
  };
  const users: AppUser[] = (
    [
      ["admin@acme.test", "Ramchandra Admin", "admin"],
      ["finance@acme.test", "Raghav Finance", "finance"],
      ["procurement@acme.test", "Madhav Procurement", "procurement"],
      ["viewer@acme.test", "Vikram Viewer", "viewer"],
    ] as const
  ).map(([email, fullName, role]) => ({
    id: uid(),
    clientId: DEMO_CLIENT_ID,
    email,
    fullName,
    phone: null,
    role,
    status: "active" as const,
    lastLoginAt: null,
    createdAt: now(),
  }));

  return {
    clients: [client],
    users,
    wallets: [{ clientId: DEMO_CLIENT_ID, balance: 500000, currency: "INR" }],
    walletTxns: [
      {
        id: uid(),
        clientId: DEMO_CLIENT_ID,
        type: "credit",
        amount: 500000,
        balanceAfter: 500000,
        reference: "TOPUP-INIT",
        description: "Initial wallet top-up",
        createdAt: now(),
      },
    ],
    brands,
    ratecards: brands.map((b) => ({
      clientId: DEMO_CLIENT_ID,
      brandId: b.id,
      discountPct: b.defaultDiscountPct + 1.5,
    })),
    carts: [],
    orders: [],
    vouchers: [],
    loginOtps: [],
    downloadTokens: [],
    audit: [],
    seq: 1000,
  };
}

// ---------------------------------------------------------------------------
//  Singleton store (survives Next dev hot-reloads via globalThis)
// ---------------------------------------------------------------------------
const g = globalThis as unknown as { __gyftrDB?: DB };

function load(): DB {
  if (g.__gyftrDB) return g.__gyftrDB;
  let db: DB;
  try {
    if (fs.existsSync(DATA_FILE)) {
      db = JSON.parse(fs.readFileSync(DATA_FILE, "utf8")) as DB;
    } else {
      db = seed();
      persist(db);
    }
  } catch {
    db = seed();
  }
  g.__gyftrDB = db;
  return db;
}

let saveTimer: NodeJS.Timeout | null = null;
function persist(db: DB) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), "utf8");
  } catch {
    /* best effort */
  }
}
function save(db: DB) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => persist(db), 50);
}

function effectiveDiscount(db: DB, clientId: string, b: BrandRow): number {
  const rc = db.ratecards.find((r) => r.clientId === clientId && r.brandId === b.id);
  return rc ? rc.discountPct : b.defaultDiscountPct;
}

function toBrand(db: DB, clientId: string, b: BrandRow): Brand {
  return {
    id: b.id,
    externalId: b.externalId,
    name: b.name,
    slug: b.slug,
    category: b.category,
    logoUrl: b.logoUrl,
    description: b.description,
    terms: b.terms,
    defaultDiscountPct: b.defaultDiscountPct,
    status: b.status,
    denominations: [...b.denominations].sort((a, c) => a - c),
    discountPct: effectiveDiscount(db, clientId, b),
  };
}

// ---------------------------------------------------------------------------
//  Backend implementation
// ---------------------------------------------------------------------------
export const memoryBackend: Backend = {
  name: "memory",

  async init() {
    load();
  },

  // --- clients & users ---
  async getClientById(id) {
    const db = load();
    return db.clients.find((c) => c.id === id) ?? null;
  },
  async getUserByEmail(email) {
    const db = load();
    return db.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;
  },
  async getUserById(id) {
    const db = load();
    return db.users.find((u) => u.id === id) ?? null;
  },
  async listUsersByClient(clientId) {
    const db = load();
    return db.users
      .filter((u) => u.clientId === clientId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },
  async createUser(input) {
    const db = load();
    const user: AppUser = {
      id: uid(),
      clientId: input.clientId,
      email: input.email.toLowerCase(),
      fullName: input.fullName,
      phone: input.phone ?? null,
      role: input.role,
      status: input.status ?? "active",
      lastLoginAt: null,
      createdAt: now(),
    };
    db.users.push(user);
    save(db);
    return user;
  },
  async updateUser(id, patch) {
    const db = load();
    const u = db.users.find((x) => x.id === id);
    if (!u) return null;
    Object.assign(u, patch);
    save(db);
    return u;
  },
  async touchUserLogin(id) {
    const db = load();
    const u = db.users.find((x) => x.id === id);
    if (u) {
      u.lastLoginAt = now();
      save(db);
    }
  },

  // --- login otp ---
  async createLoginOtp(email, otpHash, expiresAt) {
    const db = load();
    const row: LoginOtpRow = {
      id: uid(),
      email: email.toLowerCase(),
      otpHash,
      expiresAt,
      attempts: 0,
      consumed: false,
      createdAt: now(),
    };
    db.loginOtps.push(row);
    save(db);
    return row;
  },
  async getLatestLoginOtp(email) {
    const db = load();
    return (
      db.loginOtps
        .filter((o) => o.email === email.toLowerCase() && !o.consumed)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null
    );
  },
  async bumpLoginOtpAttempts(id) {
    const db = load();
    const o = db.loginOtps.find((x) => x.id === id);
    if (o) {
      o.attempts += 1;
      save(db);
    }
  },
  async consumeLoginOtp(id) {
    const db = load();
    const o = db.loginOtps.find((x) => x.id === id);
    if (o) {
      o.consumed = true;
      save(db);
    }
  },

  // --- wallet ---
  async getWallet(clientId) {
    const db = load();
    const w = db.wallets.find((x) => x.clientId === clientId);
    const state: WalletState = {
      clientId,
      balance: w?.balance ?? 0,
      currency: w?.currency ?? "INR",
    };
    return state;
  },
  async listWalletTransactions(clientId, limit = 100) {
    const db = load();
    return db.walletTxns
      .filter((t) => t.clientId === clientId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit)
      .map(({ clientId: _c, ...rest }) => rest);
  },
  async debitWallet(clientId, amount, reference, description, userId) {
    const db = load();
    const w = db.wallets.find((x) => x.clientId === clientId);
    if (!w) throw new Error("Wallet not found");
    if (w.balance < amount) throw new Error("INSUFFICIENT_BALANCE");
    w.balance = money(w.balance - amount);
    const txn: WalletTxnRow = {
      id: uid(),
      clientId,
      type: "debit",
      amount: money(amount),
      balanceAfter: w.balance,
      reference,
      description,
      createdAt: now(),
    };
    db.walletTxns.push(txn);
    save(db);
    const { clientId: _c, ...rest } = txn;
    return rest;
  },
  async creditWallet(clientId, amount, reference, description, type = "credit") {
    const db = load();
    const w = db.wallets.find((x) => x.clientId === clientId);
    if (!w) throw new Error("Wallet not found");
    w.balance = money(w.balance + amount);
    const txn: WalletTxnRow = {
      id: uid(),
      clientId,
      type,
      amount: money(amount),
      balanceAfter: w.balance,
      reference,
      description,
      createdAt: now(),
    };
    db.walletTxns.push(txn);
    save(db);
    const { clientId: _c, ...rest } = txn;
    return rest;
  },

  // --- catalog ---
  async listBrandsForClient(clientId) {
    const db = load();
    return db.brands
      .filter((b) => b.status === "active")
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((b) => toBrand(db, clientId, b));
  },
  async getBrandForClient(clientId, brandId) {
    const db = load();
    const b = db.brands.find((x) => x.id === brandId);
    return b ? toBrand(db, clientId, b) : null;
  },

  // --- cart ---
  async getCart(userId) {
    const db = load();
    return db.carts.find((c) => c.userId === userId)?.lines ?? [];
  },
  async saveCart(userId, clientId, lines) {
    const db = load();
    const existing = db.carts.find((c) => c.userId === userId);
    if (existing) {
      existing.lines = lines;
      existing.updatedAt = now();
    } else {
      db.carts.push({ userId, clientId, lines, updatedAt: now() });
    }
    save(db);
  },
  async clearCart(userId) {
    const db = load();
    const c = db.carts.find((x) => x.userId === userId);
    if (c) {
      c.lines = [];
      c.updatedAt = now();
      save(db);
    }
  },

  // --- orders ---
  async createOrder(input: CreateOrderInput) {
    const db = load();
    db.seq += 1;
    const orderNumber = `GYF${new Date().getFullYear()}${String(db.seq).padStart(6, "0")}`;
    const id = uid();
    const items: OrderItem[] = input.items.map((it) => ({ ...it, id: uid() }));
    const order: Order = {
      id,
      orderNumber,
      clientId: input.clientId,
      userId: input.userId,
      status: "pending_payment",
      totalFaceValue: input.totalFaceValue,
      totalDiscount: input.totalDiscount,
      payableAmount: input.payableAmount,
      totalQuantity: input.totalQuantity,
      paymentMethod: null,
      paymentStatus: "unpaid",
      paymentProofUrl: null,
      utrNumber: null,
      paymentSubmittedAt: null,
      paymentVerifiedAt: null,
      rejectionReason: null,
      createdAt: now(),
      items,
      placedByName: input.placedByName,
    };
    db.orders.push(order);
    save(db);
    return order;
  },
  async getOrderById(id) {
    const db = load();
    return db.orders.find((o) => o.id === id) ?? null;
  },
  async getOrderByNumber(orderNumber) {
    const db = load();
    return db.orders.find((o) => o.orderNumber === orderNumber) ?? null;
  },
  async listOrders(clientId, limit = 100) {
    const db = load();
    return db.orders
      .filter((o) => o.clientId === clientId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit)
      .map((o) => ({ ...o, items: undefined }));
  },
  async updateOrder(id, patch) {
    const db = load();
    const o = db.orders.find((x) => x.id === id);
    if (!o) return null;
    Object.assign(o, patch);
    save(db);
    return o;
  },
  async getDashboardStats(clientId) {
    const db = load();
    const w = db.wallets.find((x) => x.clientId === clientId);
    const orders = db.orders
      .filter((o) => o.clientId === clientId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const stats: DashboardStats = {
      walletBalance: w?.balance ?? 0,
      walletCurrency: w?.currency ?? "INR",
      totalOrders: orders.length,
      pendingOrders: orders.filter((o) =>
        ["pending_payment", "under_verification", "processing", "paid"].includes(o.status)
      ).length,
      fulfilledOrders: orders.filter((o) => o.status === "fulfilled").length,
      lastOrder: orders[0] ? { ...orders[0], items: undefined } : null,
    };
    return stats;
  },

  // --- vouchers ---
  async createVouchers(orderId, vouchers: NewVoucher[]) {
    const db = load();
    for (const v of vouchers) {
      db.vouchers.push({
        id: uid(),
        orderId,
        orderItemId: v.orderItemId,
        brandId: v.brandId,
        brandName: v.brandName,
        denomination: v.denomination,
        code: v.code,
        pin: v.pin,
        expiryDate: v.expiryDate,
        status: "issued",
      });
    }
    save(db);
  },
  async listVouchers(orderId) {
    const db = load();
    return db.vouchers
      .filter((v) => v.orderId === orderId)
      .map(({ orderId: _o, brandId: _b, orderItemId: _oi, ...rest }) => rest);
  },

  // --- voucher download tokens ---
  async getOrCreateDownloadToken(orderId, email) {
    const db = load();
    let row = db.downloadTokens.find((t) => t.orderId === orderId);
    if (!row) {
      row = {
        id: uid(),
        orderId,
        token: crypto.randomBytes(24).toString("base64url"),
        email,
        otpHash: null,
        otpExpiresAt: null,
        otpSentAt: null,
        attempts: 0,
        verified: false,
        verifiedAt: null,
        createdAt: now(),
      };
      db.downloadTokens.push(row);
      save(db);
    }
    return row;
  },
  async getDownloadTokenByToken(token) {
    const db = load();
    return db.downloadTokens.find((t) => t.token === token) ?? null;
  },
  async setDownloadOtp(id, otpHash, expiresAt) {
    const db = load();
    const t = db.downloadTokens.find((x) => x.id === id);
    if (t) {
      t.otpHash = otpHash;
      t.otpExpiresAt = expiresAt;
      t.otpSentAt = now();
      t.attempts = 0;
      save(db);
    }
  },
  async bumpDownloadAttempts(id) {
    const db = load();
    const t = db.downloadTokens.find((x) => x.id === id);
    if (t) {
      t.attempts += 1;
      save(db);
    }
  },
  async markDownloadVerified(id) {
    const db = load();
    const t = db.downloadTokens.find((x) => x.id === id);
    if (t) {
      t.verified = true;
      t.verifiedAt = now();
      save(db);
    }
  },

  // --- audit ---
  async audit(input) {
    const db = load();
    db.audit.push({ ...input, createdAt: now() });
    if (db.audit.length > 2000) db.audit.splice(0, db.audit.length - 2000);
    save(db);
  },
};
