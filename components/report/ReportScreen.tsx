"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  isRunComplete,
  marketFor,
  optimalForRun,
  packForRun,
  useLedgerStore,
  useHasHydrated,
} from "@/lib/store";
import { createInitialState } from "@/lib/sim/engine";
import { netWorth } from "@/lib/sim/metrics";
import { whatIf } from "@/lib/sim/counterfactual";
import { buildReport } from "@/lib/ai/fallbacks";
import { scoreDiagnostic } from "@/content/diagnostic";
import { packForMode } from "@/content/packs";
import { TimelineRibbon } from "@/components/game/TimelineRibbon";
import { NetWorthChart } from "@/components/game/NetWorthChart";
import { usePrefersReducedMotion } from "@/lib/hooks/usePressure";
import { useAiReport } from "@/lib/hooks/useAi";
import { reportFacts } from "@/lib/ai/facts";
import { mergeAiReport } from "@/lib/ai/merge";
import { AppHeader } from "@/components/chrome/AppHeader";
import { WhatIfPanel } from "./WhatIfPanel";
import {
  ArchetypeCard,
  BadgeShelf,
  ClosingLine,
  CostliestDecisions,
  DecisionGrid,
  GapAnnotation,
  MasteryChips,
  StrengthsAndNext,
  TheoryPracticeGap,
} from "./ReportSections";

/**
 * ★ ONE report screen, all three modes.
 *
 * **Every number here is computed, never generated.** The archetype comes from
 * deterministic rules, the gap from the shadow agent, the costliest months from
 * replayed counterfactuals. Delete `GEMINI_API_KEY` and the page is unchanged
 * apart from its prose — which is what Phase 8 shipped, on purpose, before any
 * of this existed. (CLAUDE.md rule 4.)
 *
 * `/api/report` may rewrite the *words*: archetype copy, the lesson under each
 * costly decision, the strengths, the learn-next reasons, the closing line.
 * `mergeAiReport` is the wall — it never reads a figure out of a model reply.
 */

function Skeleton() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-4 px-4 pt-6">
      <div className="h-11 w-2/3 rounded-sm bg-surface2" />
      <div className="h-24 w-full rounded-lg bg-surface" />
      <div className="h-32 w-full rounded-lg bg-surface" />
    </main>
  );
}

