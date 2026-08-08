"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  isRunComplete,
  marketFor,
  optimalForRun,
  packForRun,
  useLedgerStore,
  useHasHydrated,
} from "@/lib/store";
import { choiceById, eventForMonth } from "@/lib/sim/deck";
import { availableDiscretionary, netWorth } from "@/lib/sim/metrics";
import { createInitialState } from "@/lib/sim/engine";
import { packForMode } from "@/content/packs";
import { TimelineRibbon } from "./TimelineRibbon";
import { StatBars } from "./StatBars";
import { AllocationPanel } from "./AllocationPanel";
import { EventCardView, QuietMonthCard } from "./EventCard";
import { MonthResult } from "./MonthResult";
import { CoachBubble } from "./CoachBubble";
import { usePrefersReducedMotion } from "@/lib/hooks/usePressure";
import { useCoachLine } from "@/lib/hooks/useAi";
import { coachFacts } from "@/lib/ai/facts";
import { CRITICAL, criticalState, lockedSlider } from "@/lib/sim/bandwidth";
import { AppHeader } from "@/components/chrome/AppHeader";
import { CriticalLayer } from "./CriticalLayer";
import { DevPanel } from "./DevPanel";
import { NetWorthChart } from "./NetWorthChart";

/**
 * ★ ONE game screen, all three modes.
 *
 * Story, Historical and Short Bites are three decks fed to the same engine.
 * If a second game loop ever appears, something has gone wrong — see
 * CLAUDE.md rule 5.
 *
 * A month runs in three phases: allocate → event → resolved. That ordering
 * mirrors the engine's own step order, where allocation (step 6) settles
 * before the event resolves (step 7).
 */

function Skeleton() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-4 px-4 pt-6">
      <div className="h-11 w-full rounded-sm bg-surface2" />
      <div className="h-20 w-full rounded-lg bg-surface" />
      <div className="grid grid-cols-2 gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-lg bg-surface" />
        ))}
      </div>
      <div className="h-64 w-full rounded-lg bg-surface" />
    </main>
  );
}

