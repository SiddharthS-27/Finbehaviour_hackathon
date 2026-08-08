/**
 * ★ What-if replay.
 *
 * Not precomputed. Twelve events with three choices each is 531,441 paths; the
 * number the player actually wants is one of them, computed in under a
 * millisecond when they tap a month.
 *
 * The isolation is what makes the number honest: same pack, same seed, same
 * market, same allocations, same subsequent choices — **only the one decision
 * differs**. Everything downstream is a consequence of that decision rather
 * than of anything we changed to make the story nicer.
 *
 * Pure, like everything else under lib/sim.
 */

import {
  EngineError,
  type Allocation,
  type ContentPack,
  type MonthRecord,
  type Rupees,
  type SimState,
} from "./types";
import { advanceMonth, createInitialState } from "./engine";
import { choiceById, eventForMonth, isChoiceTakeable, takeableChoices } from "./deck";
import { availableDiscretionary, netWorth } from "./metrics";
import { lockedSlider } from "./bandwidth";

/**
 * What the player did in a month, as far as a replay needs to know.
 *
 * `budget` is what `availableDiscretionary` was when they made the decision.
 * Without it the allocation is four absolute rupee figures, and a substituted
 * choice that frees up money would leave the surplus sitting in cash — which
 * quietly *flatters* every counterfactual, because unspent money helps.
 *
 * With it, the allocation is read as a set of shares. "I put everything into
 * the buffer" replays as everything into the buffer, whatever everything now
 * means. That is what the player actually decided.
 */
export interface MonthPlan {
  allocation: Allocation;
  choiceId: string | null;
  budget: Rupees;
}

/**
 * A plan with no budgets attached — the allocations are then treated as
 * absolute and only ever clamped downward.
 */
export function planFromHistory(records: MonthRecord[]): MonthPlan[] {
  return records.map((r) => ({
    allocation: r.allocation,
    choiceId: r.choiceId,
    // The budget the allocation consumed. The play screen refuses to advance
    // with anything unallocated, so in practice this *is* the month's budget.
    budget:
      r.allocation.discretionarySpend +
      r.allocation.toEmergencyFund +
      r.allocation.toInvest +
      r.allocation.extraDebtPayment,
  }));
}

/**
 * Re-express a recorded allocation against a budget that has moved.
 *
 * A substituted choice can add an EMI, raising minimum payments and lowering
 * `availableDiscretionary`; it can equally clear one and raise it. Either way
 * the player's decision was a *distribution* — the sliders divide up whatever
 * is there — so the shares are what survive the replay, not the rupee figures.
 *
 * The result is clamped to the new budget regardless, because the engine throws
 * on an over-allocation and a throw here would mean this function was wrong.
 */
export function fitAllocation(
  alloc: Allocation,
  fromBudget: Rupees,
  toBudget: Rupees,
): Allocation {
  const parts = [
    alloc.discretionarySpend,
    alloc.toEmergencyFund,
    alloc.toInvest,
    alloc.extraDebtPayment,
  ];
  const total = parts.reduce((a, b) => a + b, 0);

  const zeroed: Allocation = {
    discretionarySpend: 0,
    toEmergencyFund: 0,
    toInvest: 0,
    extraDebtPayment: 0,
    extraDebtTargetId: alloc.extraDebtTargetId,
  };
  if (total <= 0 || toBudget <= 0) return zeroed;

  // Scale by how the budget moved; fall back to the allocation's own total when
  // no budget was recorded, which degrades to a downward-only clamp.
  const basis = fromBudget > 0 ? fromBudget : total;
  const target = Math.min(toBudget, Math.round((total * toBudget) / basis));
  if (target === total) return alloc;

  const scaled = parts.map((v) => Math.floor((v * target) / total));
  // Floor everywhere, then hand the rounding crumbs to the largest bucket, so
  // the parts sum to `target` exactly and never a rupee over.
  let biggest = 0;
  for (let i = 1; i < scaled.length; i++) if (parts[i] > parts[biggest]) biggest = i;
  scaled[biggest] += target - scaled.reduce((a, b) => a + b, 0);

  return {
    discretionarySpend: scaled[0],
    toEmergencyFund: scaled[1],
    toInvest: scaled[2],
    extraDebtPayment: scaled[3],
    extraDebtTargetId: alloc.extraDebtTargetId,
  };
}

