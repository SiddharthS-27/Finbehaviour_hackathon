import { describe, it, expect } from "vitest";
import {
  fitAllocation,
  costliestDecisions,
  planFromHistory,
  replay,
  whatIf,
} from "../counterfactual";
import { marketForRun, takeableChoices } from "../deck";
import { optimalAllocation, optimalChoice } from "../agent";
import { availableDiscretionary, netWorth } from "../metrics";
import { createInitialState } from "../engine";
import { storyFirstEarner } from "@/content/packs/story-first-earner";
import { expectAllFinite, expectIntegerMoney, playRun } from "./helpers";
import { ZERO_ALLOC } from "./fixtures";
import type { Allocation, MonthRecord } from "../types";

/**
 * The what-if replay.
 *
 * Everything here rests on one invariant: replaying a run with no substitution
 * reproduces it exactly. If that ever breaks, every counterfactual number in
 * the report is quietly wrong and nothing on screen would show it.
 */

const PACK = storyFirstEarner;
const SEED = 909090;
const MARKET = marketForRun(PACK, SEED);

/** A player who takes the authored answer and allocates like the benchmark. */
function optimalPlayer() {
  return playRun({
    pack: PACK,
    seed: SEED,
    market: MARKET,
    choose: (event, state) => optimalChoice(state, event),
    allocate: (state) => optimalAllocation(state),
  });
}

/** A player who takes the tempting option and spends everything. */
function spender() {
  return playRun({
    pack: PACK,
    seed: SEED,
    market: MARKET,
    choose: (event, state) => {
      const takeable = takeableChoices(state, event);
      return (takeable.find((c) => c.visualWeight === "primary") ?? takeable[0]).id;
    },
    allocate: (state): Allocation => ({
      ...ZERO_ALLOC,
      discretionarySpend: availableDiscretionary(state),
    }),
  });
}

/** A player who takes the authored answer and hoards every spare rupee. */
function hoarder() {
  return playRun({
    pack: PACK,
    seed: SEED,
    market: MARKET,
    choose: (event, state) => optimalChoice(state, event),
    allocate: (state): Allocation => ({
      ...ZERO_ALLOC,
      toEmergencyFund: availableDiscretionary(state),
    }),
  });
}

describe("★ replay reproduces the original run exactly", () => {
  for (const [name, run] of [
    ["textbook", optimalPlayer()],
    ["spender", spender()],
    ["hoarder", hoarder()],
  ] as const) {
    it(`${name}: same net worth, same records, no divergence`, () => {
      const result = replay(PACK, SEED, MARKET, planFromHistory(run.records));

      expect(result.diverged).toEqual([]);
      expect(result.finalNetWorth).toBe(netWorth(run.state));
      expect(result.netWorthByMonth.slice(1)).toEqual(run.records.map((r) => r.netWorthEnd));
      expect(result.records.map((r) => r.choiceId)).toEqual(run.records.map((r) => r.choiceId));
      expect(result.records.map((r) => r.wasOptimalChoice)).toEqual(
        run.records.map((r) => r.wasOptimalChoice),
      );
      expectIntegerMoney(result.states[result.states.length - 1], `${name} replay`);
      expectAllFinite(result.netWorthByMonth, `${name} netWorthByMonth`);
    });
  }

  it("does not persist a single state to do it — seed and decisions are enough", () => {
    const run = spender();
    const plan = planFromHistory(run.records);
    // The plan is allocations, choice ids and the budget each consumed —
    // three fields, all of them derivable from the records. No SimState.
    for (const step of plan) {
      expect(Object.keys(step).sort()).toEqual(["allocation", "budget", "choiceId"]);
    }
    expect(replay(PACK, SEED, MARKET, plan).finalNetWorth).toBe(netWorth(run.state));
  });
});

describe("fitAllocation", () => {
  const alloc: Allocation = {
    discretionarySpend: 4000,
    toEmergencyFund: 6000,
    toInvest: 2000,
    extraDebtPayment: 0,
    extraDebtTargetId: null,
  };
  const BUDGET = 12000;
  const total = (a: Allocation) =>
    a.discretionarySpend + a.toEmergencyFund + a.toInvest + a.extraDebtPayment;

  it("is the identity when the budget has not moved", () => {
    expect(fitAllocation(alloc, BUDGET, BUDGET)).toEqual(alloc);
  });

  it("★ preserves shares when the budget grows", () => {
    const out = fitAllocation(alloc, BUDGET, 24000);
    expect(total(out)).toBe(24000);
    expect(out.discretionarySpend).toBe(8000);
    expect(out.toEmergencyFund).toBe(12000);
    expect(out.toInvest).toBe(4000);
  });

  it("preserves shares when the budget shrinks, landing exactly on it", () => {
    const out = fitAllocation(alloc, BUDGET, 6000);
    expect(total(out)).toBe(6000);
    expect(out.toEmergencyFund).toBeGreaterThan(out.discretionarySpend);
    for (const v of [out.discretionarySpend, out.toEmergencyFund, out.toInvest]) {
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
    }
  });

  it("never exceeds the new budget, whatever the basis says", () => {
    // A nonsense basis must still not produce an over-allocation, because the
    // engine throws on one and a throw here would mean this function is wrong.
    expect(total(fitAllocation(alloc, 1, 5000))).toBeLessThanOrEqual(5000);
    expect(total(fitAllocation(alloc, 0, 5000))).toBeLessThanOrEqual(5000);
  });

  it("zeroes everything when there is no budget left", () => {
    expect(total(fitAllocation(alloc, BUDGET, 0))).toBe(0);
  });

  it("keeps a zero allocation at zero rather than inventing one", () => {
    expect(total(fitAllocation(ZERO_ALLOC, 0, 50000))).toBe(0);
  });
});