export function PlayScreen({ mode }: { mode: string }) {
  const router = useRouter();
  const hydrated = useHasHydrated();
  const reducedMotion = usePrefersReducedMotion();

  const onboarded = useLedgerStore((s) => s.onboardingComplete);
  const profile = useLedgerStore((s) => s.profile);
  const run = useLedgerStore((s) => s.run);
  const isResolving = useLedgerStore((s) => s.isResolving);
  const startRun = useLedgerStore((s) => s.startRun);
  const setAllocation = useLedgerStore((s) => s.setAllocation);
  const setChoice = useLedgerStore((s) => s.setChoice);
  const goToEventPhase = useLedgerStore((s) => s.goToEventPhase);
  const resolveMonth = useLedgerStore((s) => s.resolveMonth);
  const nextMonth = useLedgerStore((s) => s.nextMonth);

  const complete = isRunComplete(run);

  /* Guards. Onboarding first, then a valid mode, then a run to play. */
  useEffect(() => {
    if (!hydrated) return;
    if (!onboarded) {
      router.replace("/onboarding");
      return;
    }
    if (!packForMode(mode)) {
      router.replace("/");
      return;
    }
    if (!run || run.mode !== mode) startRun(mode);
  }, [hydrated, onboarded, mode, run, router, startRun]);

  /* A finished run belongs on the report, not here. (Edge case 23.) */
  useEffect(() => {
    if (!run) return;
    if (complete && run.phase !== "resolved") router.replace(`/report/${mode}`);
  }, [complete, run, mode, router]);

  const derived = useMemo(() => {
    if (!run) return null;
    const pack = packForRun(run);
    const market = marketFor(run);
    const event = complete ? null : eventForMonth(pack, run.state.month, run.state);
    const openingNetWorth = netWorth(createInitialState(pack, run.seed));
    // ★ Recomputed from the seed, memoised in the store, never persisted.
    //   The agent plays this exact pack against this exact market.
    const optimal = optimalForRun(run);
    return { pack, market, event, openingNetWorth, optimal };
  }, [run, complete]);

  /* ── the coach ──
     Built above the hydration guard because hooks cannot be called after an
     early return. The key is seed + month + choice, so advancing a month
     invalidates any answer still in flight: five fast months must never show
     month 2's line under month 5's result. (Edge case 15.) */
  const coach = useMemo(() => {
    if (!run || !derived || run.phase !== "resolved") return null;
    const record = run.state.history[run.state.history.length - 1];
    if (!record) return null;
    const previousNetWorth =
      run.state.history[run.state.history.length - 2]?.netWorthEnd ?? derived.openingNetWorth;

    return {
      key: `${run.seed}:${record.month}:${record.choiceId ?? "-"}`,
      request: coachFacts({
        pack: derived.pack,
        state: run.state,
        record,
        previousNetWorth,
        literacyLevel: profile.literacyLevel,
      }),
    };
  }, [run, derived, profile.literacyLevel]);

  const { text: coachAi, pending: coachPending } = useCoachLine(
    coach?.key ?? null,
    coach?.request ?? null,
  );

  if (!hydrated || !run || !derived) return <Skeleton />;

  const { pack, event, openingNetWorth, optimal } = derived;
  const state = run.state;
  const history = state.history;
  const lastRec = history[history.length - 1] ?? null;
  const prevNetWorth = history[history.length - 2]?.netWorthEnd ?? openingNetWorth;

  /* ★ Near-death states. Both derived from the engine, never from the UI, so
     the shadow agent in Phase 7 faces exactly what the player faces. */
  const critical = criticalState(state);
  const lock = lockedSlider(state);

  const available = availableDiscretionary(state);
  const used =
    run.allocation.discretionarySpend +
    run.allocation.toEmergencyFund +
    run.allocation.toInvest +
    run.allocation.extraDebtPayment;
  const unallocated = Math.max(0, available - used);

  /* The event that produced the record we are showing — the state has already
     moved on, so this reads from the deck by month, not by current state. */
  const resolvedEvent =
    lastRec?.eventId ? (pack.events.find((e) => e.id === lastRec.eventId) ?? null) : null;
  const resolvedChoice =
    resolvedEvent && lastRec?.choiceId ? choiceById(resolvedEvent, lastRec.choiceId) : null;

  /* The authored fallback is what renders. A generated line replaces it when
     one arrives, and when none does nothing happens and nobody is told — a
     missing coach line is not an error state. (CLAUDE.md rule 4.) */
  const coachFallback =
    resolvedChoice?.fallbackNote ??
    "Nothing landed this month. Salary in, bills out — and quiet months are where the compounding actually happens.";

  const coachText = coachAi ?? coachFallback;

  /* ── the single advance control, per phase ── */
  const cta = (() => {
    if (run.phase === "allocate") {
      return {
        label: available === 0 ? "Continue" : "Continue",
        disabled: unallocated !== 0,
        hint: unallocated !== 0 ? "Allocate everything before you continue." : null,
        onClick: goToEventPhase,
      };
    }
    if (run.phase === "event") {
      const needsChoice = Boolean(event) && !run.choiceId;
      return {
        label: isResolving ? "Resolving…" : "Advance the month",
        disabled: needsChoice || isResolving,
        hint: needsChoice ? "Pick one." : null,
        onClick: resolveMonth,
      };
    }
    if (complete) {
      return {
        label: "See your report",
        disabled: false,
        hint: null,
        onClick: () => router.push(`/report/${mode}`),
      };
    }
    return { label: "Next month", disabled: false, hint: null, onClick: nextMonth };
  })();

  const shownMonth = Math.min(state.month, state.totalMonths);

  return (
    <main
      className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 pt-5"
      // Machine-readable run state. The end-to-end gate asserts against these
      // rather than scraping button labels, so copy changes cannot silently
      // turn the checks into no-ops.
      data-phase={run.phase}
      data-month={state.month}
      data-seed={run.seed}
      data-unallocated={unallocated}
      data-available={available}
      data-reduced-motion={reducedMotion ? "1" : "0"}
      data-critical={critical.any ? "1" : "0"}
      data-locked-slider={lock?.key ?? ""}
      data-coach-source={coachAi ? "ai" : "fallback"}
      data-coach-pending={coachPending ? "1" : "0"}
    >
      {/* ★ Back leaves the run exactly where it is. Zustand persist has already
          written every decision to this device, so "save" is not an action
          anybody has to take — but the button has to *say* so, or leaving mid
          run feels like losing it. */}
      <AppHeader backHref="/home" backLabel="Home" eyebrow={pack.title} />

      {/* ★ the signature element */}
      <TimelineRibbon
        totalMonths={state.totalMonths}
        currentMonth={run.phase === "resolved" ? state.month - 1 : state.month}
        records={history}
        below={
          <NetWorthChart
            totalMonths={state.totalMonths}
            openingNetWorth={openingNetWorth}
            records={history}
            optimal={optimal}
            reducedMotion={reducedMotion}
          />
        }
      />

      <div className="flex flex-col gap-4 pt-4 pb-40">
        <StatBars state={state} />

        <CriticalLayer state={state} reducedMotion={reducedMotion} />
        <DevPanel />

        {run.phase === "allocate" && (
          <>
            <h1 className="font-display text-3xl font-bold text-chalk">Month {shownMonth}</h1>
            <AllocationPanel
              state={state}
              allocation={run.allocation}
              onChange={setAllocation}
              lockedKey={lock?.key ?? null}
              lockedReason={lock?.reason}
            />
          </>
        )}

        {run.phase === "event" &&
          (event ? (
            <EventCardView
              event={event}
              state={state}
              selectedChoiceId={run.choiceId}
              onSelect={setChoice}
              disabled={isResolving}
              reducedMotion={reducedMotion}
              forcedTimerSeconds={critical.stressTimed ? CRITICAL.timedChoiceSeconds : null}
            />
          ) : (
            <QuietMonthCard month={shownMonth} />
          ))}

        {run.phase === "resolved" && lastRec && (
          <>
            <MonthResult
              record={lastRec}
              previousNetWorth={prevNetWorth}
              event={resolvedEvent}
              choiceLabel={resolvedChoice?.label ?? null}
              reducedMotion={reducedMotion}
            />
            <CoachBubble
              text={coachText}
              pending={coachPending}
              source={coachAi ? "ai" : "fallback"}
            />
          </>
        )}
      </div>

      {/* Sticky advance. `pb-safe` clears the iOS home indicator. */}
      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-ink/95 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-xl flex-col gap-1.5 px-4 pt-3 pb-safe">
          {cta.hint ? (
            <p className="text-center text-[12px] text-muted-foreground">{cta.hint}</p>
          ) : null}
          <button
            type="button"
            onClick={cta.onClick}
            disabled={cta.disabled}
            className={cn(
              "touch-target w-full rounded-lg px-6 text-base font-medium transition-colors",
              cta.disabled
                ? "cursor-not-allowed bg-surface2 text-muted-foreground"
                : "bg-marigold text-ink hover:bg-marigold/90",
            )}
          >
            {cta.label}
          </button>
        </div>
      </div>
    </main>
  );
}
