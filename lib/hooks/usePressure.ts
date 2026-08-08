"use client";

import { useEffect, useRef, useState } from "react";
import type { PressureBeat } from "@/lib/sim/types";

/**
 * Timing for the pressure layer.
 *
 * Beats arrive in sequence to build pressure — a chart, then a headline, then
 * a colleague, then a clock. Each individually is a nudge; arriving together
 * they read as confirmation, which is exactly the manipulation being taught.
 */

/**
 * Honours the OS setting, and keeps honouring it if the player changes it
 * mid-session.
 *
 * Under reduced motion everything decorative is swapped for opacity or dropped
 * entirely — but the **timers stay functional**. A countdown is a game
 * mechanic, not an animation, and removing it would change what the event
 * teaches.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

/** True while the tab is in the foreground. */
export function usePageVisible(): boolean {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const onChange = () => setVisible(document.visibilityState === "visible");
    onChange();
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);

  return visible;
}

/**
 * Reveals beats on their `delayMs` schedule.
 *
 * `key` resets the sequence — pass the event id, so moving to a new month
 * replays the pressure from the top rather than showing the previous month's
 * beats already arrived.
 *
 * Under reduced motion every beat is revealed immediately: the *content* is
 * information the player is entitled to, only its staged arrival is motion.
 */
export function useBeatSequence(
  beats: PressureBeat[],
  key: string,
  reducedMotion: boolean,
): PressureBeat[] {
  const [arrivedCount, setArrivedCount] = useState(0);
  const keyRef = useRef(key);

  useEffect(() => {
    keyRef.current = key;

    if (reducedMotion) {
      setArrivedCount(beats.length);
      return;
    }

    setArrivedCount(0);
    const timers = beats.map((beat, i) =>
      setTimeout(() => {
        // Count, not index — beats are authored in ascending delay order, and
        // a later beat must never un-reveal an earlier one.
        setArrivedCount((n) => Math.max(n, i + 1));
      }, Math.max(0, beat.delayMs)),
    );

    return () => timers.forEach(clearTimeout);
  }, [key, beats, reducedMotion]);

  return beats.slice(0, arrivedCount);
}

export interface Countdown {
  /** Whole seconds remaining. */
  remaining: number;
  /** 0..1 of the original duration still left. */
  fraction: number;
  expired: boolean;
  /** True while the clock is held because the tab is in the background. */
  paused: boolean;
}

/**
 * A countdown that **pauses when the tab is hidden**.
 *
 * Edge case 30: do not punish someone who alt-tabbed. The pressure is meant to
 * come from the decision, not from a clock that ran while they were reading
 * their email.
 *
 * `active` false freezes it at full — used so the clock does not start before
 * its beat has actually arrived.
 */
export function useCountdown(seconds: number | null, active: boolean): Countdown | null {
  const visible = usePageVisible();
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const lastTickRef = useRef<number | null>(null);

  useEffect(() => {
    if (seconds === null || !active) {
      setRemainingMs(null);
      lastTickRef.current = null;
      return;
    }
    setRemainingMs((prev) => prev ?? seconds * 1000);
  }, [seconds, active]);

  useEffect(() => {
    if (seconds === null || !active) return;
    if (!visible) {
      // Drop the anchor so the hidden interval is not billed on return.
      lastTickRef.current = null;
      return;
    }

    lastTickRef.current = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      const last = lastTickRef.current ?? now;
      lastTickRef.current = now;
      setRemainingMs((prev) => (prev === null ? null : Math.max(0, prev - (now - last))));
    }, 100);

    return () => clearInterval(id);
  }, [seconds, active, visible]);

  if (seconds === null || remainingMs === null) return null;

  return {
    remaining: Math.ceil(remainingMs / 1000),
    fraction: seconds > 0 ? remainingMs / (seconds * 1000) : 0,
    expired: remainingMs <= 0,
    paused: !visible,
  };
}
