"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { SimState } from "@/lib/sim/types";
import { criticalBanner, criticalState } from "@/lib/sim/bandwidth";
import { highInterestDebt } from "@/lib/sim/metrics";
import { formatCompactRupees } from "@/lib/format";
import { badgeById } from "@/lib/sim/gamify";
import { fireDopamine } from "@/lib/confetti";

/**
 * Near-death states.
 *
 * There is **no game over**. The run always finishes twelve months no matter
 * how bad it gets — critical states make the interface hostile instead, and
 * climbing out is the story. Recovery arcs demo better than fail screens, and
 * more importantly they are the true thing to teach: people do climb out.
 *
 * Under reduced motion the transitions and the repeating toasts are dropped —
 * but the information is not. The debt notification becomes a single standing
 * banner rather than disappearing, and the functional slider lock is untouched.
 */

const DEBT_TOAST_MS = 8000;

export function CriticalLayer({
  state,
  reducedMotion,
}: {
  state: SimState;
  reducedMotion: boolean;
}) {
  const critical = criticalState(state);
  const banner = criticalBanner(state);
  // The figure quoted is the expensive debt, which is what triggered this.
  const shoutingDebt = highInterestDebt(state);

  /* ── screen desaturation ──
     Applied to <html> so the whole app drains together, including the sticky
     advance bar. The 600ms transition lives in globals.css, which means
     *recovery* animates for free — colour returning is the emotional peak of a
     good run and deserves the same budget as its loss. */
  useEffect(() => {
    const el = document.documentElement;
    if (critical.desaturation > 0) {
      el.style.setProperty("--sat", String(1 - critical.desaturation));
      el.dataset.critical = "1";
    } else {
      el.dataset.critical = "0";
      el.style.setProperty("--sat", "1");
    }
    return () => {
      el.dataset.critical = "0";
      el.style.removeProperty("--sat");
    };
  }, [critical.desaturation]);

  /* ── debt notification spam ──
     The real psychological pressure of debt is that it keeps interrupting you.
     Repeating toasts are genuinely hostile for anyone with attention or
     vestibular sensitivity, so under reduced motion this becomes the standing
     banner below instead of a stream. */
  useEffect(() => {
    if (!critical.debtCritical || reducedMotion) return;

    const fire = () =>
      toast(`${formatCompactRupees(shoutingDebt)} outstanding`, {
        description: "It compounds whether or not you look at it.",
        duration: 4000,
      });

    fire();
    const id = setInterval(fire, DEBT_TOAST_MS);
    return () => clearInterval(id);
  }, [critical.debtCritical, reducedMotion, shoutingDebt]);

  /* ── badge unlocks ──
     Scale pop plus confetti. `Comeback` is the one that matters: it only fires
     after a genuinely critical month, so it always lands on a recovery. */
  const seenBadges = useRef<string[] | null>(null);
  useEffect(() => {
    // First run seeds the baseline — reloading a save must not replay every
    // badge the player already earned.
    if (seenBadges.current === null) {
      seenBadges.current = [...state.badges];
      return;
    }
    const fresh = state.badges.filter((b) => !seenBadges.current!.includes(b));
    seenBadges.current = [...state.badges];
    if (fresh.length === 0) return;

    for (const id of fresh) {
      const def = badgeById(id);
      toast.success(def?.label ?? id, { description: def?.description });
    }
    void fireDopamine({ reducedMotion });
  }, [state.badges, reducedMotion]);

  if (!banner) return null;

  return (
    <div
      role="status"
      className={cn(
        "flex flex-col gap-1 rounded-lg border px-4 py-3",
        critical.runwayCritical || critical.stressTimed
          ? "border-rust bg-rust/15"
          : "border-rust/50 bg-rust/10",
      )}
    >
      <div className="flex items-center gap-2">
        <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-rust" />
        <span className="font-mono text-[10px] tracking-widest text-rust uppercase">
          {banner.title}
        </span>
      </div>
      <p className="text-[13px] leading-snug text-chalk/90">{banner.body}</p>

      {/* Under reduced motion the toast stream is replaced by a standing line,
          so the information survives without the churn. */}
      {critical.debtCritical && reducedMotion ? (
        <p className="font-mono text-[12px] text-rust">
          {formatCompactRupees(shoutingDebt)} outstanding
        </p>
      ) : null}

      <p className="text-[11px] text-muted-foreground">
        The run does not end. Twelve months, whatever happens.
      </p>
    </div>
  );
}
