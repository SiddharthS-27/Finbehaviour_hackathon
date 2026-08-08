/**
 * ★ The report, with no AI at all.
 *
 * CLAUDE.md rule 4: every AI surface has an authored fallback, and **the
 * fallback ships first**. Phase 9 layers a model on top of this; nothing in
 * Phase 8 makes a network call, and the report must be complete, specific and
 * unembarrassing without one.
 *
 * Everything here is deterministic and computed in TypeScript. When the model
 * arrives it will be handed these numbers as facts and asked only to write
 * prose about them — rule 3. Nothing in this file may ever become "roughly".
 *
 * Not under `lib/sim/`, so importing it from a component is fine — but it is
 * pure anyway: no clock, no randomness, no IO.
 */

import type {
  ContentPack,
  MonthRecord,
  Rupees,
  SimState,
} from "@/lib/sim/types";
import {
  healthBand,
  healthScore,
  highInterestDebt,
  netWorth,
  runwayMonths,
  savingsRate,
} from "@/lib/sim/metrics";
import { costliestDecisions, type CostliestDecision } from "@/lib/sim/counterfactual";
import type { OptimalRun } from "@/lib/sim/agent";
import { BADGES } from "@/lib/sim/gamify";
import { conceptById } from "@/content/concepts";
import type { DiagnosticResult } from "@/content/diagnostic";

/* ───────────────────────── archetypes ────────────────────────── */

export interface Archetype {
  id: string;
  name: string;
  tagline: string;
  description: string;
}

/** Everything an archetype rule is allowed to look at. Computed, never guessed. */
export interface RunSummary {
  finalNetWorth: Rupees;
  openingNetWorth: Rupees;
  optimalNetWorth: Rupees;
  /** Optimal minus yours. **Positive means the benchmark is ahead.** */
  gapRupees: Rupees;
  /** The gap as a fraction of how far the benchmark travelled. */
  gapFraction: number;
  health: number;
  band: string;
  optimalChoices: number;
  eventsFaced: number;
  endedWithHighInterestDebt: Rupees;
  /** Mean savings rate across the run, 0–1. */
  meanSavingsRate: number;
  portfolioValue: Rupees;
  /** Months (after the first) that closed with under a month of cover. */
  monthsOnTheEdge: number;
  /** Discretionary spending as a fraction of everything allocated. */
  spendShare: number;
  missedPayments: number;
  finalCreditScore: number;
  peakStress: number;
  badges: string[];
}

/**
 * The archetype ladder, in priority order.
 *
 * Order is the whole design. `The Tightrope Walker` sits below the two positive
 * archetypes deliberately: the First Earner *opens* the game on 0.4 months of
 * runway, so a literal "runway < 1 at any point" would fire on every single run
 * and swallow the ladder whole — the same trap Phase 6's desaturation fell into.
 * It needs **three or more** months on the edge, and month 1 does not count.
 *
 * Every rule is a pure predicate over `RunSummary`. Add one by adding a row.
 */
export interface ArchetypeRule {
  archetype: Archetype;
  test: (s: RunSummary) => boolean;
}

