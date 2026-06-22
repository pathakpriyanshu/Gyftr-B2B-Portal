"use client";

import * as React from "react";
import { useReducedMotion } from "motion/react";

/**
 * Login-page-only interactive backdrop for the dark brand panel.
 *
 * Two layers on one canvas:
 *  1. A constellation of drifting dots that link to neighbours, brighten +
 *     connect to the cursor, and are gently repelled by it.
 *  2. A playful set of "deal coins" (₹500, 6.5%, 🎁 …) that lean/swarm toward
 *     the cursor, spin faster the more the mouse moves, and pop when near — a
 *     tiny voucher game that "plays" as you move the mouse, and bobs on its own.
 */

type Dot = { x: number; y: number; vx: number; vy: number; r: number; a: number };
type Coin = {
  ox: number; // home anchor (fraction of w/h)
  oy: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  angle: number;
  amp: number;
  s1: number;
  s2: number;
  phase: number;
  label: string;
  c1: string;
  c2: string;
  pop: number; // 0..1 proximity pulse
};

const COIN_DEFS: { label: string; c1: string; c2: string }[] = [
  { label: "₹500", c1: "#2874f0", c2: "#1a5fd0" },
  { label: "6.5%", c1: "#ff3f6c", c2: "#e0335c" },
  { label: "₹2K", c1: "#ffffff", c2: "#f3d6e6" },
  { label: "₹1K", c1: "#00704a", c2: "#005238" },
  { label: "8%", c1: "#ff9900", c2: "#e07e00" },
  { label: "%", c1: "#e6007e", c2: "#a30056" },
];

