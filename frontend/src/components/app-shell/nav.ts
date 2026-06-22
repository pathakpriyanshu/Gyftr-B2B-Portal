import {
  LayoutDashboard,
  Store,
  ShoppingCart,
  Receipt,
  Wallet,
  Users,
  Settings,
  LifeBuoy,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "@/types";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Minimum role required to see this item. */
  minRole?: UserRole;
  /** Show a cart badge. */
  cartBadge?: boolean;
}

export const NAV_GROUPS: { heading: string; items: NavItem[] }[] = [
  {
    heading: "Shop",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Brands", href: "/brands", icon: Store },
      { label: "Cart", href: "/cart", icon: ShoppingCart, cartBadge: true },
    ],
  },
  {
    heading: "Account",
    items: [
      { label: "Orders", href: "/orders", icon: Receipt },
      { label: "Wallet", href: "/wallet", icon: Wallet },
      { label: "Verifications", href: "/admin", icon: ShieldCheck, minRole: "finance" },
    ],
  },
  {
    heading: "Manage",
    items: [
      { label: "Users", href: "/users", icon: Users, minRole: "admin" },
      { label: "Settings", href: "/settings", icon: Settings },
      { label: "Support", href: "/support", icon: LifeBuoy },
    ],
  },
];

const RANK: Record<UserRole, number> = { viewer: 0, procurement: 1, finance: 2, admin: 3 };
export function canSee(item: NavItem, role: UserRole) {
  if (!item.minRole) return true;
  return RANK[role] >= RANK[item.minRole];
}