export const ARCHETYPE_RULES: ArchetypeRule[] = [
  {
    archetype: {
      id: "textbook",
      name: "The Textbook",
      tagline: "You played it the way the book says.",
      description:
        "You finished within a whisker of the benchmark policy — buffer first, expensive debt next, then the market. That is not luck. You made the boring call over and over while the interface was pushing you the other way, and boring is what compounds.",
    },
    test: (s) => s.gapFraction < 0.05 && s.optimalChoices >= Math.ceil(s.eventsFaced * 0.75),
  },
  {
    // Above `cautious_compounder` deliberately. A player who saved a third of
    // their income and invested none of it can post a *healthy* score — runway
    // and low debt carry it — while the money does nothing at all. "Cautious
    // Compounder" would congratulate them for the one thing they did not do.
    archetype: {
      id: "hoarder",
      name: "The Hoarder",
      tagline: "Safe. Possibly too safe.",
      description:
        "You saved hard and put almost none of it to work. That is a real achievement and a real cost: cash quietly loses to inflation every year, and a buffer past six months is money doing nothing. You have already done the hard part — the discipline. Now let some of it grow.",
    },
    test: (s) => s.meanSavingsRate >= 0.25 && s.portfolioValue < s.finalNetWorth * 0.2,
  },
  {
    archetype: {
      id: "cautious_compounder",
      name: "The Cautious Compounder",
      tagline: "Slow, deliberate, and it worked.",
      description:
        "You ended healthy and you got most of the decisions right. You were never the fastest money in the room, which is exactly why you still have it. Keep the habit and let the next twenty years do the arithmetic.",
    },
    test: (s) => s.health >= 70 && s.optimalChoices >= 8,
  },
  {
    // Ordered above `interest_payer`, which is a deviation from the plan's
    // ladder and a deliberate one: someone who allocated most of their money to
    // the month they were living in *arrived* at the debt by spending. Naming
    // the behaviour is useful; naming its symptom is not. A player who took on
    // expensive debt without overspending still lands on The Interest Payer.
    archetype: {
      id: "present_tense_spender",
      name: "The Present-Tense Spender",
      tagline: "You lived in the month you were in.",
      description:
        "Most of what you allocated went on the month you were living in. None of it was unreasonable on its own — that is the point. Small, defensible, repeated is how a salary disappears without a single decision anyone could call a mistake.",
    },
    test: (s) => s.spendShare >= 0.5,
  },
  {
    archetype: {
      id: "interest_payer",
      name: "The Interest Payer",
      tagline: "You worked. Some of it went to a lender.",
      description:
        "You finished the year still carrying expensive debt, and every month it took a cut before you saw a rupee. Paying the highest rate first is the only guaranteed return available to anybody — no market beats clearing a 42% card.",
    },
    test: (s) => s.endedWithHighInterestDebt > 0,
  },
  {
    archetype: {
      id: "tightrope_walker",
      name: "The Tightrope Walker",
      tagline: "Never quite fell. Never had room to.",
      description:
        "You spent most of the year with under a month of cover, which means every ordinary surprise had to become debt. A buffer is not savings and it is not investing — it is the thing that stops a bad week from turning into a bad year.",
    },
    test: (s) => s.monthsOnTheEdge >= 3,
  },
  {
    archetype: {
      id: "ostrich",
      name: "The Ostrich",
      tagline: "The envelopes did not open themselves.",
      description:
        "You looked away from things that were going to happen regardless. Avoidance feels like protection and costs like interest — the bill kept growing in the drawer, and it grew faster for not being looked at.",
    },
    test: (s) => s.missedPayments >= 2 || s.finalCreditScore < 650,
  },
];

/** The one everyone lands on when nothing sharper fits. Never shaming. */
export const DEFAULT_ARCHETYPE: Archetype = {
  id: "mixed",
  name: "The Mixed Record",
  tagline: "Some months you had it. Some months it had you.",
  description:
    "No single pattern runs through your year — you made good calls and expensive ones, sometimes in the same month. That is what most people's finances actually look like. The three decisions below are where the money went.",
};

export function classify(summary: RunSummary): Archetype {
  return (
    ARCHETYPE_RULES.find((r) => r.test(summary))?.archetype ?? DEFAULT_ARCHETYPE
  );
}

/* ─────────────────────────── summary ─────────────────────────── */