export function InteractiveVoucherField({ className }: { className?: string }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let raf = 0;
    let dots: Dot[] = [];
    let coins: Coin[] = [];
    const pointer = { x: -9999, y: -9999, active: false };

    const LINK = 118;
    const POINTER_R = 195;

    function build() {
      const count = Math.round(Math.min(150, Math.max(46, (w * h) / 9000)));
      dots = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        r: Math.random() * 1.7 + 0.7,
        a: Math.random() * 0.5 + 0.28,
      }));

      // Anchored to the right side + lower margins so the upper-left
      // headline / feature copy stays clear.
      const ANCHORS: [number, number][] = [
        [0.8, 0.15],
        [0.91, 0.31],
        [0.82, 0.47],
        [0.55, 0.74],
        [0.73, 0.86],
        [0.91, 0.67],
      ];
      coins = COIN_DEFS.map((d, i) => {
        const [ox, oy] = ANCHORS[i % ANCHORS.length];
        return {
          ox,
          oy,
          x: ox * w,
          y: oy * h,
          vx: 0,
          vy: 0,
          r: 18 + Math.random() * 5,
          angle: Math.random() * Math.PI,
          amp: 10 + Math.random() * 12,
          s1: 0.4 + Math.random() * 0.4,
          s2: 0.4 + Math.random() * 0.4,
          phase: Math.random() * Math.PI * 2,
          label: d.label,
          c1: d.c1,
          c2: d.c2,
          pop: 0,
        };
      });
    }

    function resize() {
      const rect = parent!.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      if (w === 0 || h === 0) return;
      canvas!.width = Math.floor(w * dpr);
      canvas!.height = Math.floor(h * dpr);
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
      if (reduce) drawStatic();
    }

    function drawCoin(c: Coin) {
      ctx!.save();
      ctx!.translate(c.x, c.y);
      const scale = 1 + c.pop * 0.22;
      // soft glow
      ctx!.shadowColor = c.c1;
      ctx!.shadowBlur = 10 + c.pop * 16;
      ctx!.rotate(c.angle);
      const r = c.r * scale;
      const grad = ctx!.createLinearGradient(-r, -r, r, r);
      grad.addColorStop(0, c.c1);
      grad.addColorStop(1, c.c2);
      ctx!.beginPath();
      ctx!.arc(0, 0, r, 0, Math.PI * 2);
      ctx!.fillStyle = grad;
      ctx!.fill();
      ctx!.lineWidth = 1.5;
      ctx!.strokeStyle = "rgba(255,255,255,0.35)";
      ctx!.stroke();
      ctx!.shadowBlur = 0;
      // counter-rotate the label so text stays upright
      ctx!.rotate(-c.angle);
      const isLight = c.c1 === "#ffffff";
      ctx!.fillStyle = isLight ? "#a30056" : "#fff";
      const fs = r * (c.label.length >= 4 ? 0.46 : 0.66);
      ctx!.font = `700 ${fs}px ui-sans-serif, system-ui, sans-serif`;
      ctx!.textAlign = "center";
      ctx!.textBaseline = "middle";
      ctx!.fillText(c.label, 0, 1);
      ctx!.restore();
    }

    function drawStatic() {
      ctx!.clearRect(0, 0, w, h);
      for (const d of dots) {
        ctx!.beginPath();
        ctx!.fillStyle = `rgba(255,255,255,${d.a})`;
        ctx!.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx!.fill();
      }
      for (const c of coins) {
        c.x = c.ox * w;
        c.y = c.oy * h;
        drawCoin(c);
      }
    }

    let last = performance.now();
    function tick(now: number) {
      const t = now * 0.001;
      last = now;
      ctx!.clearRect(0, 0, w, h);

      // ── dots: drift, wrap, pointer repel ──
      for (const d of dots) {
        d.x += d.vx;
        d.y += d.vy;
        if (d.x < -10) d.x = w + 10;
        else if (d.x > w + 10) d.x = -10;
        if (d.y < -10) d.y = h + 10;
        else if (d.y > h + 10) d.y = -10;
        if (pointer.active) {
          const dx = d.x - pointer.x;
          const dy = d.y - pointer.y;
          const dist = Math.hypot(dx, dy);
          if (dist < POINTER_R && dist > 0.01) {
            const f = (1 - dist / POINTER_R) * 1.9;
            d.x += (dx / dist) * f;
            d.y += (dy / dist) * f;
          }
        }
      }

      // ── links between nearby dots ──
      for (let i = 0; i < dots.length; i++) {
        const a = dots[i];
        for (let j = i + 1; j < dots.length; j++) {
          const b = dots[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.abs(dx) + Math.abs(dy); // cheap pre-cull
          if (dist > LINK) continue;
          const real = Math.hypot(dx, dy);
          if (real < LINK) {
            ctx!.strokeStyle = `rgba(244,114,182,${(1 - real / LINK) * 0.16})`;
            ctx!.lineWidth = 1;
            ctx!.beginPath();
            ctx!.moveTo(a.x, a.y);
            ctx!.lineTo(b.x, b.y);
            ctx!.stroke();
          }
        }
        if (pointer.active) {
          const dx = a.x - pointer.x;
          const dy = a.y - pointer.y;
          const real = Math.hypot(dx, dy);
          if (real < POINTER_R) {
            ctx!.strokeStyle = `rgba(255,255,255,${(1 - real / POINTER_R) * 0.55})`;
            ctx!.lineWidth = 1.1;
            ctx!.beginPath();
            ctx!.moveTo(a.x, a.y);
            ctx!.lineTo(pointer.x, pointer.y);
            ctx!.stroke();
          }
        }
      }

      // ── dots: draw (brighter near pointer) ──
      for (const d of dots) {
        let a = d.a;
        let r = d.r;
        if (pointer.active) {
          const dist = Math.hypot(d.x - pointer.x, d.y - pointer.y);
          if (dist < POINTER_R) {
            const k = 1 - dist / POINTER_R;
            a = Math.min(1, d.a + k * 0.6);
            r = d.r + k * 1.2;
          }
        }
        ctx!.beginPath();
        ctx!.fillStyle = `rgba(255,255,255,${a})`;
        ctx!.arc(d.x, d.y, r, 0, Math.PI * 2);
        ctx!.fill();
      }

      // ── deal coins: bob, lean toward cursor, spin, pop ──
      for (const c of coins) {
        const hx = c.ox * w + Math.sin(t * c.s1 + c.phase) * c.amp;
        const hy = c.oy * h + Math.cos(t * c.s2 + c.phase) * c.amp;
        let tx = hx;
        let ty = hy;
        let near = 0;
        if (pointer.active) {
          const dx = pointer.x - hx;
          const dy = pointer.y - hy;
          const dist = Math.hypot(dx, dy) || 1;
          const pull = Math.min(120, 8500 / dist); // capped attraction
          tx = hx + (dx / dist) * pull;
          ty = hy + (dy / dist) * pull;
          near = Math.max(0, 1 - dist / 260);
        }
        c.vx += (tx - c.x) * 0.055;
        c.vy += (ty - c.y) * 0.055;
        c.vx *= 0.82;
        c.vy *= 0.82;
        c.x += c.vx;
        c.y += c.vy;
        const speed = Math.hypot(c.vx, c.vy);
        c.angle += 0.006 + speed * 0.012;
        c.pop += (near - c.pop) * 0.15;
        drawCoin(c);
      }

      raf = requestAnimationFrame(tick);
    }

    function onMove(e: PointerEvent) {
      const rect = canvas!.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.active = true;
    }
    function onLeave() {
      pointer.active = false;
      pointer.x = -9999;
      pointer.y = -9999;
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(parent);

    if (!reduce) {
      parent.addEventListener("pointermove", onMove);
      parent.addEventListener("pointerleave", onLeave);
      raf = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      parent.removeEventListener("pointermove", onMove);
      parent.removeEventListener("pointerleave", onLeave);
    };
  }, [reduce]);

  return <canvas ref={canvasRef} className={className} aria-hidden />;
}