/**
 * Honour the bandwidth tax in the replayed timeline.
 *
 * An alternate decision can push stress over 70 in a month where it was fine,
 * and the player could not have moved a slider stress had taken away. The money
 * is **not** redirected — it simply stays as cash. Moving it somewhere else
 * would be inventing a decision, and spending it would be worse.
 *
 * On an unmodified replay this is a no-op: the UI already enforced the lock, so
 * the recorded allocation has a zero there.
 */
function applyLock(alloc: Allocation, state: SimState): Allocation {
  const lock = lockedSlider(state);
  if (!lock || alloc[lock.key] === 0) return alloc;
  return { ...alloc, [lock.key]: 0 };
}

export interface ReplayResult {
  states: SimState[];
  records: MonthRecord[];
  /** Index 0 is the opening balance, index m the close of month m. */
  netWorthByMonth: Rupees[];
  finalNetWorth: Rupees;
  /**
   * Months where the replay could not follow the plan — the recorded choice
   * belongs to an event that no longer fires, or is no longer takeable. Empty
   * for an unmodified replay, by construction.
   */
  diverged: number[];
}

export interface Override {
  month: number;
  choiceId: string;
}

/**
 * Replay a run from its seed.
 *
 * With no override this reproduces the original run exactly — that invariant is
 * tested, and it is the reason no per-month state has to be persisted. The save
 * holds a seed and a list of decisions; everything else is derivable, so a
 * stale save can never disagree with the current engine.
 *
 * Gates are re-evaluated rather than replayed from the record. A substituted
 * choice that changes stress can genuinely close month 10's scam call, and
 * firing it anyway would be modelling a timeline that could not have happened.
 */
export function replay(
  pack: ContentPack,
  seed: number,
  market: number[],
  plan: MonthPlan[],
  override?: Override,
): ReplayResult {
  let state = createInitialState(pack, seed);
  const states: SimState[] = [structuredClone(state)];
  const records: MonthRecord[] = [];
  const netWorthByMonth: Rupees[] = [netWorth(state)];
  const diverged: number[] = [];

  const months = Math.min(pack.totalMonths, plan.length);

  for (let m = 1; m <= months; m++) {
    const event = eventForMonth(pack, m, state);
    const isOverride = override?.month === m;

    let choiceId: string | null = null;
    if (event) {
      const wanted = isOverride ? override.choiceId : plan[m - 1].choiceId;
      const choice = wanted ? choiceById(event, wanted) : undefined;

      if (choice && isChoiceTakeable(state, choice)) {
        choiceId = choice.id;
      } else if (isOverride) {
        // The one case the caller has to hear about: the alternative being
        // asked for is not available in this timeline.
        throw new EngineError(
          choice ? "REQUIREMENTS_UNMET" : "UNKNOWN_CHOICE",
          `Choice "${override.choiceId}" is not available on month ${m}.`,
        );
      } else {
        // A downstream event drifted. Take the first option still open, which
        // is deterministic, and tell the caller the timeline diverged.
        choiceId = takeableChoices(state, event)[0]?.id ?? null;
        if (choiceId !== plan[m - 1].choiceId) diverged.push(m);
      }
    } else if (plan[m - 1].choiceId !== null) {
      diverged.push(m);
    }

    const allocation = applyLock(
      fitAllocation(
        plan[m - 1].allocation,
        plan[m - 1].budget,
        availableDiscretionary(state),
      ),
      state,
    );
    const result = advanceMonth(state, allocation, event, choiceId, market[m - 1] ?? 0);

    state = result.state;
    states.push(structuredClone(state));
    records.push(result.record);
    netWorthByMonth.push(result.record.netWorthEnd);
  }

  return { states, records, netWorthByMonth, finalNetWorth: netWorth(state), diverged };
}

