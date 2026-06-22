"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { NAV_GROUPS, canSee } from "./nav";
import { useSession } from "@/providers/session";
import { useCart } from "@/store/cart";

export function SidebarContent({
  onNavigate,
  scope = "desktop",
}: {
  onNavigate?: () => void;
  scope?: string;
}) {
  const pathname = usePathname();
  const user = useSession();
  const count = useCart((s) => s.count());

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center border-b border-border px-6">
        <Link href="/dashboard" onClick={onNavigate}>
          <Logo />
        </Link>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5 scrollbar-thin">
        {NAV_GROUPS.map((group) => {
          const items = group.items.filter((i) => canSee(i, user.role));
          if (!items.length) return null;
          return (
            <div key={group.heading}>
              <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.heading}
              </p>
              <ul className="space-y-1">
                {items.map((item) => {
                  const active =
                    pathname === item.href || pathname.startsWith(item.href + "/");
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        className={cn(
                          "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                          active
                            ? "text-primary"
                            : "text-foreground/70 hover:bg-muted hover:text-foreground"
                        )}
                      >
                        {active && (
                          <motion.span
                            layoutId={`nav-active-${scope}`}
                            className="absolute inset-0 rounded-lg bg-accent"
                            transition={{ type: "spring", stiffness: 500, damping: 40 }}
                          />
                        )}
                        <Icon
                          className={cn(
                            "relative z-10 h-[18px] w-[18px] shrink-0 transition-transform group-hover:scale-110",
                            active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                          )}
                        />
                        <span className="relative z-10 flex-1">{item.label}</span>
                        {item.cartBadge && count > 0 && (
                          <motion.span
                            key={count}
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 500, damping: 18 }}
                            className="relative z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground"
                          >
                            {count > 99 ? "99+" : count}
                          </motion.span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-border p-4">
        <div className="rounded-lg bg-gradient-to-br from-secondary to-secondary/80 p-4 text-white">
          <p className="text-xs font-medium text-white/70">Signed in as</p>
          <p className="mt-0.5 truncate text-sm font-semibold">{user.clientName}</p>
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-border bg-card lg:block">
      <div className="fixed h-screen w-64">
        <SidebarContent />
      </div>
    </aside>
  );
}