export function summarise(
  state: SimState,
  records: MonthRecord[],
  optimal: OptimalRun,
  openingNetWorth: Rupees,
): RunSummary {
  const finalNetWorth = netWorth(state);
  const optimalNetWorth = optimal.finalNetWorth;
  const gapRupees = optimalNetWorth - finalNetWorth;
  const travelled = Math.abs(optimalNetWorth - openingNetWorth);

  const withEvents = records.filter((r) => r.eventId);
  const allocated = records.reduce(
    (sum, r) =>
      sum +
      r.allocation.discretionarySpend +
      r.allocation.toEmergencyFund +
      r.allocation.toInvest +
      r.allocation.extraDebtPayment,
    0,
  );
  const spent = records.reduce((sum, r) => sum + r.allocation.discretionarySpend, 0);

  return {
    finalNetWorth,
    openingNetWorth,
    optimalNetWorth,
    gapRupees,
    gapFraction: travelled > 0 ? Math.abs(gapRupees) / travelled : 0,
    health: healthScore(state, records),
    band: healthBand(healthScore(state, records)),
    optimalChoices: withEvents.filter((r) => r.wasOptimalChoice).length,
    eventsFaced: withEvents.length,
    endedWithHighInterestDebt: highInterestDebt(state),
    meanSavingsRate:
      records.length > 0
        ? records.reduce((sum, r) => sum + savingsRate(r), 0) / records.length
        : 0,
    portfolioValue: state.portfolio.value,
    // Month 1 is excluded: the pack opens on 0.4 months of cover by design, so
    // counting it would mark every run as fragile before a decision was made.
    monthsOnTheEdge: records.filter((r) => r.month > 1 && r.healthScoreEnd < 25).length,
    spendShare: allocated > 0 ? spent / allocated : 0,
    missedPayments: records.filter((r) => r.missedPayment).length,
    finalCreditScore: Math.round(state.creditScore),
    peakStress: records.reduce((max, r) => Math.max(max, r.stressEnd), 0),
    badges: [...state.badges],
  };
}

/* ─────────────────────────── mastery ─────────────────────────── */

export interface Mastery {
  conceptId: string;
  name: string;
  oneLiner: string;
  /** How many events in this run tested it. */
  seen: number;
  correct: number;
  /** The months that tested it, so advice can point at one. */
  months: number[];
  /** The months it caught them out. */
  missedMonths: number[];
  level: "untested" | "shaky" | "getting_there" | "solid";
}

export function mastery(pack: ContentPack, records: MonthRecord[]): Mastery[] {
  const byConcept = new Map<
    string,
    { seen: number; correct: number; months: number[]; missedMonths: number[] }
  >();

  for (const record of records) {
    if (!record.eventId) continue;
    const event = pack.events.find((e) => e.id === record.eventId);
    if (!event) continue;
    const entry =
      byConcept.get(event.concept) ?? { seen: 0, correct: 0, months: [], missedMonths: [] };
    entry.seen += 1;
    entry.months.push(record.month);
    if (record.wasOptimalChoice) entry.correct += 1;
    else entry.missedMonths.push(record.month);
    byConcept.set(event.concept, entry);
  }

  return [...byConcept.entries()]
    .map(([conceptId, { seen, correct, months, missedMonths }]) => {
      const concept = conceptById(conceptId);
      const ratio = seen > 0 ? correct / seen : 0;
      return {
        conceptId,
        name: concept?.name ?? conceptId,
        oneLiner: concept?.oneLiner ?? "",
        seen,
        correct,
        months,
        missedMonths,
        level:
          seen === 0
            ? ("untested" as const)
            : ratio === 1
              ? ("solid" as const)
              : ratio > 0
                ? ("getting_there" as const)
                : ("shaky" as const),
      };
    })
    .sort((a, b) => a.correct / a.seen - b.correct / b.seen || a.name.localeCompare(b.name));
}

/* ───────────────────── theory vs practice ────────────────────── */

/**
 * ★ The differentiator, and it is one sentence.
 *
 * Someone who answered the diversification question correctly at onboarding and
 * then went all in during month 5 has not got a knowledge problem. Naming that
 * gap out loud is the entire thesis of the app; returns null rather than
 * inventing one when it is not there.
 */
export function theoryPracticeGap(
  pack: ContentPack,
  records: MonthRecord[],
  diagnostic: DiagnosticResult,
): string | null {
  for (const conceptId of diagnostic.knownConcepts) {
    const failed = records.filter((r) => {
      if (!r.eventId || r.wasOptimalChoice) return false;
      const event = pack.events.find((e) => e.id === r.eventId);
      return event?.concept === conceptId;
    });
    if (failed.length === 0) continue;

    const concept = conceptById(conceptId);
    const months = failed.map((r) => `month ${r.month}`).join(" and ");
    return `You got ${concept?.name.toLowerCase() ?? conceptId} right before you started. Then ${months} happened. That distance — between knowing it and doing it under pressure — is the whole reason this exists.`;
  }
  return null;
}

