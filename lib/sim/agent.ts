/**
 * ★ The shadow agent — the mint line.
 *
 * A textbook policy plays the *identical* world: same pack, same seed, same
 * market returns, same gates, same blocked choices, same bandwidth tax. The
 * only difference between the two lines on the chart is the decisions. That is
 * the entire claim, and it only holds because every constraint the player faces
 * is derived from engine state rather than from the UI.
 *
 * Deliberately **not** a search and **not** an LLM. Authored correct answers
 * are instant, reproducible, and explainable out loud: *"the benchmark is a
 * textbook policy — fill the buffer, avalanche the expensive debt, then
 * invest."* A beam search would be a better player and a worse teacher, and
 * nobody in the room could check its work.
 *
 * The optimal run is recomputed from the seed, never persisted. A stale save
 * that disagreed with the engine would quietly poison every number in the
 * report.
 */

import type {
  Allocation,
  ContentPack,
  EventCard,
  MonthRecord,
  Rupees,
  SimState,
} from "./types";
import { EngineError } from "./types";
import { advanceMonth, createInitialState } from "./engine";
import { eventForMonth, takeableChoices } from "./deck";
import { lockedSlider, type AllocationKey } from "./bandwidth";
import { availableDiscretionary, highInterestDebt, netWorth, runwayMonths } from "./metrics";

/**
 * What the agent lets itself spend, as a fraction of take-home.
 *
 * The plan writes this as a flat ₹3,000: *"the agent spends ₹3k; a monk isn't
 * a fair benchmark."* Held flat it would be a rounding error at the high income
 * tier and nearly the whole discretionary budget at the low one, so it is
 * expressed as the fraction that ₹3,000 is of the story pack's ₹42,000
 * take-home. At the mid tier it evaluates to ₹3,000 exactly.
 *
 * A benchmark that never buys a coffee is not one anybody believes, and the
 * gap it produces would be unearned.
 */
export const AGENT_SPEND_FRACTION = 1 / 14;

/** Runway below this and the buffer is the only thing that matters. */
const RUNWAY_CRISIS = 1;
/** Runway below this and the buffer still outranks growth. */
const RUNWAY_COMFORTABLE = 6;

/* ─────────────────────────── the ladder ──────────────────────── */

type Weights = Partial<Record<Exclude<AllocationKey, "discretionarySpend">, number>>;

/**
 * The allocation ladder, evaluated top-down. First rung that survives the
 * bandwidth tax wins.
 *
 * Rungs are returned as weight vectors rather than applied directly, because a
 * locked slider has to be able to knock a rung out entirely and fall through to
 * the next one — the agent is bound by the same lock the player is.
 */
function ladder(s: SimState): Weights[] {
  const rungs: Weights[] = [];

  // 1. Under a month of cover. Nothing else is worth doing.
  if (runwayMonths(s) < RUNWAY_CRISIS) rungs.push({ toEmergencyFund: 1 });

  // 2. Expensive debt. The avalanche: highest APR first, which is the highest
  //    guaranteed return available to anybody.
  if (highInterestDebt(s) > 0) rungs.push({ extraDebtPayment: 1 });

  // 3. Thin but not critical. Buffer first, market second.
  if (runwayMonths(s) < RUNWAY_COMFORTABLE) {
    rungs.push({ toEmergencyFund: 0.7, toInvest: 0.3 });
  }

  // 4. Comfortable. Compounding does the work from here.
  rungs.push({ toEmergencyFund: 0.2, toInvest: 0.8 });

  return rungs;
}

/**
 * Split `amount` across a weight vector in whole rupees, with the remainder
 * landing on the heaviest bucket.
 *
 * The parts must sum to `amount` exactly. Leaving a rupee unallocated would be
 * harmless in the engine but dishonest on the chart: the player's UI refuses to
 * advance until every rupee is placed, so the agent places every rupee too.
 */
function split(amount: Rupees, weights: Weights): Weights {
  const keys = (Object.keys(weights) as (keyof Weights)[]).filter((k) => (weights[k] ?? 0) > 0);
  if (keys.length === 0 || amount <= 0) return {};

  const total = keys.reduce((sum, k) => sum + (weights[k] ?? 0), 0);
  const out: Weights = {};
  let placed = 0;

  for (const k of keys) {
    const part = Math.round((amount * (weights[k] ?? 0)) / total);
    out[k] = part;
    placed += part;
  }

  const heaviest = keys.reduce((best, k) =>
    (weights[k] ?? 0) > (weights[best] ?? 0) ? k : best,
  );
  out[heaviest] = (out[heaviest] ?? 0) + (amount - placed);
  return out;
}

/**
 * ★ What the agent does with this month's money.
 *
 * Exported because the report quotes it — "the benchmark put ₹8,400 into the
 * buffer that month" is a far better sentence than "the benchmark did better".
 */
