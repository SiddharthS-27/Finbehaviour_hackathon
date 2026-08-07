"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useCompoundStore, useHasHydrated } from "@/lib/store";
import { lifeStageLabel, previewIncome } from "@/lib/profile";
import { storyFirstEarner } from "@/content/packs";
import { formatRupees } from "@/lib/format";

/**
 * Start / mode select.
 *
 * Three modes, one live. Historical and Short Bites arrive in Phases 10 and 11
 * and need no new game loop — they are decks fed to the same engine.
 */

interface ModeCard {
  id: string;
  title: string;
  blurb: string;
  meta: string;
  href: string | null;
  soon?: string;
}

const MODES: ModeCard[] = [
  {
    id: "story",
    title: "Story mode",
    blurb: "Twelve months of your salary, and the consequences of month 2 arriving in month 11.",
    meta: "12 months · ~20 min",
    href: "/play/story",
  },
  {
    id: "historical",
    title: "Historical case study",
    blurb: "March 2020. Real market returns. Find out what selling at the bottom actually cost.",
    meta: "6 months · ~10 min",
    href: null,
    soon: "coming soon",
  },
  {
    id: "bites",
    title: "Short bites",
    blurb: "Buy a car in four months without wrecking your runway. One sitting.",
    meta: "4 months · ~5 min",
    href: null,
    soon: "coming soon",
  },
];

function Skeleton() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-6 px-5 pt-16">
      <div className="h-3 w-40 rounded-sm bg-surface2" />
      <div className="h-16 w-64 rounded-sm bg-surface2" />
      <div className="h-6 w-3/4 rounded-sm bg-surface2" />
      <div className="mt-6 flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 w-full rounded-lg bg-surface" />
        ))}
      </div>
    </main>
  );
}

export function StartScreen() {
  const hydrated = useHasHydrated();
  const profile = useCompoundStore((s) => s.profile);
  const onboarded = useCompoundStore((s) => s.onboardingComplete);

  if (!hydrated) return <Skeleton />;

  const startingIncome = previewIncome(storyFirstEarner, profile.incomeTier);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-8 px-5 pt-14 pb-safe">
      <header className="flex flex-col gap-4">
        <p className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
          FinBehaviour · Problem Statement #4
        </p>
        <h1 className="font-display text-6xl leading-[0.95] font-bold text-chalk sm:text-7xl">
          Compound
        </h1>
        <p className="max-w-md font-display text-xl leading-snug text-marigold sm:text-2xl">
          Two years of your money, in twenty minutes.
        </p>
      </header>

      <div className="h-px w-full bg-line" />

      {onboarded ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3">
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[15px] text-chalk">
              {profile.name || "Player"}
            </span>
            <span className="truncate text-[13px] text-muted-foreground">
              {lifeStageLabel(profile.lifeStage)} · {profile.location} ·{" "}
              <span className="font-mono">{formatRupees(startingIncome)}</span>/month
            </span>
          </div>
          <Link
            href="/onboarding"
            className="shrink-0 rounded-sm border border-line px-2 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:text-chalk"
          >
            edit
          </Link>
        </div>
      ) : (
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          You are 23, first job in Chennai,{" "}
          <span className="font-mono text-chalk">₹42,000</span> a month. Every month you decide what
          to do with your salary, life throws something at you, and the consequences arrive later —
          with interest.
        </p>
      )}

      <section className="flex flex-col gap-3">
        {MODES.map((mode) => {
          const locked = !mode.href || !onboarded;
          const body = (
            <>
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-display text-xl font-bold text-chalk">{mode.title}</h2>
                {mode.soon ? (
                  <span className="shrink-0 rounded-sm border border-line px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                    {mode.soon}
                  </span>
                ) : null}
              </div>
              <p className="text-[13px] leading-snug text-muted-foreground">{mode.blurb}</p>
              <p className="font-mono text-[11px] text-muted-foreground">{mode.meta}</p>
            </>
          );

          if (locked) {
            return (
              <div
                key={mode.id}
                aria-disabled
                className={cn(
                  "flex flex-col gap-2 rounded-lg border border-line/60 bg-surface/40 p-4",
                  !mode.href && "opacity-70",
                )}
              >
                {body}
                {mode.href && !onboarded ? (
                  <p className="font-mono text-[11px] text-marigold">Set up your profile first</p>
                ) : null}
              </div>
            );
          }

          return (
            <Link
              key={mode.id}
              href={mode.href!}
              className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-4 transition-colors hover:border-marigold hover:bg-surface2"
            >
              {body}
            </Link>
          );
        })}
      </section>

      <div className="mt-auto flex flex-col gap-3 py-6">
        {!onboarded ? (
          <Link
            href="/onboarding"
            className="touch-target inline-flex items-center justify-center rounded-lg bg-marigold px-6 text-base font-medium text-ink transition-colors hover:bg-marigold/90"
          >
            Start
          </Link>
        ) : null}
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <Link href="/explainer" className="hover:text-chalk">
            Explainer
          </Link>
          <Link href="/swatch" className="hover:text-chalk">
            Design tokens
          </Link>
        </div>
      </div>
    </main>
  );
}
