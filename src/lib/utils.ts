import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a number as Indian Rupees. */
export function formatINR(value: number | string, opts?: { decimals?: boolean }) {
  const n = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(n)) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: opts?.decimals ? 2 : 0,
    maximumFractionDigits: opts?.decimals ? 2 : 0,
  }).format(n);
}

/** Plain Indian-grouped number, no currency symbol. */
export function formatNumber(value: number | string) {
  const n = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(n)) return "0";
  return new Intl.NumberFormat("en-IN").format(n);
}

export function formatDate(date: string | Date, withTime = false) {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(d);
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function truncate(str: string, n: number) {
  return str.length > n ? str.slice(0, n - 1) + "…" : str;
}

/** Round to 2 decimals avoiding float drift. */
export function money(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
