"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Minus, Plus, ShoppingCart, Tag, Check, Info, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useBrand } from "@/lib/client/hooks";
import { useCart } from "@/store/cart";
import { useCanTransact } from "@/providers/session";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BrandLogo } from "@/components/brand-logo";
import { priceLine } from "@/lib/pricing";
import { formatINR } from "@/lib/utils";

export default function BrandConfigPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const canTransact = useCanTransact();
  const { data, isLoading } = useBrand(params.id);
  const addItem = useCart((s) => s.addItem);

  const brand = data?.brand;
  const [denomination, setDenomination] = React.useState<number | null>(null);
  const [quantity, setQuantity] = React.useState(10);
  const [added, setAdded] = React.useState(false);

  React.useEffect(() => {
    if (brand && denomination === null && brand.denominations.length) {
      setDenomination(brand.denominations[0]);
    }
  }, [brand, denomination]);

  if (isLoading) {
    return (
      <div>
        <Skeleton className="mb-6 h-8 w-64" />
        <div className="grid gap-6 lg:grid-cols-5">
          <Skeleton className="h-80 lg:col-span-3" />
          <Skeleton className="h-80 lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted-foreground">Brand not found.</p>
        <Link href="/brands" className="mt-3 inline-block font-medium text-primary hover:underline">
          ← Back to brands
        </Link>
      </div>
    );
  }

  const line =
    denomination !== null ? priceLine(brand, denomination, quantity) : null;

  const handleAdd = () => {
    if (!line) return;
    addItem(line);
    setAdded(true);
    toast.success(`Added ${quantity} × ${brand.name} ${formatINR(denomination!)} to cart`, {
      action: { label: "View cart", onClick: () => router.push("/cart") },
    });
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div>
      <PageHeader
        title={brand.name}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Brands", href: "/brands" },
          { label: brand.name },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Configuration */}
        <Card className="lg:col-span-3">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <BrandLogo name={brand.name} src={brand.logoUrl} className="h-16 w-16 text-2xl" />
              <div>
                <h2 className="text-xl font-bold">{brand.name}</h2>
                <div className="mt-1 flex items-center gap-2">
                  {brand.category && <Badge variant="secondary">{brand.category}</Badge>}
                  {brand.discountPct > 0 && (
                    <Badge variant="success" className="gap-1">
                      <Tag className="h-3 w-3" /> {brand.discountPct}% client discount
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {brand.description && (
              <p className="mt-4 text-sm text-muted-foreground">{brand.description}</p>
            )}

            <div className="mt-6 space-y-5">
              {/* Denomination */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Denomination</label>
                <Select
                  value={denomination ?? ""}
                  onChange={(e) => setDenomination(Number(e.target.value))}
                >
                  {brand.denominations.map((d) => (
                    <option key={d} value={d}>
                      {formatINR(d)}
                    </option>
                  ))}
                </Select>
                <div className="flex flex-wrap gap-2 pt-1">
                  {brand.denominations.map((d) => (
                    <button
                      key={d}
                      onClick={() => setDenomination(d)}
                      className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                        denomination === d
                          ? "border-primary bg-accent text-primary"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      {formatINR(d)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Quantity</label>
                <div className="flex items-center gap-3">
                  <div className="flex items-center rounded-lg border border-input">
                    <button
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="flex h-11 w-11 items-center justify-center rounded-l-lg text-foreground/70 transition-colors hover:bg-muted disabled:opacity-40"
                      disabled={quantity <= 1}
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <input
                      type="number"
                      value={quantity}
                      min={1}
                      max={100000}
                      onChange={(e) =>
                        setQuantity(Math.max(1, Math.min(100000, Number(e.target.value) || 1)))
                      }
                      className="h-11 w-20 border-x border-input bg-transparent text-center text-base font-semibold focus:outline-none"
                    />
                    <button
                      onClick={() => setQuantity((q) => Math.min(100000, q + 1))}
                      className="flex h-11 w-11 items-center justify-center rounded-r-lg text-foreground/70 transition-colors hover:bg-muted"
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex gap-1.5">
                    {[10, 25, 50, 100].map((q) => (
                      <button
                        key={q}
                        onClick={() => setQuantity(q)}
                        className="rounded-md bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing breakdown */}
        <div className="lg:col-span-2">
          <Card className="sticky top-20">
            <CardContent className="pt-6">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Pricing Breakdown
              </h3>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Info className="h-3 w-3" /> Real-time, based on your client rate card
              </p>

              <dl className="mt-5 space-y-3 text-sm">
                <Row label={`Face Value (${quantity} × ${denomination ? formatINR(denomination) : "—"})`}>
                  {line ? formatINR(line.faceValueTotal) : "—"}
                </Row>
                <Row label={`Brand Discount (${brand.discountPct}%)`} highlight>
                  {line ? `– ${formatINR(line.discountTotal)}` : "—"}
                </Row>
                <div className="border-t border-dashed border-border pt-3">
                  <Row label="Final Selling Price" big>
                    {line ? formatINR(line.finalPrice) : "—"}
                  </Row>
                </div>
              </dl>

              <Button
                className="mt-6 w-full"
                size="lg"
                onClick={handleAdd}
                disabled={!line || !canTransact}
                variant={added ? "success" : "default"}
              >
                {added ? (
                  <>
                    <Check className="h-4 w-4" /> Added to cart
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-4 w-4" /> Add to Cart
                  </>
                )}
              </Button>
              {!canTransact && (
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  Your role has view-only access.
                </p>
              )}

              <Link
                href="/cart"
                className="mt-3 flex items-center justify-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                Go to cart <ArrowRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  children,
  big,
  highlight,
}: {
  label: string;
  children: React.ReactNode;
  big?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className={big ? "font-semibold" : "text-muted-foreground"}>{label}</dt>
      <dd
        className={
          big
            ? "text-xl font-bold tabular-nums"
            : highlight
              ? "font-semibold tabular-nums text-success"
              : "font-medium tabular-nums"
        }
      >
        {children}
      </dd>
    </div>
  );
}
