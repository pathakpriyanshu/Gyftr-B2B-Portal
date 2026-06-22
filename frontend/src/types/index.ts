// Shared domain types used across server and client.

export type UserRole = "admin" | "finance" | "procurement" | "viewer";
export type UserStatus = "active" | "disabled" | "invited";

export type OrderStatus =
  | "pending_payment"
  | "under_verification"
  | "paid"
  | "processing"
  | "fulfilled"
  | "cancelled"
  | "rejected";

export type PaymentMethod = "wallet" | "bank_transfer";

export type PaymentStatus =
  | "unpaid"
  | "received"
  | "under_verification"
  | "verified"
  | "rejected";

export type WalletTxnType = "credit" | "debit" | "refund";

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  clientId: string;
  clientName: string;
}

export interface Client {
  id: string;
  name: string;
  legalName: string | null;
  logoUrl: string | null;
  gstNumber: string | null;
  status: string;
  allowWallet: boolean;
  allowBankTransfer: boolean;
}

export interface AppUser {
  id: string;
  clientId: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface Brand {
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
  denominations: number[];
  /** Effective discount for the current client (ratecard or default). */
  discountPct: number;
}

export interface CartLine {
  brandId: string;
  brandName: string;
  brandLogoUrl: string | null;
  denomination: number;
  quantity: number;
  discountPct: number;
  /** denomination * quantity */
  faceValueTotal: number;
  /** total discount amount */
  discountTotal: number;
  /** payable for this line */
  finalPrice: number;
}

export interface CartSummary {
  totalQuantity: number;
  totalFaceValue: number;
  totalDiscount: number;
  payableAmount: number;
}

export interface OrderItem {
  id: string;
  brandId: string;
  brandName: string;
  brandLogoUrl: string | null;
  denomination: number;
  quantity: number;
  discountPct: number;
  faceValueTotal: number;
  discountTotal: number;
  finalPrice: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  clientId: string;
  userId: string;
  status: OrderStatus;
  totalFaceValue: number;
  totalDiscount: number;
  payableAmount: number;
  totalQuantity: number;
  paymentMethod: PaymentMethod | null;
  paymentStatus: PaymentStatus;
  paymentProofUrl: string | null;
  utrNumber: string | null;
  paymentSubmittedAt: string | null;
  paymentVerifiedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  items?: OrderItem[];
  placedByName?: string | null;
}

export interface WalletTransaction {
  id: string;
  type: WalletTxnType;
  amount: number;
  balanceAfter: number;
  reference: string | null;
  description: string | null;
  createdAt: string;
}

export interface Voucher {
  id: string;
  brandName: string;
  denomination: number;
  code: string;
  pin: string | null;
  expiryDate: string | null;
  status: string;
}

export interface ApiError {
  error: string;
  code?: string;
  details?: unknown;
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; code?: string };
