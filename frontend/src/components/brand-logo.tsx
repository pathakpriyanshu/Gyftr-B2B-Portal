"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Brand logo with graceful fallback to a coloured monogram. */
export function BrandLogo({
  name,
  src,
  className,
}: {
  name: string;
  src?: string | null;
  className?: string;
}) {
  const [failed, setFailed] = React.useState(false);
  const letter = name?.[0]?.toUpperCase() ?? "?";

  if (!src || failed) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-lg bg-gradient-to-br from-brand-100 to-accent font-bold text-primary",
          className
        )}
      >
        {letter}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center justify-center overflow-hidden rounded-lg bg-white", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={name}
        className="h-full w-full object-contain p-1.5"
        onError={() => setFailed(true)}
        loading="lazy"
      />
    </div>
  );
}
