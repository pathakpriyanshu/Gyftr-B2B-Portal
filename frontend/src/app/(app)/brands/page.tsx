"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Search, Store, Tag, ArrowRight, SlidersHorizontal } from "lucide-react";
import { useBrands } from "@/lib/client/hooks";
import { PageHeader } from "@/components/page-header";
import { Stagger, StaggerItem } from "@/components/ui/motion";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { BrandLogo } from "@/components/brand-logo";
import { cn } from "@/lib/utils";

export default function BrandsPage() {
  const { data, isLoading } = useBrands();
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState<string>("All");

  const categories = ["All", ...(data?.categories ?? [])];

  const filtered = React.useMemo(() => {
    const brands = data?.brands ?? [];
    const q = search.trim().toLowerCase();
    return brands.filter((b) => {
      const matchesQ = !q || b.name.toLowerCase().includes(q) || (b.category ?? "").toLowerCase().includes(q);
      const matchesCat = category === "All" || b.category === category;
      return matchesQ && matchesCat;
    });
  }, [data?.brands, search, category]);

  return (
    <div>
      <PageHeader
        title="Browse Brands"
        description="Choose a brand to configure denominations and add vouchers to your cart."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Brands" }]}
      />

      {/* Sticky search + filters */}
      <div className="sticky top-16 z-20 -mx-1 mb-6 rounded-xl border border-border bg-card/90 p-3 backdrop-blur-md card-shadow">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search brands…"
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin sm:pb-0">
            <SlidersHorizontal className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" />
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={cn(
                  "relative shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
                  category === c
                    ? "text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent hover:text-primary"
                )}
              >
                {category === c && (
                  <motion.span
                    layoutId="brand-cat-pill"
                    className="absolute inset-0 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
                  />
                )}
                <span className="relative z-10">{c}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Store}
          title="No brands found"
          description={
            search
              ? `We couldn't find any brands matching "${search}".`
              : "No brands are available right now."
          }
        />
      ) : (
        <Stagger
          key={category}
          className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
          gap={0.04}
          delayChildren={0}
        >
          {filtered.map((b) => (
            <StaggerItem key={b.id} className="h-full" y={12}>
              <Link href={`/brands/${b.id}`} className="block h-full">
                <Card className="group flex h-full flex-col p-4 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:card-shadow-lg">
                  <div className="flex items-start justify-between">
                    <BrandLogo name={b.name} src={b.logoUrl} className="h-14 w-14 text-xl transition-transform duration-300 group-hover:scale-105" />
                    {b.discountPct > 0 && (
                      <Badge variant="success" className="gap-1">
                        <Tag className="h-3 w-3" />
                        {b.discountPct}% off
                      </Badge>
                    )}
                  </div>
                  <h3 className="mt-3 line-clamp-1 font-semibold">{b.name}</h3>
                  <p className="text-xs text-muted-foreground">{b.category}</p>
                  <div className="mt-auto flex items-center gap-1 pt-3 text-sm font-medium text-primary">
                    View denominations
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </div>
                </Card>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </div>
  );
}
