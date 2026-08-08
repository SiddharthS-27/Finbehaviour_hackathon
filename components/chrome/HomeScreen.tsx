"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { isRunComplete, useLedgerStore } from "@/lib/store";
import { useGuard } from "@/lib/hooks/useGuard";
import { usePrefersReducedMotion } from "@/lib/hooks/usePressure";
import { lifeStageLabel, previewIncome } from "@/lib/profile";
import { packForMode, storyFirstEarner } from "@/content/packs";
import { formatRupees } from "@/lib/format";
import { currentStreak, dailyDeck, deckStartFor, isDayComplete, todayKey } from "@/lib/bites";
import { BitesWidget } from "@/components/bites/BitesWidget";
import { BitesFlow } from "@/components/bites/BitesFlow";
import { AppHeader } from "./AppHeader";

/**
 * Home. Pick something to do.
 *
 * ★ Only what exists is on this screen. A card for a mode that is not built
 * would be a promise the app cannot keep in the next ten seconds, and a grid
 * half-full of "coming soon" reads as a prototype rather than a product.
 * `packForMode` decides — when a deck registers, its card appears on its own.
 *
 * A run in progress takes over the top of its card: the most useful thing this
 * screen can say to a returning player is which month they are on.
 */

interface ModeCard {
  id: string;
  /** null means "always available" — the explainer needs no deck. */
  mode: string | null;
  title: string;
  blurb: string;
  meta: string;
  href: string;
}

const CARDS: ModeCard[] = [
  {
    id: "story",
    mode: "story",
    title: "Story mode",
    blurb:
      "Twelve months of your salary, and the consequences of month 2 arriving in month 11.",
    meta: "12 months · ~20 min",
    href: "/play/story",
  },
  {
    id: "historical",
    mode: "historical",
    title: "Historical case study",
    blurb: "March 2020. Real market returns. Find out what selling at the bottom actually cost.",
    meta: "6 months · ~10 min",
    href: "/play/historical",
  },
  {
    id: "bites",
    mode: "bites",
    title: "Short bites",
    blurb: "Buy a car in four months without wrecking your runway. One sitting.",
    meta: "4 months · ~5 min",
    href: "/play/bites",
  },
  {
    id: "explainer",
    mode: null,
    title: "Explainer",
    blurb:
      "Every idea the game uses, written three ways. Look something up before it costs you.",
    meta: "16 concepts · read anytime",
    href: "/explainer",
  },
];

function Skeleton() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-4 px-5 pt-6">
      <div className="h-9 w-full rounded-sm bg-surface2" />
      <div className="h-20 w-full rounded-lg bg-surface" />
      {[0, 1].map((i) => (
        <div key={i} className="h-28 w-full rounded-lg bg-surface" />
      ))}
    </main>
  );
}