export function optimalAllocation(s: SimState): Allocation {
  const budget = availableDiscretionary(s);
  const alloc: Allocation = {
    discretionarySpend: 0,
    toEmergencyFund: 0,
    toInvest: 0,
    extraDebtPayment: 0,
    extraDebtTargetId: null, // null means avalanche — highest APR first
  };
  if (budget <= 0) return alloc;

  // A benchmark that spends nothing is not one anybody would accept as a fair
  // comparison, so the agent takes its ₹3k off the top before anything else.
  const spend = Math.min(budget, Math.round(s.monthlyIncome * AGENT_SPEND_FRACTION));
  alloc.discretionarySpend = spend;

  const rest = budget - spend;
  if (rest <= 0) return alloc;

  // ★ The bandwidth tax applies to the agent too. Without this the benchmark
  //   would be playing an easier game and every gap in the report would be
  //   inflated by exactly the amount stress cost the player.
  const locked = lockedSlider(s)?.key ?? null;

  for (const rung of ladder(s)) {
    const usable: Weights = { ...rung };
    if (locked && locked !== "discretionarySpend") delete usable[locked];
    const parts = split(rest, usable);
    if (Object.keys(parts).length === 0) continue;

    alloc.toEmergencyFund = parts.toEmergencyFund ?? 0;
    alloc.toInvest = parts.toInvest ?? 0;
    alloc.extraDebtPayment = parts.extraDebtPayment ?? 0;
    return alloc;
  }

  // Every rung was locked out. The money has to go somewhere and spending is
  // the one thing stress never takes away, so it goes there — which is exactly
  // what depletion does to real budgets, and the agent is not exempt.
  alloc.discretionarySpend = spend + rest;
  return alloc;
}

/* ─────────────────────────── the policy ──────────────────────── */

/**
 * Which option the agent takes.
 *
 * The authored correct answer, unless it is not takeable — a `requires` that
 * does not hold, or a CIBIL too low to be offered credit. Then the first
 * takeable option in authored order, which is deterministic.
 *
 * Returns null only if the event has no takeable choice at all. The content
 * lint asserts that cannot happen; the engine would throw if it did.
 */
export function optimalChoice(s: SimState, event: EventCard): string | null {
  const takeable = takeableChoices(s, event);
  if (takeable.length === 0) return null;
  const authored = takeable.find((c) => c.id === event.correctChoiceId);
  return (authored ?? takeable[0]).id;
}

/* ──────────────────────────── the run ────────────────────────── */

export interface OptimalRun {
  packId: string;
  seed: number;
  /**
   * Net worth at each month boundary. Index 0 is the opening balance, index m
   * is the close of month m — so it is one longer than `records`, and both
   * lines on the chart start from the same point.
   */
  netWorthByMonth: Rupees[];
  records: MonthRecord[];
  finalState: SimState;
  finalNetWorth: Rupees;
  /**
   * True if the run stopped early. Should never happen — it means an event left
   * the agent with no takeable choice, which the content lint forbids. Kept so
   * a content bug degrades the chart instead of crashing the play screen.
   */
  truncated: boolean;
}

/**
 * Play the whole pack with the textbook policy.
 *
 * `market` is passed in rather than rolled here so the agent faces byte-identical
 * returns to the player. Twelve engine steps — this runs in single-digit
 * milliseconds and is safe to call on mount.
 */
export function runOptimal(pack: ContentPack, seed: number, market: number[]): OptimalRun {
  let state = createInitialState(pack, seed);
  const records: MonthRecord[] = [];
  const netWorthByMonth: Rupees[] = [netWorth(state)];
  let truncated = false;

  for (let m = 1; m <= pack.totalMonths; m++) {
    const event = eventForMonth(pack, m, state);
    const choiceId = event ? optimalChoice(state, event) : null;

    if (event && choiceId === null) {
      truncated = true;
      break;
    }

    try {
      const result = advanceMonth(
        state,
        optimalAllocation(state),
        event,
        choiceId,
        market[m - 1] ?? 0,
      );
      state = result.state;
      records.push(result.record);
      netWorthByMonth.push(result.record.netWorthEnd);
    } catch (err) {
      // A throw here is a content bug, not a player bug. The chart degrades to
      // the months it did manage; the play screen keeps working.
      if (!(err instanceof EngineError)) throw err;
      truncated = true;
      break;
    }
  }

  return {
    packId: pack.id,
    seed,
    netWorthByMonth,
    records,
    finalState: state,
    finalNetWorth: netWorth(state),
    truncated,
  };
}

/**
 * ★ The optimal line, revealed only as far as the player has actually played.
 *
 * Revealing the future spoils the game — seeing the mint line arc up to month
 * twelve turns every remaining decision into a lookup. The gap is only
 * interesting once you have earned it.
 *
 * `completedMonths` is the number of months the player has resolved, so the
 * result has `completedMonths + 1` points: the shared opening, then one per
 * month played.
 */
export function revealedNetWorth(run: OptimalRun, completedMonths: number): Rupees[] {
  const upTo = Math.max(0, Math.min(completedMonths, run.netWorthByMonth.length - 1));
  return run.netWorthByMonth.slice(0, upTo + 1);
}

/** The gap at the current month, positive when the agent is ahead. */
export function gapAt(run: OptimalRun, completedMonths: number, playerNetWorth: Rupees): Rupees {
  const revealed = revealedNetWorth(run, completedMonths);
  const agent = revealed[revealed.length - 1] ?? 0;
  return agent - playerNetWorth;
}