export interface WhatIf {
  month: number;
  choiceId: string;
  choiceLabel: string;
  available: boolean;
  /** Present only when unavailable — shown to the player, never swallowed. */
  reason?: string;
  /** The alternate line, for drawing over the player's own. */
  netWorthByMonth: Rupees[];
  finalNetWorth: Rupees;
  /** Alternate minus actual. **Positive means the alternative was better.** */
  delta: Rupees;
  /** Months after the substitution where the deck itself drifted. */
  diverged: number[];
}

/**
 * ★ What one different decision would have been worth.
 *
 * `REQUIREMENTS_UNMET` is caught here and nowhere else in the app. A `requires`
 * that held in the real run may not hold in a replayed one — paying a card in
 * full needs liquidity the alternate timeline may never have had. That is a
 * legitimate answer ("you could not have done this"), not a crash, and the UI
 * shows the reason rather than hiding the option.
 */
export function whatIf(
  pack: ContentPack,
  seed: number,
  market: number[],
  records: MonthRecord[],
  month: number,
  altChoiceId: string,
): WhatIf {
  const plan = planFromHistory(records);
  const actualFinal = records[records.length - 1]?.netWorthEnd ?? 0;

  const event = pack.events.find((e) => e.month === month);
  const label = event ? (choiceById(event, altChoiceId)?.label ?? altChoiceId) : altChoiceId;

  const base: WhatIf = {
    month,
    choiceId: altChoiceId,
    choiceLabel: label,
    available: false,
    netWorthByMonth: [],
    finalNetWorth: 0,
    delta: 0,
    diverged: [],
  };

  try {
    const result = replay(pack, seed, market, plan, { month, choiceId: altChoiceId });
    return {
      ...base,
      available: true,
      netWorthByMonth: result.netWorthByMonth,
      finalNetWorth: result.finalNetWorth,
      delta: result.finalNetWorth - actualFinal,
      diverged: result.diverged,
    };
  } catch (err) {
    if (!(err instanceof EngineError)) throw err;
    return {
      ...base,
      reason:
        err.code === "REQUIREMENTS_UNMET"
          ? "You could not have taken this one — by that month you did not have what it needed."
          : "That option is not on this card.",
    };
  }
}

export interface CostliestDecision {
  month: number;
  eventId: string;
  eventTitle: string;
  concept: string;
  yourChoiceId: string;
  yourChoiceLabel: string;
  betterChoiceId: string;
  betterChoiceLabel: string;
  /** Always ≥ 0. What taking the authored answer would have added. */
  costRupees: Rupees;
  /** The event's own authored takeaway. Never generated. */
  lesson: string;
}

/**
 * Every month where the authored answer would have left the player better off,
 * ranked by how much better.
 *
 * Costs are non-negative by construction: a substitution that turns out *worse*
 * is not a cost, and reporting it as one would be a lie dressed as rigour. Such
 * months are simply dropped — the honest reading is "that choice did not cost
 * you anything", which is sometimes true even for the wrong answer. Market luck
 * is real.
 */
export function costliestDecisions(
  pack: ContentPack,
  seed: number,
  market: number[],
  records: MonthRecord[],
  limit = 3,
): CostliestDecision[] {
  const out: CostliestDecision[] = [];

  for (const record of records) {
    if (!record.eventId || !record.choiceId || record.wasOptimalChoice) continue;
    const event = pack.events.find((e) => e.id === record.eventId);
    if (!event) continue;

    const better = choiceById(event, event.correctChoiceId);
    const yours = choiceById(event, record.choiceId);
    if (!better || !yours) continue;

    const result = whatIf(pack, seed, market, records, record.month, event.correctChoiceId);
    if (!result.available || result.delta <= 0) continue;

    out.push({
      month: record.month,
      eventId: event.id,
      eventTitle: event.title,
      concept: event.concept,
      yourChoiceId: yours.id,
      yourChoiceLabel: yours.label,
      betterChoiceId: better.id,
      betterChoiceLabel: better.label,
      costRupees: result.delta,
      lesson: event.debrief.rule,
    });
  }

  return out.sort((a, b) => b.costRupees - a.costRupees).slice(0, limit);
}
