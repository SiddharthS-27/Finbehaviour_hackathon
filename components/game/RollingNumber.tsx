"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { formatDelta, formatRupees } from "@/lib/format";

/**
 * Money that rolls up when it changes — one of the four motion moments.
 *
 * Hand-rolled on rAF rather than a spring library, because the value has to be
 * rounded to whole rupees on every frame. Money that shows paise mid-animation
 * reads as a bug, and money that jitters horizontally cannot be read at all —
 * which is why every amount is set in tabular figures.
 *
 * Under reduced motion the final value is set immediately. No easing, no
 * counting, no exception.
 */
export function RollingNumber({
  value,
  durationMs = 900,
  signed = false,
  reducedMotion = false,
  className,
}: {
  value: number;
  durationMs?: number;
  signed?: boolean;
  reducedMotion?: boolean;
  className?: string;
}) {
  const [shown, setShown] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (reducedMotion || durationMs <= 0) {
      fromRef.current = value;
      setShown(value);
      return;
    }

    const from = fromRef.current;
    const delta = value - from;
    if (delta === 0) return;

    const start = performance.now();
    // ease-out cubic: fast commitment, gentle settle
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      setShown(Math.round(from + delta * ease(t)));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = value;
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      fromRef.current = value;
    };
  }, [value, durationMs, reducedMotion]);

  return (
    <span data-money className={cn("font-mono tabular-nums", className)}>
      {signed ? formatDelta(shown) : formatRupees(shown)}
    </span>
  );
}