export function HomeScreen() {
  const router = useRouter();
  const { ready } = useGuard({ requireAuth: true, requireOnboarded: true });
  const reducedMotion = usePrefersReducedMotion();

  const profile = useLedgerStore((s) => s.profile);
  const run = useLedgerStore((s) => s.run);
  const startRun = useLedgerStore((s) => s.startRun);

  const bites = useLedgerStore((s) => s.bites);
  const recordBiteProgress = useLedgerStore((s) => s.recordBiteProgress);
  const completeDailyBites = useLedgerStore((s) => s.completeDailyBites);

  /* ★ The clock is read in an effect, never during render.
     `todayKey()` on the server and `todayKey()` in the browser can disagree
     across a timezone or a midnight, and a hydration mismatch on the dashboard
     is the one place it would be most visible. Null until mounted. */
  const [today, setToday] = useState<string | null>(null);
  const [bitesOpen, setBitesOpen] = useState(false);
  /** Review restarts the deck from the top instead of resuming. */
  const [bitesStart, setBitesStart] = useState(0);

  useEffect(() => setToday(todayKey()), []);

  if (!ready) return <Skeleton />;

  const startingIncome = previewIncome(storyFirstEarner, profile.incomeTier);
  const live = run && !isRunComplete(run) ? run : null;
  const finished = run && isRunComplete(run) ? run : null;

  const available = CARDS.filter((c) => c.mode === null || Boolean(packForMode(c.mode)));

  /* Quick bites. Everything here is derived, and all of it waits on `today`. */
  const bitesComplete = today ? isDayComplete(bites.lastCompletedDay, today) : false;
  const bitesSeen = today && bites.day === today ? bites.seen : 0;
  const streak = today ? currentStreak(bites, today) : 0;
  const deck = today ? dailyDeck(deckStartFor(bites, today)) : [];

  return (
    <main
      data-testid="home"
      data-live-run={live ? live.mode : ""}
      className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-5 pt-5 pb-safe"
    >
      <AppHeader />

      <div className="flex flex-col gap-2 pb-6">
        <h1 className="font-display text-3xl leading-tight font-bold text-chalk sm:text-4xl">
          {profile.name ? `Hello, ${profile.name}.` : "Hello."}
        </h1>
        <p className="text-[14px] leading-snug text-muted-foreground">
          {lifeStageLabel(profile.lifeStage)} · {profile.location} ·{" "}
          <span className="font-mono text-chalk">{formatRupees(startingIncome)}</span> a month
        </p>
      </div>

      {/* ★ A run in progress is the first thing on the screen and the biggest
          control. Everything is saved on this device already; this is how you
          get back to it. */}
      {live ? (
        <section
          data-testid="resume"
          className="mb-6 flex flex-col gap-3 rounded-lg border border-marigold/60 bg-marigold/10 p-4"
        >
          <div className="flex flex-col gap-1">
            <span className="font-mono text-[10px] tracking-widest text-marigold uppercase">
              Saved run
            </span>
            <p className="text-[15px] leading-snug text-chalk">
              You are on month{" "}
              <span className="font-mono">
                {Math.min(live.state.month, live.state.totalMonths)}
              </span>{" "}
              of <span className="font-mono">{live.state.totalMonths}</span>.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/play/${live.mode}`}
              className="touch-target flex items-center rounded-lg bg-marigold px-5 font-medium text-ink transition-colors hover:bg-marigold/90"
            >
              Continue
            </Link>
            <button
              type="button"
              data-testid="restart"
              onClick={() => {
                startRun(live.mode);
                router.push(`/play/${live.mode}`);
              }}
              className="touch-target rounded-lg border border-line px-5 text-chalk transition-colors hover:border-rust hover:text-rust"
            >
              Start over
            </button>
          </div>
        </section>
      ) : null}

      {finished ? (
        <Link
          href={`/report/${finished.mode}`}
          data-testid="last-report"
          className="mb-6 flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3 transition-colors hover:border-mint"
        >
          <div className="flex min-w-0 flex-col">
            <span className="font-mono text-[10px] tracking-widest text-mint uppercase">
              Last run
            </span>
            <span className="truncate text-[14px] text-chalk">
              All {finished.state.totalMonths} months played — read the report
            </span>
          </div>
          <span aria-hidden className="shrink-0 text-mint">
            →
          </span>
        </Link>
      ) : null}

      {/* ★ The daily habit. Rendered only once the clock has been read on the
          client, so the widget never paints yesterday's state for a frame. */}
      {today ? (
        <BitesWidget
          seen={bitesSeen}
          streak={streak}
          complete={bitesComplete}
          xp={bites.xp}
          onStart={() => {
            setBitesStart(bitesSeen);
            setBitesOpen(true);
          }}
          onReview={() => {
            setBitesStart(0);
            setBitesOpen(true);
          }}
        />
      ) : null}

      <section className="flex flex-col gap-3">
        {available.map((card) => {
          const isLive = live?.mode === card.mode;
          return (
            <Link
              key={card.id}
              href={card.href}
              data-mode-card={card.id}
              className={cn(
                "flex flex-col gap-2 rounded-lg border bg-surface p-4 transition-colors",
                isLive
                  ? "border-marigold/50 hover:border-marigold"
                  : "border-line hover:border-marigold hover:bg-surface2",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-display text-xl font-bold text-chalk">{card.title}</h2>
                {isLive ? (
                  <span className="shrink-0 rounded-sm border border-marigold/50 px-1.5 py-0.5 font-mono text-[10px] text-marigold">
                    in progress
                  </span>
                ) : null}
              </div>
              <p className="text-[13px] leading-snug text-muted-foreground">{card.blurb}</p>
              <p className="font-mono text-[11px] text-muted-foreground">{card.meta}</p>
            </Link>
          );
        })}
      </section>

      <div className="py-8" />

      {bitesOpen && today ? (
        <BitesFlow
          deck={deck}
          startIndex={bitesStart}
          streak={streak}
          reducedMotion={reducedMotion}
          onProgress={(seen) => recordBiteProgress(today, seen)}
          onComplete={() => completeDailyBites(today)}
          onClose={() => setBitesOpen(false)}
        />
      ) : null}
    </main>
  );
}
