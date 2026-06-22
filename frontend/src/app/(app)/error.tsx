"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <h1 className="mt-4 text-xl font-bold">Something went wrong</h1>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
        We hit an unexpected error. Please try again — if it persists, contact support.
      </p>
      <Button onClick={reset} className="mt-5">
        <RotateCcw className="h-4 w-4" /> Try again
      </Button>
    </div>
  );
}
