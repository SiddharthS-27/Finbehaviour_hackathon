"use client";

import { FlameIcon, CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { DAILY_BITE_COUNT } from "@/lib/bites";

/**
 * The dashboard entry point.
 *
 * Two states and no third. Either today's five are waiting, in which case this
 * is the loudest thing on the home screen below a live run, or they are done,
 * in which case it goes quiet and stops asking. A daily habit that keeps
 * nagging after you have done it is a daily habit people turn off.
 *
 * ── On "glowing" ──────────────────────────────────────────────────────────
 * The pending state actually casts light — border, tint and bloom all breathe
 * together on `bite-pulse`. Reduced motion freezes the cycle on its resting
 * frame, which still glows: a static glow is contrast, not animation, and
 * somebody who asked for less movement did not ask for less legibility.
 */

/** The 0/5 ring. Pure SVG — no library, no layout shift. */
function ProgressRing({
  seen,
  total,
  done,
}: {
  seen: number;
  total: number;
  done: boolean;
}) {
  const size = 46;
  const stroke = 3;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const fraction = total > 0 ? Math.min(1, seen / total) : 0;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--line)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={done ? "var(--mint)" : "var(--marigold)"}
          strokeWidth={stroke}
          strokeLinecap="butt"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
          className="transition-[stroke-dashoffset] duration-500 ease-out motion-reduce:transition-none"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center">
        {done ? (
          <CheckIcon className="text-glow-mint size-5 text-mint" aria-hidden />
        ) : (
          <span className="font-mono text-[12px] text-chalk tabular-nums">
            {seen}/{total}
          </span>
        )}
      </span>
      <span className="sr-only">
        {seen} of {total} bites read today
      </span>
    </div>
  );
}

function StreakFlame({ streak }: { streak: number }) {
  const lit = streak > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 font-mono text-[11px]",
        lit
          ? "glow-soft-marigold text-glow-marigold border-marigold text-marigold"
          : "border-line text-muted-foreground",
      )}
      title={lit ? `${streak}-day streak` : "No streak yet — today starts one"}
    >
      <FlameIcon className="size-3.5" aria-hidden />
      <span className="tabular-nums">{streak}</span>
      <span className="sr-only">day streak</span>
    </span>
  );
}

export function BitesWidget({
  seen,
  streak,
  complete,
  xp,
  onStart,
  onReview,
}: {
  seen: number;
  streak: number;
  complete: boolean;
  /** Total XP banked from bites, all time. Shown once there is some. */
  xp: number;
  onStart: () => void;
  onReview: () => void;
}) {
  return (
    <section
      data-testid="bites-widget"
      data-bites-state={complete ? "complete" : "pending"}
      className={cn(
        "mb-6 flex items-center gap-4 rounded-lg border p-4",
        complete
          ? "border-line bg-surface"
          : "animate-bite-pulse border-marigold bg-marigold/10",
      )}
    >
      <ProgressRing seen={complete ? DAILY_BITE_COUNT : seen} total={DAILY_BITE_COUNT} done={complete} />

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "font-mono text-[10px] tracking-widest uppercase",
              complete ? "text-mint" : "text-marigold",
            )}
          >
            Quick bites
          </span>
          <StreakFlame streak={streak} />
          {xp > 0 ? (
            <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
              {xp} XP banked
            </span>
          ) : null}
        </div>

        <p className="text-[14px] leading-snug text-chalk">
          {complete
            ? "Daily knowledge maxed out. Come back tomorrow."
            : seen > 0
              ? `You are ${seen} of ${DAILY_BITE_COUNT} in. Finish the set.`
              : "Your daily bites are ready."}
        </p>
      </div>

      <button
        type="button"
        data-testid="bites-cta"
        onClick={complete ? onReview : onStart}
        className={cn(
          "touch-target shrink-0 rounded-lg px-4 text-[14px] font-medium transition-all",
          complete
            ? "border border-line text-chalk hover:glow-soft-mint hover:border-mint hover:text-mint"
            : "glow-soft-marigold bg-marigold text-ink hover:glow-marigold",
        )}
      >
        {complete ? "Review" : seen > 0 ? "Resume" : "Start learning"}
      </button>
    </section>
  );
}