export function ReportScreen({ mode }: { mode: string }) {
  const router = useRouter();
  const hydrated = useHasHydrated();
  const reducedMotion = usePrefersReducedMotion();

  const run = useLedgerStore((s) => s.run);
  const profile = useLedgerStore((s) => s.profile);
  const answers = useLedgerStore((s) => s.diagnosticAnswers);
  const startRun = useLedgerStore((s) => s.startRun);

  /** The month whose alternatives are open, and which one is being previewed. */
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [altChoiceId, setAltChoiceId] = useState<string | null>(null);

  const complete = isRunComplete(run);

  const derived = useMemo(() => {
    if (!run || !complete) return null;
    const pack = packForRun(run);
    const market = marketFor(run);
    const optimal = optimalForRun(run);
    const openingNetWorth = netWorth(createInitialState(pack, run.seed));

    return {
      pack,
      market,
      optimal,
      openingNetWorth,
      report: buildReport({
        pack,
        seed: run.seed,
        market,
        state: run.state,
        optimal,
        openingNetWorth,
        diagnostic: scoreDiagnostic(answers),
      }),
    };
  }, [run, complete, answers]);

  /* Every alternative for the open month, each fully replayed. Three engine
     runs of twelve steps — cheaper than the render that displays them. */
  const alternatives = useMemo(() => {
    if (!derived || !run || selectedMonth === null) return [];
    const event = derived.pack.events.find((e) => e.month === selectedMonth);
    if (!event) return [];
    return event.choices.map((choice) =>
      whatIf(
        derived.pack,
        run.seed,
        derived.market,
        run.state.history,
        selectedMonth,
        choice.id,
      ),
    );
  }, [derived, run, selectedMonth]);

  /* ── the optional half ──
     `/api/report` is asked to rewrite the *prose* around figures it is handed.
     Every number stays the deterministic one; the merge below refuses anything
     that does not line up. If it never answers, this page is exactly what
     Phase 8 shipped — which is already complete. (CLAUDE.md rule 4.) */
  const aiRequest = useMemo(
    () =>
      derived
        ? reportFacts({ report: derived.report, literacyLevel: profile.literacyLevel })
        : null,
    [derived, profile.literacyLevel],
  );

  const { report: ai, pending: aiPending } = useAiReport(
    run && derived ? `${run.packId}:${run.seed}:${run.state.history.length}` : null,
    aiRequest,
  );

  const merged = useMemo(
    () => (derived ? mergeAiReport(derived.report, ai) : null),
    [derived, ai],
  );

  if (!hydrated) return <Skeleton />;

  /* No finished run to report on. Say what happened and what to do next. */
  if (!run || !derived) {
    const knownMode = Boolean(packForMode(mode));
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-4 px-4 pt-6">
        <h1 className="font-display text-3xl font-bold text-chalk">Nothing to report yet</h1>
        <p className="text-[14px] leading-relaxed text-chalk/80">
          {run && !complete
            ? "This run is still going. Finish the twelve months and the report writes itself."
            : "There is no finished run saved on this device."}
        </p>
        <div className="flex flex-wrap gap-2">
          {run && !complete ? (
            <Link
              href={`/play/${mode}`}
              className="touch-target flex items-center rounded-lg bg-marigold px-5 font-medium text-ink"
            >
              Back to the run
            </Link>
          ) : knownMode ? (
            <button
              type="button"
              onClick={() => {
                startRun(mode);
                router.push(`/play/${mode}`);
              }}
              className="touch-target rounded-lg bg-marigold px-5 font-medium text-ink"
            >
              Start a run
            </button>
          ) : null}
          <Link
            href="/home"
            className="touch-target flex items-center rounded-lg border border-line px-5 text-chalk"
          >
            Back to home
          </Link>
        </div>
      </main>
    );
  }

  const { pack, optimal, openingNetWorth } = derived;
  // The merged report is the deterministic one with generated prose swapped in
  // where it survived validation. Identical to `derived.report` with no key.
  const report = merged ?? derived.report;
  const state = run.state;

  const selectedRecord =
    selectedMonth === null ? null : (state.history[selectedMonth - 1] ?? null);
  const previewed = alternatives.find((a) => a.choiceId === altChoiceId) ?? null;

  return (
    <main
      className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 pt-5 pb-16"
      data-testid="report"
      data-mode={mode}
      data-archetype={report.archetype.id}
      data-gap={report.summary.gapRupees}
      data-beat-agent={report.beatTheAgent ? "1" : "0"}
      data-whatif-month={selectedMonth ?? ""}
      data-whatif-choice={altChoiceId ?? ""}
      data-report-source={report.source}
      data-report-pending={aiPending ? "1" : "0"}
    >
      <AppHeader backHref="/home" backLabel="Home" eyebrow={pack.title} />

      <div className="flex flex-col gap-6">
        <ArchetypeCard archetype={report.archetype} playerName={profile.name} />

        {/* The ribbon is tappable here — the chart's x-axis doubles as the
            what-if control. Same geometry as the play screen. */}
        <TimelineRibbon
          totalMonths={state.totalMonths}
          currentMonth={state.totalMonths + 1}
          records={state.history}
          selectedMonth={selectedMonth}
          onSelect={(month) => {
            setSelectedMonth((current) => (current === month ? null : month));
            setAltChoiceId(null);
          }}
          below={
            <NetWorthChart
              totalMonths={state.totalMonths}
              openingNetWorth={openingNetWorth}
              records={state.history}
              optimal={optimal}
              reducedMotion={reducedMotion}
              alternate={
                previewed && previewed.available
                  ? {
                      month: previewed.month,
                      label: previewed.choiceLabel,
                      netWorthByMonth: previewed.netWorthByMonth,
                    }
                  : null
              }
            />
          }
        />

        {selectedMonth !== null ? (
          <WhatIfPanel
            month={selectedMonth}
            event={pack.events.find((e) => e.month === selectedMonth) ?? null}
            takenChoiceId={selectedRecord?.choiceId ?? null}
            results={alternatives}
            selectedChoiceId={altChoiceId}
            onSelect={setAltChoiceId}
            onClose={() => {
              setSelectedMonth(null);
              setAltChoiceId(null);
            }}
          />
        ) : null}

        <GapAnnotation summary={report.summary} beat={report.beatTheAgent} />

        {report.theoryPracticeGap ? <TheoryPracticeGap text={report.theoryPracticeGap} /> : null}

        <CostliestDecisions
          decisions={report.costliest}
          nothingCostlyReason={report.nothingCostlyReason}
        />
        <DecisionGrid rows={report.decisions} />
        <MasteryChips mastery={report.mastery} />
        <StrengthsAndNext strengths={report.strengths} nextConcepts={report.nextConcepts} />
        <BadgeShelf badges={report.badges} />

        <ClosingLine text={report.closingLine} source={report.source} />

        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            onClick={() => {
              startRun(mode);
              router.push(`/play/${mode}`);
            }}
            className="touch-target rounded-lg bg-marigold px-5 font-medium text-ink transition-colors hover:bg-marigold/90"
          >
            Play again
          </button>
          <Link
            href="/explainer"
            className="touch-target flex items-center rounded-lg border border-line px-5 text-chalk transition-colors hover:border-marigold"
          >
            Look something up
          </Link>
          <Link
            href="/home"
            className="touch-target flex items-center rounded-lg border border-line px-5 text-chalk transition-colors hover:border-marigold"
          >
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
