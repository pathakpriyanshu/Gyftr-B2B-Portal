"use client";

import * as React from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";

/** Shared "confident" easing used across the app's motion. */
export const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Fades + lifts its children into view once (on scroll or mount). */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 18,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: reduce ? 0 : y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Staggers its <StaggerItem> children into view. Animation is driven by
 * variant labels that propagate to the items automatically.
 */
export function Stagger({
  children,
  className,
  gap = 0.07,
  delayChildren = 0.04,
  once = true,
}: {
  children: React.ReactNode;
  className?: string;
  gap?: number;
  delayChildren?: number;
  once?: boolean;
}) {
  return (
    <motion.div
      className={className}
      variants={{ hidden: {}, show: { transition: { staggerChildren: gap, delayChildren } } }}
      initial="hidden"
      whileInView="show"
      viewport={{ once, margin: "-40px" }}
    >
      {children}
    </motion.div>
  );
}

const itemVariants = (reduce: boolean | null, y: number): Variants => ({
  hidden: { opacity: 0, y: reduce ? 0 : y },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
});

/** A single member of a <Stagger>. Inherits the show/hidden state from it. */
export function StaggerItem({
  children,
  className,
  y = 16,
}: {
  children: React.ReactNode;
  className?: string;
  y?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div className={className} variants={itemVariants(reduce, y)}>
      {children}
    </motion.div>
  );
}

/** Three softly pulsing dots — a lightweight "working…" affordance. */
export function LoadingDots({ className }: { className?: string }) {
  return (
    <span className={className} aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="mx-[1px] inline-block h-1 w-1 rounded-full bg-current align-middle"
          animate={{ opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.16, ease: "easeInOut" }}
        />
      ))}
    </span>
  );
}
