"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronUpIcon, ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRupees } from "@/lib/format";
import { conceptById } from "@/content/concepts";
import type { Bite, BiteDemo } from "@/content/bites";

/**
 * The two faces of a bite: the card front, and the sheet that slides over it.
 *
 * Both are presentational. Every gesture, every piece of state that decides
 * *which* card is showing, lives in `BitesFlow` — this file only knows how a
 * bite looks.
 */

/* ──────────────────────────── the front ─────────────────────────────── */

export function BiteFace({ bite, hintVisible }: { bite: Bite; hintVisible: boolean }) {
  return (
    // ★ The card is lit from its own edge. This is the Gen Z surface, so it is
    //   the one place in the app that spends contrast freely.
    <div className="glow-soft-marigold relative flex h-full flex-col items-center justify-between overflow-hidden rounded-lg border border-marigold/35 bg-surface p-6 text-center select-none">
      {/* A wash behind the type so the panel is not a flat rectangle. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_55%_at_50%_-10%,color-mix(in_oklab,var(--marigold)_9%,transparent),transparent_70%)]"
      />

      <span className="relative rounded-sm border border-line bg-surface2 px-2 py-1 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
        Level {bite.level} · {bite.category}
      </span>

      {/* ★ The hook is the card. Nothing competes with it. */}
      <div className="relative flex flex-1 flex-col items-center justify-center gap-5 py-6">
        <p className="text-glow-chalk font-display text-[27px] leading-[1.12] font-bold text-balance text-chalk sm:text-[32px]">
          {bite.hook}
        </p>
        <span className="glow-marigold text-glow-marigold rounded-sm border border-marigold bg-marigold/15 px-3 py-1.5 font-mono text-[12px] font-medium tracking-wide text-marigold uppercase">
          {bite.term}
        </span>
      </div>

      <span
        className={cn(
          "relative flex flex-col items-center gap-1 text-[12px] text-muted-foreground transition-opacity",
          hintVisible ? "opacity-100" : "opacity-0",
        )}
        aria-hidden
      >
        <ChevronUpIcon className="text-glow-marigold size-4 animate-bite-hint text-marigold" />
        Swipe up to reveal the truth
      </span>
    </div>
  );
}

/* ─────────────────────── the show-don't-tell demo ───────────────────── */

/**
 * ★ One year, fast-forwarded, before a word of explanation.
 *
 * Reading "a liability takes money out of your pocket" teaches nobody
 * anything. Picking the sneakers and watching ₹5,000 become ₹500 does. The
 * numbers are authored on the bite — nothing here computes a return.
 */
function Demo({ demo }: { demo: BiteDemo }) {
  const [picked, setPicked] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-line bg-surface2/60 p-4">
      <p className="text-[14px] leading-snug text-chalk">{demo.prompt}</p>

      <div className="grid grid-cols-2 gap-2">
        {demo.options.map((o) => {
          const chosen = picked === o.id;
          return (
            <button
              key={o.id}
              type="button"
              disabled={revealed}
              onClick={() => setPicked(o.id)}
              className={cn(
                "touch-target flex flex-col items-start gap-1 rounded-lg border px-3 py-2 text-left transition-colors",
                chosen
                  ? "border-marigold bg-marigold/12 text-chalk"
                  : "border-line bg-surface text-chalk hover:border-marigold/50",
                revealed && !chosen && "opacity-55",
              )}
            >
              <span className="text-[13px] leading-snug">{o.label}</span>
              <span className="font-mono text-[12px] text-muted-foreground">
                {formatRupees(demo.stake)}
              </span>
            </button>
          );
        })}
      </div>

      {!revealed ? (
        <button
          type="button"
          disabled={!picked}
          onClick={() => setRevealed(true)}
          className={cn(
            "touch-target rounded-lg px-4 text-[14px] font-medium transition-colors",
            picked
              ? "bg-marigold text-ink hover:bg-marigold/90"
              : "cursor-not-allowed bg-surface2 text-muted-foreground",
          )}
        >
          {picked ? "Fast-forward twelve months" : "Pick one first"}
        </button>
      ) : (
        <div className="flex flex-col gap-2">
          <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
            Twelve months later
          </span>
          {demo.options.map((o) => {
            const chosen = picked === o.id;
            const grew = o.afterOneYear >= demo.stake;
            return (
              <div
                key={o.id}
                className={cn(
                  "flex flex-col gap-1 rounded-lg border p-3",
                  chosen ? "border-marigold/60 bg-marigold/8" : "border-line bg-surface",
                )}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[13px] text-chalk">
                    {o.label}
                    {chosen ? (
                      <span className="ml-2 font-mono text-[10px] tracking-widest text-marigold uppercase">
                        you
                      </span>
                    ) : null}
                  </span>
                  {/* Colour carries data: mint is the path that worked out. */}
                  <span
                    className={cn(
                      "font-mono text-[15px] tabular-nums",
                      grew ? "text-mint" : "text-rust",
                    )}
                  >
                    {formatRupees(o.afterOneYear)}
                  </span>
                </div>
                <p className="text-[12px] leading-snug text-muted-foreground">{o.verdict}</p>
              </div>
            );
          })}
          <p className="text-[13px] leading-snug text-chalk/85">{demo.closing}</p>
        </div>
      )}
    </section>
  );
}

