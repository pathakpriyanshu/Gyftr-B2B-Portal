"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Menu, ShoppingCart, LogOut, ChevronDown, User as UserIcon, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Logo } from "@/components/logo";
import { useSession } from "@/providers/session";
import { useCart } from "@/store/cart";
import { api } from "@/lib/client/api";
import { cn } from "@/lib/utils";

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrator",
  finance: "Finance",
  procurement: "Procurement",
  viewer: "Viewer",
};

export function Topbar({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const user = useSession();
  const router = useRouter();
  const count = useCart((s) => s.count());
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const logout = async () => {
    try {
      await api.post("/api/auth/logout");
    } catch {
      /* ignore */
    }
    toast.success("Signed out");
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card/80 px-4 backdrop-blur-md sm:px-6">
      <button
        onClick={onOpenSidebar}
        className="rounded-lg p-2 text-muted-foreground hover:bg-muted lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="lg:hidden">
        <Logo tag={false} />
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <Link
          href="/cart"
          className="group relative flex h-10 w-10 items-center justify-center rounded-lg text-foreground/70 transition-colors hover:bg-muted"
          aria-label="Cart"
        >
          <ShoppingCart className="h-[18px] w-[18px] transition-transform group-hover:scale-110" />
          {count > 0 && (
            <motion.span
              key={count}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 18 }}
              className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground"
            >
              {count > 99 ? "99+" : count}
            </motion.span>
          )}
        </Link>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg p-1 pr-2 transition-colors hover:bg-muted"
          >
            <Avatar name={user.fullName} />
            <div className="hidden text-left sm:block">
              <p className="text-sm font-semibold leading-tight">{user.fullName}</p>
              <p className="text-xs text-muted-foreground">{ROLE_LABEL[user.role]}</p>
            </div>
            <motion.span animate={{ rotate: menuOpen ? 180 : 0 }} transition={{ duration: 0.2 }} className="hidden sm:block">
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </motion.span>
          </button>

          <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              style={{ transformOrigin: "top right" }}
              className="absolute right-0 top-12 w-60 overflow-hidden rounded-xl border border-border bg-card card-shadow-lg">
              <div className="border-b border-border p-4">
                <p className="truncate text-sm font-semibold">{user.fullName}</p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                <p className="mt-2 inline-flex rounded-md bg-accent px-2 py-0.5 text-[11px] font-semibold text-primary">
                  {ROLE_LABEL[user.role]} · {user.clientName}
                </p>
              </div>
              <div className="p-1.5">
                <MenuLink href="/settings" icon={UserIcon} label="Account settings" onClick={() => setMenuOpen(false)} />
                <MenuLink href="/wallet" icon={Wallet} label="Wallet" onClick={() => setMenuOpen(false)} />
                <button
                  onClick={logout}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </motion.div>
          )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}

function MenuLink({
  href,
  icon: Icon,
  label,
  onClick,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted"
      )}
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
      {label}
    </Link>
  );
}
