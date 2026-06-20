import type {
  AppUser,
  Brand,
  CartLine,
  Client,
  Order,
  OrderItem,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  UserRole,
  UserStatus,
  Voucher,
  WalletTransaction,
} from "@/types";

export interface WalletState {
  clientId: string;
  balance: number;
  currency: string;
}

export interface LoginOtpRow {
  id: string;
  email: string;
  otpHash: string;
  expiresAt: string;
  attempts: number;
  consumed: boolean;
  createdAt: string;
}

export interface DownloadTokenRow {
  id: string;
  orderId: string;
  token: string;
  email: string;
  otpHash: string | null;
  otpExpiresAt: string | null;
  otpSentAt: string | null;
  attempts: number;
  verified: boolean;
  verifiedAt: string | null;
  createdAt: string;
}

export interface CreateOrderInput {
  clientId: string;
  userId: string;
  placedByName: string;
  items: Omit<OrderItem, "id">[];
  totalFaceValue: number;
  totalDiscount: number;
  payableAmount: number;
  totalQuantity: number;
}

export interface DashboardStats {
  walletBalance: number;
  walletCurrency: string;
  totalOrders: number;
  pendingOrders: number;
  fulfilledOrders: number;
  lastOrder: Order | null;
}

export interface NewVoucher {
  orderItemId: string;
  brandId: string | null;
  brandName: string;
  denomination: number;
  code: string;
  pin: string | null;
  expiryDate: string | null;
}

/**
 * Storage-agnostic data access contract. Implemented by both the
 * in-memory backend (dev / zero-config) and the Supabase backend (prod).
 */
export interface Backend {
  readonly name: "memory" | "supabase";
  init(): Promise<void>;

  // --- clients & users ---
  getClientById(id: string): Promise<Client | null>;
  getUserByEmail(email: string): Promise<AppUser | null>;
  getUserById(id: string): Promise<AppUser | null>;
  listUsersByClient(clientId: string): Promise<AppUser[]>;
  createUser(input: {
    clientId: string;
    email: string;
    fullName: string;
    phone?: string | null;
    role: UserRole;
    status?: UserStatus;
  }): Promise<AppUser>;
  updateUser(
    id: string,
    patch: Partial<Pick<AppUser, "fullName" | "phone" | "role" | "status">>
  ): Promise<AppUser | null>;
  touchUserLogin(id: string): Promise<void>;

  // --- login otp ---
  createLoginOtp(email: string, otpHash: string, expiresAt: string): Promise<LoginOtpRow>;
  getLatestLoginOtp(email: string): Promise<LoginOtpRow | null>;
  bumpLoginOtpAttempts(id: string): Promise<void>;
  consumeLoginOtp(id: string): Promise<void>;

  // --- wallet ---
  getWallet(clientId: string): Promise<WalletState>;
  listWalletTransactions(clientId: string, limit?: number): Promise<WalletTransaction[]>;
  debitWallet(
    clientId: string,
    amount: number,
    reference: string,
    description: string,
    userId?: string
  ): Promise<WalletTransaction>;
  creditWallet(
    clientId: string,
    amount: number,
    reference: string,
    description: string,
    type?: "credit" | "refund",
    userId?: string
  ): Promise<WalletTransaction>;

  // --- catalog ---
  listBrandsForClient(clientId: string): Promise<Brand[]>;
  getBrandForClient(clientId: string, brandId: string): Promise<Brand | null>;

  // --- cart ---
  getCart(userId: string): Promise<CartLine[]>;
  saveCart(userId: string, clientId: string, lines: CartLine[]): Promise<void>;
  clearCart(userId: string): Promise<void>;

  // --- orders ---
  createOrder(input: CreateOrderInput): Promise<Order>;
  getOrderById(id: string): Promise<Order | null>;
  getOrderByNumber(orderNumber: string): Promise<Order | null>;
  listOrders(clientId: string, limit?: number): Promise<Order[]>;
  updateOrder(
    id: string,
    patch: Partial<{
      status: OrderStatus;
      paymentMethod: PaymentMethod;
      paymentStatus: PaymentStatus;
      paymentProofUrl: string | null;
      utrNumber: string | null;
      paymentSubmittedAt: string | null;
      paymentVerifiedAt: string | null;
      verifiedBy: string | null;
      rejectionReason: string | null;
    }>
  ): Promise<Order | null>;
  getDashboardStats(clientId: string): Promise<DashboardStats>;

  // --- vouchers ---
  createVouchers(orderId: string, vouchers: NewVoucher[]): Promise<void>;
  listVouchers(orderId: string): Promise<Voucher[]>;

  // --- voucher download tokens ---
  getOrCreateDownloadToken(orderId: string, email: string): Promise<DownloadTokenRow>;
  getDownloadTokenByToken(token: string): Promise<DownloadTokenRow | null>;
  setDownloadOtp(id: string, otpHash: string, expiresAt: string): Promise<void>;
  bumpDownloadAttempts(id: string): Promise<void>;
  markDownloadVerified(id: string): Promise<void>;

  // --- audit ---
  audit(input: {
    clientId?: string | null;
    userId?: string | null;
    action: string;
    entity?: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
}