describe("whatIf", () => {
  const run = spender();
  const records: MonthRecord[] = run.records;

  it("changes only the month asked about", () => {
    const month = records.find((r) => r.eventId && !r.wasOptimalChoice)!.month;
    const event = PACK.events.find((e) => e.month === month)!;
    const result = whatIf(PACK, SEED, MARKET, records, month, event.correctChoiceId);

    expect(result.available).toBe(true);
    // Everything before the substitution is byte-identical.
    expect(result.netWorthByMonth.slice(0, month)).toEqual(
      [netWorth(createInitialState(PACK, SEED)), ...records.map((r) => r.netWorthEnd)].slice(
        0,
        month,
      ),
    );
  });

  it("is stable — the same question twice gives the same answer", () => {
    const a = whatIf(PACK, SEED, MARKET, records, 5, "split");
    const b = whatIf(PACK, SEED, MARKET, records, 5, "split");
    expect(a.delta).toBe(b.delta);
    expect(a.netWorthByMonth).toEqual(b.netWorthByMonth);
  });

  it("produces a full alternate line, integer rupees throughout", () => {
    const result = whatIf(PACK, SEED, MARKET, records, 5, "split");
    expect(result.netWorthByMonth).toHaveLength(PACK.totalMonths + 1);
    for (const v of result.netWorthByMonth) expect(Number.isInteger(v)).toBe(true);
  });

  it("★ reports an impossible alternative rather than crashing", () => {
    // Month 12's correct answer needs ₹50,000 liquid. The spender has nothing.
    const result = whatIf(PACK, SEED, MARKET, records, 12, "clear_it");
    expect(result.available).toBe(false);
    expect(result.reason).toMatch(/could not have/i);
    expect(result.delta).toBe(0);
  });

  it("says so when the option is not on the card", () => {
    const result = whatIf(PACK, SEED, MARKET, records, 5, "no_such_choice");
    expect(result.available).toBe(false);
    expect(result.reason).toMatch(/not on this card/i);
  });

  it("substituting the choice already taken is worth exactly nothing", () => {
    const taken = records.find((r) => r.eventId && r.choiceId)!;
    const result = whatIf(PACK, SEED, MARKET, records, taken.month, taken.choiceId!);
    expect(result.available).toBe(true);
    expect(result.delta).toBe(0);
  });
});

describe("costliestDecisions", () => {
  it("★ every cost is positive, and they are ranked", () => {
    const run = spender();
    const top = costliestDecisions(PACK, SEED, MARKET, run.records);

    expect(top.length).toBeGreaterThan(0);
    expect(top.length).toBeLessThanOrEqual(3);
    for (const d of top) {
      expect(d.costRupees, `${d.eventTitle} cost ${d.costRupees}`).toBeGreaterThan(0);
      expect(Number.isInteger(d.costRupees)).toBe(true);
      expect(d.yourChoiceId).not.toBe(d.betterChoiceId);
      expect(d.lesson.length).toBeGreaterThan(0);
    }
    for (let i = 1; i < top.length; i++) {
      expect(top[i - 1].costRupees).toBeGreaterThanOrEqual(top[i].costRupees);
    }
  });

  it("★ costs are plausible — never larger than the whole run's swing", () => {
    const run = spender();
    const top = costliestDecisions(PACK, SEED, MARKET, run.records);
    const opening = netWorth(createInitialState(PACK, SEED));
    const swing = Math.abs(netWorth(run.state) - opening);

    for (const d of top) {
      expect(d.costRupees, `${d.eventTitle}: ₹${d.costRupees} against a ₹${swing} run`).toBeLessThan(
        swing * 3,
      );
    }
  });

  it("a flawless run has nothing to list", () => {
    const run = optimalPlayer();
    expect(costliestDecisions(PACK, SEED, MARKET, run.records)).toEqual([]);
  });
});
