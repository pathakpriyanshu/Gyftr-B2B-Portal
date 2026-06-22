"use client";

import * as React from "react";
import { X } from "lucide-react";
import { SessionProvider } from "@/providers/session";
import { Sidebar, SidebarContent } from "./sidebar";
import { Topbar } from "./topbar";
import { PageTransition } from "./page-transition";
import { useCart } from "@/store/cart";
import type { SessionUser } from "@/types";

export function AppShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const [drawer, setDrawer] = React.useState(false);
  const loadFromServer = useCart((s) => s.loadFromServer);

  // sync the server-persisted cart on first mount
  React.useEffect(() => {
    loadFromServer();
  }, [loadFromServer]);

  return (
    <SessionProvider user={user}>
      <div className="flex min-h-screen bg-background">
        <Sidebar />

        {/* mobile drawer */}
        {drawer && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-secondary/40 backdrop-blur-sm animate-fade-in"
              onClick={() => setDrawer(false)}
            />
            <div className="absolute left-0 top-0 h-full w-72 bg-card card-shadow-lg animate-fade-in">
              <button
                onClick={() => setDrawer(false)}
                className="absolute right-3 top-4 z-10 rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
              <SidebarContent scope="mobile" onNavigate={() => setDrawer(false)} />
            </div>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onOpenSidebar={() => setDrawer(true)} />
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-6xl">
              <PageTransition>{children}</PageTransition>
            </div>
          </main>
        </div>
      </div>
    </SessionProvider>
  );
}