/* ──────────────────────── the whole report ───────────────────── */

export interface ReportData {
  archetype: Archetype;
  summary: RunSummary;
  costliest: CostliestDecision[];
  decisions: DecisionRow[];
  mastery: Mastery[];
  badges: { id: string; label: string; description: string; earned: boolean }[];
  strengths: string[];
  nextConcepts: { id: string; name: string; why: string }[];
  theoryPracticeGap: string | null;
  closingLine: string;
  /** True when the player finished ahead of the benchmark. Celebrate it. */
  beatTheAgent: boolean;
  /**
   * Why the costliest list is empty, when it is.
   *
   * `flawless` — every answer was the authored one.
   * `luck` — some answers were wrong and none of them cost anything, because
   *   the market happened to run the player's way. Those are different things
   *   and the report must not congratulate the second as if it were the first.
   */
  nothingCostlyReason: "flawless" | "luck" | null;
  /**
   * Which prose is on screen. `buildReport` always returns "fallback";
   * `mergeAiReport` flips it when generated text survived validation. Exposed so
   * the report page can say so honestly rather than passing model output off as
   * its own.
   */
  source: "ai" | "fallback";
}

export interface DecisionRow {
  month: number;
  eventTitle: string | null;
  concept: string | null;
  choiceLabel: string | null;
  wasOptimal: boolean;
  netWorthDelta: Rupees;
  quiet: boolean;
}

function decisionRows(
  pack: ContentPack,
  records: MonthRecord[],
  openingNetWorth: Rupees,
): DecisionRow[] {
  return records.map((record, i) => {
    const event = record.eventId
      ? (pack.events.find((e) => e.id === record.eventId) ?? null)
      : null;
    const choice = event && record.choiceId
      ? (event.choices.find((c) => c.id === record.choiceId) ?? null)
      : null;
    const previous = i === 0 ? openingNetWorth : records[i - 1].netWorthEnd;

    return {
      month: record.month,
      eventTitle: event?.title ?? null,
      concept: event?.concept ?? null,
      choiceLabel: choice?.label ?? null,
      wasOptimal: record.wasOptimalChoice,
      netWorthDelta: record.netWorthEnd - previous,
      quiet: !event,
    };
  });
}

/**
 * Specific, or not said at all.
 *
 * "Great job" with nothing attached is the single easiest way to make a report
 * feel generated. Every line here names a thing the player actually did, and
 * an empty list is better than a filled one.
 */
function strengths(s: RunSummary, ms: Mastery[]): string[] {
  const out: string[] = [];

  if (s.optimalChoices > 0) {
    out.push(
      `You took the better option ${s.optimalChoices} time${s.optimalChoices === 1 ? "" : "s"} out of ${s.eventsFaced}, with the interface pushing the other way.`,
    );
  }
  const solid = ms.filter((m) => m.level === "solid");
  if (solid.length > 0) {
    // Named, not listed. A flawless run tests ten concepts, and "you did not get
    // caught once on avoidance, budgeting, debt priority, diversification,
    // emergency fund, insurance…" is a wall nobody reads. Three and a count.
    const named = solid.slice(0, 3).map((m) => m.name.toLowerCase());
    const rest = solid.length - named.length;
    out.push(
      rest > 0
        ? `You did not get caught once on ${named.join(", ")}, or on ${rest} other${rest === 1 ? "" : "s"}.`
        : `You did not get caught once on ${named.join(", ")}.`,
    );
  }
  if (s.endedWithHighInterestDebt === 0) {
    out.push("You finished owing nothing above 12%. That is the expensive kind, and you cleared it.");
  }
  if (s.meanSavingsRate >= 0.2) {
    out.push(
      `You put aside ${Math.round(s.meanSavingsRate * 100)}% of your take-home on average across the year.`,
    );
  }
  if (s.finalCreditScore >= 750) {
    out.push(`You ended on a CIBIL of ${s.finalCreditScore}, which is the band that gets you the good rates.`);
  }
  if (s.badges.includes("comeback")) {
    out.push("You were in real trouble at one point and you climbed out of it.");
  }

  return out.slice(0, 3);
}

