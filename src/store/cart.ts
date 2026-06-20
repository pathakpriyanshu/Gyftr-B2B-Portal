"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { recalcLine, summarize } from "@/lib/pricing";
import { api } from "@/lib/client/api";
import type { CartLine, CartSummary } from "@/types";

interface CartState {
  lines: CartLine[];
  hydrated: boolean;
  /** Adds quantity for a brand+denomination, merging with existing line. */
  addItem: (line: CartLine) => void;
  setQuantity: (brandId: string, denomination: number, quantity: number) => void;
  removeItem: (brandId: string, denomination: number) => void;
  clear: () => void;
  replaceAll: (lines: CartLine[]) => void;
  summary: () => CartSummary;
  count: () => number;
  syncToServer: () => Promise<void>;
  loadFromServer: () => Promise<void>;
}

let syncTimer: ReturnType<typeof setTimeout> | null = null;

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      hydrated: false,

      addItem: (line) => {
        const lines = [...get().lines];
        const idx = lines.findIndex(
          (l) => l.brandId === line.brandId && l.denomination === line.denomination
        );
        if (idx >= 0) {
          lines[idx] = recalcLine({
            ...lines[idx],
            quantity: lines[idx].quantity + line.quantity,
            discountPct: line.discountPct,
          });
        } else {
          lines.push(recalcLine(line));
        }
        set({ lines });
        get().syncToServer();
      },

      setQuantity: (brandId, denomination, quantity) => {
        if (quantity <= 0) return get().removeItem(brandId, denomination);
        const lines = get().lines.map((l) =>
          l.brandId === brandId && l.denomination === denomination
            ? recalcLine({ ...l, quantity })
            : l
        );
        set({ lines });
        get().syncToServer();
      },

      removeItem: (brandId, denomination) => {
        set({
          lines: get().lines.filter(
            (l) => !(l.brandId === brandId && l.denomination === denomination)
          ),
        });
        get().syncToServer();
      },

      clear: () => {
        set({ lines: [] });
        get().syncToServer();
      },

      replaceAll: (lines) => set({ lines: lines.map(recalcLine), hydrated: true }),

      summary: () => summarize(get().lines),
      count: () => get().lines.reduce((n, l) => n + l.quantity, 0),

      syncToServer: async () => {
        if (syncTimer) clearTimeout(syncTimer);
        syncTimer = setTimeout(async () => {
          try {
            await api.post("/api/cart", { lines: get().lines });
          } catch {
            /* offline / unauthenticated — local cart still persists */
          }
        }, 400);
      },

      loadFromServer: async () => {
        try {
          const data = await api.get<{ lines: CartLine[] }>("/api/cart");
          // server cart is the source of truth across sessions/devices
          set({ lines: data.lines.map(recalcLine), hydrated: true });
        } catch {
          set({ hydrated: true });
        }
      },
    }),
    {
      name: "gyftr-cart",
      partialize: (s) => ({ lines: s.lines }),
    }
  )
);
