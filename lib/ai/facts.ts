/**
 * ★ Where every number the model sees is calculated.
 *
 * CLAUDE.md rule 3: the LLM never computes. This file is the boundary — pure
 * TypeScript in, a payload of finished facts out. If a figure is not produced
 * here it does not reach a prompt, and `lib/ai/numbers.ts` will not let it back
 * out in a response.
 *
 * Pure. Safe on the client, which is where both payloads are built.
 */

import type { ContentPack, LiteracyLevel, MonthRecord, SimState } from "@/lib/sim/types";
import { healthBand, healthScore, highInterestDebt, runwayMonths } from "@/lib/sim/metrics";
import { choiceById } from "@/lib/sim/deck";
import { CONCEPTS } from "@/content/concepts";
import type { CoachRequest, ReportRequest } from "./schemas";
import type { ReportData } from "./fallbacks";

/**
 * A one-line description of the last three months, computed here so the model
 * is never asked to spot a trend. "Spotting a pattern" is arithmetic wearing a
 * different hat.
 */
export function recentPattern(history: MonthRecord[]): string | null {
  const recent = history.slice(-3);
  if (recent.length < 2) return null;

  const spentEverything = recent.filter(
    (r) =>
      r.allocation.discretionarySpend > 0 &&
      r.allocation.toEmergencyFund + r.allocation.toInvest + r.allocation.extraDebtPayment === 0,
  ).length;
  const savedSomething = recent.filter(
    (r) => r.allocation.toEmergencyFund + r.allocation.toInvest > 0,
  ).length;
  const wrong = recent.filter((r) => r.eventId && !r.wasOptimalChoice).length;
  const missed = recent.filter((r) => r.missedPayment).length;

  if (missed >= 2) return `missed a payment in ${missed} of the last ${recent.length} months`;
  if (spentEverything === recent.length)
    return `spent the whole discretionary budget ${recent.length} months running`;
  if (savedSomething === recent.length)
    return `put money aside ${recent.length} months running`;
  if (wrong >= 2) return `took the tempting option in ${wrong} of the last ${recent.length} months`;
  return null;
}

export function coachFacts(args: {
  pack: ContentPack;
  state: SimState;
  record: MonthRecord;
  previousNetWorth: number;
  literacyLevel: LiteracyLevel;
}): CoachRequest {
  const { pack, state, record, previousNetWorth, literacyLevel } = args;

  const event = record.eventId
    ? (pack.events.find((e) => e.id === record.eventId) ?? null)
    : null;
  const choice = event && record.choiceId ? (choiceById(event, record.choiceId) ?? null) : null;
  const better = event ? (choiceById(event, event.correctChoiceId) ?? null) : null;

  return {
    month: record.month,
    eventTitle: event?.title ?? null,
    choiceLabel: choice?.label ?? null,
    wasOptimal: record.wasOptimalChoice,
    optimalChoiceLabel: record.wasOptimalChoice ? null : (better?.label ?? null),
    netWorthDelta: record.netWorthEnd - previousNetWorth,
    runwayMonths: Math.round(runwayMonths(state) * 10) / 10,
    healthBand: healthBand(healthScore(state)),
    highInterestDebt: highInterestDebt(state),
    stress: Math.round(state.stress),
    literacyLevel,
    recentPattern: recentPattern(state.history),
  };
}

export function reportFacts(args: {
  report: ReportData;
  literacyLevel: LiteracyLevel;
}): ReportRequest {
  const { report, literacyLevel } = args;

  return {
    archetypeName: report.archetype.name,
    gapRupees: report.summary.gapRupees,
    playerNetWorth: report.summary.finalNetWorth,
    optimalNetWorth: report.summary.optimalNetWorth,
    beatTheAgent: report.beatTheAgent,
    health: report.summary.health,
    healthBand: report.summary.band,
    optimalChoices: report.summary.optimalChoices,
    eventsFaced: report.summary.eventsFaced,
    literacyLevel,
    costliest: report.costliest.map((d) => ({
      month: d.month,
      eventTitle: d.eventTitle,
      yourChoiceLabel: d.yourChoiceLabel,
      betterChoiceLabel: d.betterChoiceLabel,
      costRupees: d.costRupees,
    })),
    strengths: report.strengths,
    conceptOptions: CONCEPTS.map((c) => ({ id: c.id, name: c.name })),
  };
}