/**
 * What to learn next.
 *
 * Weakest tested concepts first, then anything the diagnostic flagged, then
 * their unmet prerequisites — never a concept whose groundwork is missing.
 */
function nextConcepts(
  ms: Mastery[],
  diagnostic: DiagnosticResult,
): { id: string; name: string; why: string }[] {
  const out: { id: string; name: string; why: string }[] = [];
  const seen = new Set<string>();

  const push = (id: string, why: string) => {
    if (seen.has(id) || out.length >= 3) return;
    const concept = conceptById(id);
    if (!concept) return;
    seen.add(id);
    out.push({ id, name: concept.name, why });
  };

  for (const m of ms) {
    if (m.level === "solid") continue;
    // Point at the month. Three concepts in a row saying "it came up once and
    // caught you" reads like a template, which is precisely what it would be.
    const where =
      m.missedMonths.length === 1
        ? `Month ${m.missedMonths[0]}`
        : `Months ${m.missedMonths.slice(0, -1).join(", ")} and ${m.missedMonths[m.missedMonths.length - 1]}`;
    push(
      m.conceptId,
      m.correct === 0
        ? `${where} turned on this and you did not have it yet.`
        : `${where} caught you, though you had it right ${m.correct} of ${m.seen} times.`,
    );
  }
  for (const id of diagnostic.missedConcepts) {
    push(id, "You were not sure about this before you started, and it never got tested.");
  }
  // Prerequisites of whatever is already on the list, so nothing is recommended
  // on top of a gap.
  for (const entry of [...out]) {
    for (const prereq of conceptById(entry.id)?.prerequisites ?? []) {
      push(prereq, `${entry.name} rests on this one.`);
    }
  }
  for (const id of ["emergency_fund", "apr", "compounding"]) {
    push(id, "The foundation everything else sits on.");
  }

  return out.slice(0, 3);
}

function closing(s: RunSummary, beat: boolean): string {
  if (beat) {
    return `You finished ₹${Math.abs(s.gapRupees).toLocaleString("en-IN")} ahead of the benchmark policy. That is not luck and it is not a rounding error — you out-saved a textbook.`;
  }
  if (s.gapFraction < 0.1) {
    return "You finished within touching distance of the benchmark. The habits are already there; the next two years just repeat them.";
  }
  return "The gap is not a verdict on you — it is a list of specific months, and each one of them is fixable. Start with the first decision above.";
}

export function buildReport(args: {
  pack: ContentPack;
  seed: number;
  market: number[];
  state: SimState;
  optimal: OptimalRun;
  openingNetWorth: Rupees;
  diagnostic: DiagnosticResult;
}): ReportData {
  const { pack, seed, market, state, optimal, openingNetWorth, diagnostic } = args;
  const records = state.history;

  const summary = summarise(state, records, optimal, openingNetWorth);
  const ms = mastery(pack, records);
  const beatTheAgent = summary.gapRupees < 0;
  const costliest = costliestDecisions(pack, seed, market, records);

  return {
    archetype: classify(summary),
    summary,
    costliest,
    decisions: decisionRows(pack, records, openingNetWorth),
    mastery: ms,
    badges: BADGES.map((b) => ({
      id: b.id,
      label: b.label,
      description: b.description,
      earned: state.badges.includes(b.id),
    })),
    strengths: strengths(summary, ms),
    nextConcepts: nextConcepts(ms, diagnostic),
    theoryPracticeGap: theoryPracticeGap(pack, records, diagnostic),
    closingLine: closing(summary, beatTheAgent),
    beatTheAgent,
    nothingCostlyReason:
      costliest.length > 0
        ? null
        : summary.optimalChoices === summary.eventsFaced
          ? "flawless"
          : "luck",
    // The deterministic report is the product. Anything generated is layered on
    // top by `mergeAiReport`, never produced here. (CLAUDE.md rule 4.)
    source: "fallback",
  };
}

/** Convenience for the stat strip, so the component does no arithmetic. */
export function runwayAtEnd(state: SimState): number {
  return runwayMonths(state);
}
