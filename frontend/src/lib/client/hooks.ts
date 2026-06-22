"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "./api";
import type {
  AppUser,
  Brand,
  Order,
  Voucher,
  WalletTransaction,
} from "@/types";
import type { DashboardStats } from "@/lib/db/types";

export function useBrands() {
  return useQuery({
    queryKey: ["brands"],
    queryFn: () => api.get<{ brands: Brand[]; categories: string[] }>("/api/brands"),
  });
}

export function useBrand(id: string) {
  return useQuery({
    queryKey: ["brand", id],
    queryFn: () => api.get<{ brand: Brand }>(`/api/brands/${id}`),
    enabled: !!id,
  });
}

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get<{ stats: DashboardStats; orders: Order[] }>("/api/dashboard"),
  });
}

export function useOrders() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: () => api.get<{ orders: Order[] }>("/api/orders"),
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ["order", id],
    queryFn: () => api.get<{ order: Order; voucherCount: number }>(`/api/orders/${id}`),
    enabled: !!id,
  });
}

export function useWallet() {
  return useQuery({
    queryKey: ["wallet"],
    queryFn: () =>
      api.get<{ wallet: { balance: number; currency: string }; transactions: WalletTransaction[] }>(
        "/api/wallet"
      ),
  });
}

export interface CheckoutConfig {
  paymentMethods: { wallet: boolean; bankTransfer: boolean };
  bank: {
    accountName: string;
    accountNumber: string;
    ifsc: string;
    bankName: string;
    branch: string;
  };
  client: { id: string; name: string; gstNumber: string | null } | null;
}

export function useCheckoutConfig() {
  return useQuery({
    queryKey: ["config"],
    queryFn: () => api.get<CheckoutConfig>("/api/config"),
  });
}

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: () => api.get<{ users: AppUser[] }>("/api/users"),
  });
}

export function usePendingVerifications() {
  return useQuery({
    queryKey: ["verifications"],
    queryFn: () => api.get<{ orders: Order[] }>("/api/admin/orders"),
  });
}

export type { Voucher };
