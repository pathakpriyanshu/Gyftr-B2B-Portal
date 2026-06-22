"use client";

import * as React from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Sparkles } from "lucide-react";
import { LoadingDots, EASE } from "@/components/ui/motion";

type Offer = { brand: string; pct: string; tag: string; from: string; to: string };

/** Curated marquee of real-brand corporate deals shown while we work. */
const OFFERS: Offer[] = [
  { brand: "Flipkart", pct: "6.5%", tag: "Electronics & more", from: "#2874f0", to: "#1a5fd0" },
  { brand: "Myntra", pct: "8.0%", tag: "Fashion & lifestyle", from: "#ff3f6c", to: "#e0335c" },
  { brand: "Amazon", pct: "5.0%", tag: "The everything store", from: "#ff9900", to: "#e07e00" },
  { brand: "Domino's", pct: "2.5%", tag: "Pizza, delivered", from: "#0a7bb5", to: "#005a8a" },
  { brand: "Swiggy", pct: "4.0%", tag: "Food & groceries", from: "#fc8019", to: "#e06f12" },
  { brand: "BookMyShow", pct: "3.5%", tag: "Movies & events", from: "#c4242b", to: "#9e1d23" },
  { brand: "Starbucks", pct: "5.5%", tag: "Coffee & more", from: "#00704a", to: "#004f34" },
  { brand: "Tanishq", pct: "1.5%", tag: "Fine jewellery", from: "#9c2741", to: "#741c30" },
  { brand: "Croma", pct: "4.5%", tag: "Electronics", from: "#12b3a8", to: "#0d8a81" },
  { brand: "Uber", pct: "3.0%", tag: "Rides & travel", from: "#1f1f1f", to: "#000000" },
];

const monogram = (name: string) => name.replace(/[^A-Za-z]/g, "").charAt(0).toUpperCase();

/** Decorative drifting gradient orbs reused by the full-screen overlays. */
function Orbs() {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <>
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-brand-500/40 blur-3xl"
        animate={{ x: [0, 70, 0], y: [0, 50, 0], scale: [1, 1.18, 1] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute bottom-[-8rem] right-[-4rem] h-96 w-96 rounded-full bg-secondary/60 blur-3xl"
        animate={{ x: [0, -50, 0], y: [0, -40, 0], scale: [1, 1.2, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
    </>
  );
}

/**
 * Full-screen branded loading overlay. Rapidly rotates through real-brand
 * corporate deals ("Flat 6.5% off · Flipkart") while a request is in flight.
 */
export function BrandOffersLoader({ label = "Setting things up" }: { label?: string }) {
  const reduce = useReducedMotion();
  const [i, setI] = React.useState(0);

  React.useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setI((p) => (p + 1) % OFFERS.length), 1000);
    return () => clearInterval(t);
  }, [reduce]);

  const offer = OFFERS[i];

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden bg-brand-mesh px-6 text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Orbs />

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center">
        <div className="mb-7 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold backdrop-blur">
          <Sparkles className="h-3.5 w-3.5 text-brand-300" /> Today&apos;s corporate deals
        </div>

        <div className="relative h-24 w-full">
          <AnimatePresence mode="popLayout">
            <motion.div
              key={offer.brand}
              initial={{ y: reduce ? 0 : 30, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: reduce ? 0 : -30, opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4, ease: EASE }}
              className="absolute inset-0 flex items-center gap-4 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-xl"
            >
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-2xl font-black text-white shadow-lg ring-1 ring-white/20"
                style={{ backgroundImage: `linear-gradient(135deg, ${offer.from}, ${offer.to})` }}
              >
                {monogram(offer.brand)}
              </div>
              <div className="min-w-0 text-left">
                <p className="text-xs text-white/60">{offer.tag}</p>
                <p className="truncate text-lg font-bold leading-tight">{offer.brand}</p>
                <p className="mt-1.5">
                  <span className="rounded-md bg-brand-500/40 px-2 py-0.5 text-sm font-bold text-white">
                    Flat {offer.pct} off
                  </span>
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Spinner + label */}
        <div className="mt-9 flex items-center gap-3 text-sm font-medium text-white/80">
          <motion.span
            className="h-4 w-4 rounded-full border-2 border-white/25 border-t-white"
            animate={reduce ? undefined : { rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
          />
          <span className="inline-flex items-center">
            {label}
            <LoadingDots className="ml-0.5" />
          </span>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Full-screen success celebration — a burst of rays behind a drawn-in
 * checkmark — shown just before navigating into the app.
 */
export function SuccessBurst({
  title = "You're in!",
  subtitle = "Loading your dashboard",
}: {
  title?: string;
  subtitle?: string;
}) {
  const reduce = useReducedMotion();
  const rays = Array.from({ length: 12 });

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden bg-brand-mesh px-6 text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Orbs />

      <div className="relative z-10 flex flex-col items-center">
        <div className="relative flex h-20 w-20 items-center justify-center">
          {!reduce &&
            rays.map((_, idx) => (
              <motion.span
                key={idx}
                className="absolute left-1/2 top-1/2 h-9 w-1 origin-bottom -translate-x-1/2 rounded-full bg-brand-300"
                style={{ rotate: `${idx * 30}deg`, transformOrigin: "50% 150%" }}
                initial={{ scaleY: 0, opacity: 0 }}
                animate={{ scaleY: [0, 1, 0], opacity: [0, 1, 0] }}
                transition={{ duration: 0.7, delay: 0.18 + idx * 0.012, ease: "easeOut" }}
              />
            ))}

          <motion.div
            className="relative flex h-20 w-20 items-center justify-center rounded-full bg-white text-primary shadow-2xl"
            initial={{ scale: 0, rotate: reduce ? 0 : -90 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={reduce ? { duration: 0.3 } : { type: "spring", stiffness: 320, damping: 15 }}
          >
            <motion.svg
              viewBox="0 0 24 24"
              className="h-10 w-10"
              fill="none"
              stroke="currentColor"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <motion.path
                d="M5 13l4 4L19 7"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 0.22, duration: 0.45, ease: "easeOut" }}
              />
            </motion.svg>
          </motion.div>
        </div>

        <motion.h2
          className="mt-7 text-2xl font-bold"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          {title}
        </motion.h2>
        <motion.p
          className="mt-1 inline-flex items-center text-sm text-white/70"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.4 }}
        >
          {subtitle}
          <LoadingDots className="ml-0.5" />
        </motion.p>
      </div>
    </motion.div>
  );
}
