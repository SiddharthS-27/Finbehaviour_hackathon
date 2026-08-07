/**
 * Deck assembly and gating.
 *
 * The engine takes an event as given — it is this file that decides whether a
 * month has one. Keeping that decision here is what lets a gate silently
 * remove month 8 when the player never opened a credit card, without the
 * engine knowing anything about content.
 *
 * Pure, like everything else under lib/sim.
 */

import type { Choice, ContentPack, EventCard, SimState } from "./types";
import { evaluateCondition, evaluateGate } from "./effects";
import { rollMarket } from "./rng";

/**
 * The event for this month, or null if there is none.
 *
 * Two ways to get null, and they are different:
 *  - the pack authored no event for this slot
 *  - an event exists but its gate is unmet
 *
 * Either way the month runs. The UI shows a quiet-month card rather than
 * leaving a hole. (Edge case 8.)
 */
export function eventForMonth(
  pack: ContentPack,
  month: number,
  state: SimState,
): EventCard | null {
  const event = pack.events.find((e) => e.month === month);
  if (!event) return null;
  return evaluateGate(state, event.gate) ? event : null;
}

/** Why a month is quiet — for the card the player actually sees. */
export type QuietReason = "no_event" | "gate_unmet";

export function quietReason(
  pack: ContentPack,
  month: number,
  state: SimState,
): QuietReason | null {
  const event = pack.events.find((e) => e.month === month);
  if (!event) return "no_event";
  return evaluateGate(state, event.gate) ? null : "gate_unmet";
}

export interface ChoiceAvailability {
  choice: Choice;
  available: boolean;
  /** present only when unavailable — always shown, never hidden */
  reason?: string;
}

/**
 * Every choice on the card, each marked takeable or not.
 *
 * Blocked choices are **rendered, disabled, with the reason visible**. Hiding
 * them would hide the lesson: *why you cannot* is usually the point. (Edge
 * case 9.)
 */
export function choiceAvailability(state: SimState, event: EventCard): ChoiceAvailability[] {
  return event.choices.map((choice) => {
    if (!choice.requires) return { choice, available: true };
    const available = evaluateCondition(state, choice.requires);
    return available
      ? { choice, available: true }
      : {
          choice,
          available: false,
          reason: choice.blockedReason ?? "Not available with what you have right now.",
        };
  });
}

/** The choices a player could actually take this month. Never empty — the content lint guarantees it. */
export function takeableChoices(state: SimState, event: EventCard): Choice[] {
  return choiceAvailability(state, event)
    .filter((c) => c.available)
    .map((c) => c.choice);
}

export function isChoiceTakeable(state: SimState, choice: Choice): boolean {
  return !choice.requires || evaluateCondition(state, choice.requires);
}

/**
 * The market path for a run.
 *
 * A pack that authors `marketReturns` uses them verbatim — historical mode
 * needs real returns, and the story pack needs its correction to land on
 * month 9 every single time. Everything else is rolled from the seed.
 *
 * Short arrays are padded with zeros rather than yielding undefined, so a
 * mis-authored pack degrades to a flat market instead of NaN.
 */
export function marketForRun(pack: ContentPack, seed: number): number[] {
  const authored = pack.marketReturns;
  if (!authored) return rollMarket(seed, pack.totalMonths);

  return Array.from({ length: pack.totalMonths }, (_, i) =>
    Number.isFinite(authored[i]) ? authored[i] : 0,
  );
}

/** Every month slot in the pack, in order, whether or not it holds an event. */
export function monthSlots(pack: ContentPack): number[] {
  return Array.from({ length: pack.totalMonths }, (_, i) => i + 1);
}

export function eventById(pack: ContentPack, id: string): EventCard | undefined {
  return pack.events.find((e) => e.id === id);
}

export function choiceById(event: EventCard, id: string): Choice | undefined {
  return event.choices.find((c) => c.id === id);
}

/**
 * The full authored deck in month order, ignoring gates.
 *
 * For the report and the counterfactual replay, which need the event that
 * *did* fire in each month regardless of the state they are replaying into.
 */
export function orderedDeck(pack: ContentPack): (EventCard | null)[] {
  return monthSlots(pack).map((m) => pack.events.find((e) => e.month === m) ?? null);
}
