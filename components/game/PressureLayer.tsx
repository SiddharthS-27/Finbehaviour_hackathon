"use client";

import { cn } from "@/lib/utils";
import type { PressureBeat } from "@/lib/sim/types";
import type { Countdown } from "@/lib/hooks/usePressure";

/**
 * ★ The pressure layer.
 *
 * An event that neutrally lists options tests knowledge. An event that presses
 * tests *behaviour*, which is the whole point of Story Mode. These beats are
 * the manipulation vectors from STORY_MODE_EVENTS §1, rendered rather than
 * narrated: social proof as an office ticker, recency as a six-month chart,
 * anchoring as typography, urgency as a clock.
 *
 * A note on colour: charts here are content the player is being *sold*, not
 * their own data, so the line is chalk and only losses take rust. Using mint
 * for a rising stock would tell the player "this is the optimal path" in the
 * app's own colour language — which is a lie the UI should not tell, even when
 * the event is lying.
 */

/* ─────────────────────────── sparkline ─────────────────────────── */

function Sparkline({ series, loss }: { series: number[]; loss: boolean }) {
  if (series.length < 2) return null;

  const w = 100;
  const h = 32;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;

  const points = series
    .map((v, i) => {
      const x = (i / (series.length - 1)) * w;
      const y = h - ((v - min) / span) * (h - 4) - 2;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="h-10 w-full"
      aria-hidden
    >
      <polyline
        points={points}
        fill="none"
        strokeWidth={1.75}
        vectorEffect="non-scaling-stroke"
        className={loss ? "stroke-rust" : "stroke-chalk"}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ──────────────────────── individual beats ─────────────────────── */

function Beat({ beat, reducedMotion }: { beat: PressureBeat; reducedMotion: boolean }) {
  const anim = reducedMotion ? "" : "animate-beat-in";
  const meta = beat.meta ?? {};

  switch (beat.type) {
    case "headline":
      return (
        <div className={cn("border-y border-line bg-surface2 px-3 py-2.5", anim)}>
          <p className="font-display text-[15px] leading-tight font-bold tracking-tight text-chalk">
            {beat.content}
          </p>
        </div>
      );

    case "ticker":
      return (
        <div className={cn("overflow-hidden rounded-sm border border-line bg-surface2/70", anim)}>
          <div className="flex whitespace-nowrap py-1.5">
            {reducedMotion ? (
              <span className="px-3 text-[12px] text-muted-foreground">{beat.content}</span>
            ) : (
              // Duplicated so the marquee's -50% translate loops seamlessly.
              <div className="flex shrink-0 animate-marquee">
                <span className="px-6 text-[12px] text-muted-foreground">{beat.content}</span>
                <span className="px-6 text-[12px] text-muted-foreground">{beat.content}</span>
              </div>
            )}
          </div>
        </div>
      );

    case "chart": {
      const series = Array.isArray(meta.series) ? (meta.series as number[]) : [];
      const loss = meta.tone === "loss";
      return (
        <div className={cn("flex flex-col gap-1 rounded-sm border border-line bg-surface2 p-3", anim)}>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[12px] text-muted-foreground">{beat.content}</span>
            {typeof meta.change === "string" ? (
              <span
                className={cn(
                  "font-mono text-sm font-medium",
                  loss ? "text-rust" : "text-chalk",
                )}
              >
                {meta.change}
              </span>
            ) : null}
          </div>
          <Sparkline series={series} loss={loss} />
          {typeof meta.window === "string" ? (
            // Naming the window is the tell. The debrief comes back to it.
            <span className="font-mono text-[10px] text-muted-foreground">
              showing {meta.window}
            </span>
          ) : null}
        </div>
      );
    }

    case "testimonial":
      return (
        <div className={cn("flex gap-2.5 rounded-sm border border-line bg-surface2 p-3", anim)}>
          <span
            aria-hidden
            className="mt-0.5 size-7 shrink-0 rounded-full border border-line bg-surface"
          />
          <p className="text-[13px] leading-snug text-chalk/90 italic">{beat.content}</p>
        </div>
      );

    case "notification":
      return (
        <div
          className={cn(
            "flex items-start gap-2 rounded-sm border border-line bg-surface/90 px-3 py-2",
            anim,
          )}
        >
          <span aria-hidden className="mt-1 size-1.5 shrink-0 rounded-full bg-rust" />
          <p className="text-[12px] leading-snug text-chalk/80">{beat.content}</p>
        </div>
      );

    case "prefill": {
      // ★ Anchoring, rendered as typography: the number they should accept is
      // enormous, the number that matters is small and grey. This is Event 06
      // done literally.
      const huge = meta.emphasis === "huge";
      return (
        <div className={cn("rounded-sm border border-line bg-surface2 px-3 py-2.5", anim)}>
          <p
            className={cn(
              "font-mono leading-none text-chalk",
              huge ? "text-3xl" : "text-lg",
            )}
            data-money
          >
            {beat.content}
          </p>
          {typeof meta.subtext === "string" ? (
            <p className="mt-2 font-mono text-[11px] text-muted-foreground/70">{meta.subtext}</p>
          ) : null}
          {meta.prefilled ? (
            <div className="mt-2 flex items-center gap-2">
              <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                Amount
              </span>
              <input
                readOnly
                aria-label="Payment amount (pre-filled)"
                value={beat.content}
                className="h-9 w-32 rounded-sm border border-line bg-ink px-2 font-mono text-sm text-chalk"
              />
            </div>
          ) : null}
        </div>
      );
    }

    case "dim":
      // Rendered by PressureDim as a fixed overlay; the caption sits inline.
      return (
        <p className={cn("px-1 text-[12px] text-muted-foreground italic", anim)}>{beat.content}</p>
      );

    default:
      return null;
  }
}

/* ──────────────────────────── the layer ────────────────────────── */

export function PressureLayer({
  beats,
  reducedMotion,
}: {
  beats: PressureBeat[];
  reducedMotion: boolean;
}) {
  // Timers render against the choices, not up here.
  const banner = beats.filter((b) => b.type !== "timer");
  if (banner.length === 0) return null;

  return (
    <div className="flex flex-col gap-2" aria-live="polite">
      {banner.map((beat, i) => (
        <Beat key={`${beat.type}-${i}`} beat={beat} reducedMotion={reducedMotion} />
      ))}
    </div>
  );
}

/**
 * Screen dim — 2:40 a.m., or three sealed envelopes you do not want to open.
 *
 * The bandwidth tax made visual: decisions taken while overloaded are worse,
 * and the UI should feel that way rather than say so.
 */
export function PressureDim({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-40 bg-scrim/45 transition-opacity duration-700"
    />
  );
}

/**
 * ★ The countdown, rendered against the choices.
 *
 * Urgency is the vector that forces System 1 — the whole reason the 2 a.m.
 * call works. It goes rust in the last quarter.
 *
 * It **pauses when the tab is hidden** and says so. Expiring changes nothing
 * mechanically: no choice is auto-taken and none is removed. The pressure was
 * always psychological, and a game that punished a slow reader would be
 * teaching the wrong lesson.
 */
export function PressureCountdown({
  label,
  countdown,
}: {
  label: string;
  countdown: Countdown;
}) {
  const urgent = countdown.fraction <= 0.25;

  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 rounded-sm border px-3 py-2",
        urgent ? "border-rust/60 bg-rust/10" : "border-line bg-surface2",
      )}
      role="timer"
      aria-live="off"
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[12px] text-muted-foreground">
          {countdown.paused ? "Paused — you switched away" : label}
        </span>
        <span
          className={cn(
            "font-mono text-base tabular-nums",
            urgent ? "text-rust" : "text-chalk",
          )}
        >
          {countdown.expired ? "0:00" : formatClock(countdown.remaining)}
        </span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-surface2">
        <div
          className={cn("h-full rounded-full", urgent ? "bg-rust" : "bg-marigold")}
          style={{ width: `${Math.max(0, Math.min(1, countdown.fraction)) * 100}%` }}
        />
      </div>
      {countdown.expired ? (
        <span className="text-[11px] text-muted-foreground">
          Take as long as you need. The clock was the point.
        </span>
      ) : null}
    </div>
  );
}

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
