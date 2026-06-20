import { cn } from "@/lib/utils";

/** Gyftr wordmark — "Gy" navy, "FTR" magenta, with a B2B tag. */
export function Logo({
  className,
  tag = true,
  invert = false,
}: {
  className?: string;
  tag?: boolean;
  invert?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-xl font-extrabold tracking-tight leading-none">
        <span className={invert ? "text-white" : "text-secondary"}>Gy</span>
        <span className="text-primary">FTR</span>
      </span>
      {tag && (
        <span
          className={cn(
            "rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
            invert ? "bg-white/15 text-white" : "bg-secondary/10 text-secondary"
          )}
        >
          B2B
        </span>
      )}
    </div>
  );
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-extrabold text-primary-foreground",
        className
      )}
    >
      G
    </div>
  );
}