/* ─────────────────────── the expanded sheet body ────────────────────── */

export function BiteDetail({
  bite,
  onClose,
  onHandlePointerDown,
}: {
  bite: Bite;
  onClose: () => void;
  /**
   * ★ Drag starts here and nowhere else.
   *
   * With the drag listener on the whole sheet, scrolling the mechanics text
   * pulls the sheet shut instead — the two gestures are the same gesture. The
   * handle is the only surface that moves it.
   */
  onHandlePointerDown?: (e: React.PointerEvent) => void;
}) {
  const concept = bite.concept ? conceptById(bite.concept) : undefined;

  return (
    <div className="flex h-full flex-col">
      <div
        onPointerDown={onHandlePointerDown}
        className="flex shrink-0 cursor-grab touch-none flex-col items-center gap-2 pt-3 pb-2 active:cursor-grabbing"
      >
        <span aria-hidden className="h-1 w-10 rounded-full bg-line" />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6">
        <div className="flex flex-col gap-5">
          <header className="flex flex-col gap-2">
            <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
              Level {bite.level} · {bite.category}
            </span>
            <h2 className="text-glow-marigold font-display text-[26px] leading-tight font-bold text-marigold">
              {bite.term}
            </h2>
          </header>

          {bite.demo ? <Demo demo={bite.demo} /> : null}

          <section className="flex flex-col gap-2">
            <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
              The mechanics
            </span>
            <p className="text-[15px] leading-relaxed text-chalk/90">{bite.mechanics}</p>
          </section>

          {/* ★ The golden rule is mint, and that is not decoration: mint is the
              optimal path everywhere else in this app, and this is the line
              that tells you what the optimal path is. */}
          <section className="glow-mint flex flex-col gap-2 rounded-lg border border-mint bg-mint/12 p-4">
            <span className="text-glow-mint font-mono text-[10px] tracking-widest text-mint uppercase">
              The golden rule
            </span>
            <p className="text-[15px] leading-snug font-medium text-chalk">{bite.goldenRule}</p>
          </section>

          {concept ? (
            <Link
              href="/explainer"
              className="text-[13px] text-marigold underline-offset-4 hover:underline"
            >
              Read the full explainer on {concept.name.toLowerCase()} →
            </Link>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-center gap-2 border-t border-line px-5 py-3 pb-safe">
        <button
          type="button"
          onClick={onClose}
          className="touch-target flex items-center gap-1.5 rounded-lg px-4 text-[13px] text-muted-foreground transition-colors hover:text-chalk"
        >
          <ChevronDownIcon className="size-4" aria-hidden />
          Swipe down to close
        </button>
      </div>
    </div>
  );
}
