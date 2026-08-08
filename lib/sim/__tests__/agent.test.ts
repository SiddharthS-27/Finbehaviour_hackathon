import { describe, it, expect } from "vitest";
import {
  AGENT_SPEND_FRACTION,
  gapAt,
  optimalAllocation,
  optimalChoice,
  revealedNetWorth,
  runOptimal,
} from "../agent";
import { advanceMonth, createInitialState } from "../engine";
import { eventForMonth, marketForRun, takeableChoices } from "../deck";
import { availableDiscretionary, highInterestDebt, netWorth, runwayMonths } from "../metrics";
import { CRITICAL, lockedSlider } from "../bandwidth";
import { storyFirstEarner } from "@/content/packs/story-first-earner";
import { expectAllFinite, expectIntegerMoney, playRun } from "./helpers";
import type { Rupees, SimState } from "../types";

/**
 * The shadow agent.
 *
 * The claim being tested is narrow and load-bearing: the benchmark plays the
 * *identical* world and is bound by every constraint the player is. If it can
 * take a choice the player could not, or move a slider the player's stress
 * locked, the gap in the report is inflated by exactly that much and the whole
 * comparison stops being honest.
 */

const PACK = storyFirstEarner;
const SEED = 424242;
const MARKET = marketForRun(PACK, SEED);

function forced(patch: Partial<SimState>): SimState {
  return { ...createInitialState(PACK, SEED), ...patch };
}

describe("allocation ladder", () => {
  it("spends something — a monk is not a fair benchmark", () => {
    const s = createInitialState(PACK, SEED);
    const a = optimalAllocation(s);
    expect(a.discretionarySpend).toBeGreaterThan(0);
    expect(a.discretionarySpend).toBe(
      Math.min(availableDiscretionary(s), Math.round(s.monthlyIncome * AGENT_SPEND_FRACTION)),
    );
  });

  it("is the plan's flat ₹3,000 at the mid tier's ₹42,000 take-home", () => {
    expect(Math.round(42000 * AGENT_SPEND_FRACTION)).toBe(3000);
  });

  it("allocates every rupee of the budget, always", () => {
    const cases: SimState[] = [
      createInitialState(PACK, SEED),
      forced({ cash: 5000, emergencyFund: 0 }),
      forced({ cash: 900000, emergencyFund: 900000, debts: [] }),
      forced({ debts: [], emergencyFund: 400000 }),
      forced({ stress: 90 }),
      forced({ monthlyIncome: 0 }),
    ];

    for (const s of cases) {
      const a = optimalAllocation(s);
      const sum =
        a.discretionarySpend + a.toEmergencyFund + a.toInvest + a.extraDebtPayment;
      expect(sum, JSON.stringify(a)).toBe(availableDiscretionary(s));
      for (const v of [a.discretionarySpend, a.toEmergencyFund, a.toInvest, a.extraDebtPayment]) {
        expect(Number.isInteger(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("rung 1 — under a month of cover, everything spare goes to the buffer", () => {
    const s = forced({ cash: 2000, emergencyFund: 0 });
    expect(runwayMonths(s)).toBeLessThan(CRITICAL.runwayMonths);
    const a = optimalAllocation(s);
    expect(a.toEmergencyFund).toBeGreaterThan(0);
    expect(a.toInvest).toBe(0);
    expect(a.extraDebtPayment).toBe(0);
  });

  it("rung 2 — expensive debt outranks investing", () => {
    const s = forced({
      cash: 500000,
      emergencyFund: 300000,
      debts: [
        {
          id: "card",
          label: "Credit card",
          kind: "credit_card",
          principal: 60000,
          apr: 0.42,
          minPaymentPct: 0.05,
          minPaymentFloor: 500,
          limit: 100000,
        },
      ],
    });
    expect(runwayMonths(s)).toBeGreaterThan(6);
    expect(highInterestDebt(s)).toBeGreaterThan(0);

    const a = optimalAllocation(s);
    expect(a.extraDebtPayment).toBeGreaterThan(0);
    expect(a.toInvest).toBe(0);
    // null means avalanche — highest APR first, decided by the engine.
    expect(a.extraDebtTargetId).toBeNull();
  });

  it("rung 3 — thin but not critical, buffer 70 / market 30", () => {
    const s = forced({ cash: 60000, emergencyFund: 20000, debts: [] });
    const runway = runwayMonths(s);
    expect(runway).toBeGreaterThanOrEqual(1);
    expect(runway).toBeLessThan(6);

    const a = optimalAllocation(s);
    const rest = a.toEmergencyFund + a.toInvest;
    expect(a.toEmergencyFund / rest).toBeCloseTo(0.7, 2);
    expect(a.toInvest / rest).toBeCloseTo(0.3, 2);
  });

  it("rung 4 — comfortable, buffer 20 / market 80", () => {
    const s = forced({ cash: 200000, emergencyFund: 400000, debts: [] });
    expect(runwayMonths(s)).toBeGreaterThanOrEqual(6);

    const a = optimalAllocation(s);
    const rest = a.toEmergencyFund + a.toInvest;
    expect(a.toEmergencyFund / rest).toBeCloseTo(0.2, 2);
    expect(a.toInvest / rest).toBeCloseTo(0.8, 2);
  });
});

describe("the agent is bound by the same rules the player is", () => {
  it("★ never moves a slider the bandwidth tax locked", () => {
    // Every state where stress locks something, across all three lock targets.
    const cases: SimState[] = [
      forced({ stress: 90, cash: 2000, emergencyFund: 0 }), // locks emergency fund
      forced({
        stress: 90,
        cash: 300000,
        emergencyFund: 300000,
        debts: [
          {
            id: "card",
            label: "Card",
            kind: "credit_card",
            principal: 50000,
            apr: 0.42,
            minPaymentPct: 0.05,
            minPaymentFloor: 500,
            limit: 100000,
          },
        ],
      }), // locks extra debt payment
      forced({ stress: 90, cash: 300000, emergencyFund: 300000, debts: [] }), // locks investing
    ];

    for (const s of cases) {
      const lock = lockedSlider(s);
      expect(lock, "this fixture was supposed to lock something").not.toBeNull();
      const a = optimalAllocation(s);
      expect(a[lock!.key], `agent moved the locked ${lock!.key}`).toBe(0);
      // And it still places every rupee — the lock costs it, it does not exempt it.
      expect(
        a.discretionarySpend + a.toEmergencyFund + a.toInvest + a.extraDebtPayment,
      ).toBe(availableDiscretionary(s));
    }
  });

  it("★ never takes a choice a blocked CIBIL would have denied the player", () => {
    for (const event of PACK.events) {
      const s = forced({ creditScore: 400, month: event.month });
      const takeable = takeableChoices(s, event).map((c) => c.id);
      const picked = optimalChoice(s, event);
      expect(takeable.length, `${event.id} left the player nothing`).toBeGreaterThan(0);
      expect(takeable, `${event.id}: agent picked a blocked choice`).toContain(picked);
    }
  });

  it("takes the authored correct answer whenever it is available", () => {
    for (const event of PACK.events) {
      const s = forced({ month: event.month });
      const takeable = takeableChoices(s, event).map((c) => c.id);
      if (!takeable.includes(event.correctChoiceId)) continue;
      expect(optimalChoice(s, event)).toBe(event.correctChoiceId);
    }
  });

  it("falls back to the first takeable choice, deterministically", () => {
    // An event whose *correct* answer has a requirement — paying the card in
    // full needs the liquidity to do it. Broke, the agent cannot take it.
    const event = PACK.events.find(
      (e) => e.choices.find((c) => c.id === e.correctChoiceId)?.requires,
    )!;
    const broke = forced({ cash: 0, emergencyFund: 0, portfolio: { value: 0, invested: 0 } });

    const takeable = takeableChoices(broke, event);
    expect(
      takeable.map((c) => c.id),
      "the fixture was supposed to block the correct answer",
    ).not.toContain(event.correctChoiceId);

    const picked = optimalChoice(broke, event);
    expect(picked).toBe(takeable[0].id);
    // Same state, same answer. Twice.
    expect(optimalChoice(broke, event)).toBe(picked);
  });
});

describe("the optimal run", () => {
  const run = runOptimal(PACK, SEED, MARKET);

  it("completes all twelve months without a content dead end", () => {
    expect(run.truncated).toBe(false);
    expect(run.records).toHaveLength(PACK.totalMonths);
    expect(run.netWorthByMonth).toHaveLength(PACK.totalMonths + 1);
  });

  it("holds only integer rupees and finite numbers", () => {
    expectIntegerMoney(run.finalState, "optimal final state");
    expectAllFinite(run.netWorthByMonth, "netWorthByMonth");
    for (const v of run.netWorthByMonth) expect(Number.isInteger(v)).toBe(true);
  });

  it("starts from the same opening balance the player does", () => {
    expect(run.netWorthByMonth[0]).toBe(netWorth(createInitialState(PACK, SEED)));
  });

  it("is deterministic — same seed, byte-identical run", () => {
    const again = runOptimal(PACK, SEED, MARKET);
    expect(again.netWorthByMonth).toEqual(run.netWorthByMonth);
    expect(again.records.map((r) => r.choiceId)).toEqual(run.records.map((r) => r.choiceId));
    expect(again.finalNetWorth).toBe(run.finalNetWorth);
  });

  it("faces the identical market the player does", () => {
    expect(run.records.map((r) => r.marketReturn)).toEqual(MARKET.slice(0, PACK.totalMonths));
  });

  it("ends better off than it started, and better than doing nothing", () => {
    const idle = playRun({ pack: PACK, seed: SEED, market: MARKET, choose: () => null });
    expect(run.finalNetWorth).toBeGreaterThan(run.netWorthByMonth[0]);
    expect(run.finalNetWorth).toBeGreaterThan(netWorth(idle.state));
  });

  it("is cheap enough to run on mount", () => {
    // No clock inside lib/sim — the timing lives here, where it is allowed.
    const start = performance.now();
    for (let i = 0; i < 20; i++) runOptimal(PACK, SEED + i, MARKET);
    const perRun = (performance.now() - start) / 20;
    expect(perRun, `${perRun.toFixed(2)}ms per optimal run`).toBeLessThan(50);
  });
});

describe("reveal", () => {
  const run = runOptimal(PACK, SEED, MARKET);

  it("★ never reveals a month the player has not played", () => {
    for (let played = 0; played <= PACK.totalMonths; played++) {
      const shown = revealedNetWorth(run, played);
      expect(shown).toHaveLength(played + 1);
      expect(shown).toEqual(run.netWorthByMonth.slice(0, played + 1));
    }
  });

  it("clamps rather than leaking, on nonsense input", () => {
    expect(revealedNetWorth(run, -5)).toEqual([run.netWorthByMonth[0]]);
    expect(revealedNetWorth(run, 999)).toEqual(run.netWorthByMonth);
  });

  it("gap is zero at month zero — both lines start together", () => {
    expect(gapAt(run, 0, run.netWorthByMonth[0])).toBe(0);
  });

  it("gap is positive when the agent is ahead", () => {
    expect(gapAt(run, 6, run.netWorthByMonth[6] - 50000)).toBe(50000);
    expect(gapAt(run, 6, run.netWorthByMonth[6] + 50000)).toBe(-50000);
  });
});

describe("a player who answers everything correctly lands close to the shadow", () => {
  /**
   * The gate's third bullet. "Close" is not "equal" and must not be: the agent
   * also allocates optimally every month, and a player copying only the *event*
   * answers is still choosing their own sliders. What the test asserts is that
   * the gap is a fraction of the run rather than a chasm — if picking every
   * correct answer left you 10× behind, the correct answers would be a lie.
   */
  it("stays within a modest fraction of the benchmark", () => {
    const optimal = runOptimal(PACK, SEED, MARKET);

    const player = playRun({
      pack: PACK,
      seed: SEED,
      market: MARKET,
      choose: (event, state) => optimalChoice(state, event),
      allocate: (state) => optimalAllocation(state),
    });

    // Same policy on both sides — this had better be exact, or `playRun` and
    // `runOptimal` have quietly diverged.
    expect(netWorth(player.state)).toBe(optimal.finalNetWorth);
  });

  it("correct answers with a naive 50/50 split still tracks the benchmark", () => {
    const optimal = runOptimal(PACK, SEED, MARKET);

    const player = playRun({
      pack: PACK,
      seed: SEED,
      market: MARKET,
      choose: (event, state) => optimalChoice(state, event),
      allocate: (state) => {
        const budget = availableDiscretionary(state);
        const lock = lockedSlider(state)?.key ?? null;
        const half = Math.round(budget / 2);
        const alloc = {
          discretionarySpend: budget - half,
          toEmergencyFund: half,
          toInvest: 0,
          extraDebtPayment: 0,
          extraDebtTargetId: null,
        };
        // Respect the lock, exactly as the UI would.
        if (lock === "toEmergencyFund") {
          alloc.discretionarySpend = budget;
          alloc.toEmergencyFund = 0;
        }
        return alloc;
      },
    });

    const gap = optimal.finalNetWorth - netWorth(player.state);
    const scale = Math.abs(optimal.finalNetWorth - optimal.netWorthByMonth[0]);
    expect(gap, "the agent should still be ahead").toBeGreaterThan(0);
    expect(
      gap / scale,
      `gap ₹${gap} against a run that moved ₹${scale}`,
    ).toBeLessThan(1.5);
  });
});

describe("the agent survives states it should never see", () => {
  it("copes with zero income", () => {
    const s = forced({ monthlyIncome: 0 });
    const a = optimalAllocation(s);
    expect(a.discretionarySpend + a.toEmergencyFund + a.toInvest + a.extraDebtPayment).toBe(0);
  });

  it("copes with a state where every ladder rung is locked out", () => {
    // Stress locks the buffer, and the buffer is the only rung that applies.
    const s = forced({ stress: 95, cash: 1000, emergencyFund: 0, debts: [] });
    expect(lockedSlider(s)?.key).toBe("toEmergencyFund");
    const a = optimalAllocation(s);
    const budget = availableDiscretionary(s);
    expect(a.toEmergencyFund).toBe(0);
    expect(a.discretionarySpend + a.toInvest + a.extraDebtPayment).toBe(budget);
  });

  it("its allocations are always accepted by the engine", () => {
    // The engine throws OVER_BUDGET on a caller bug. Walk the whole run and
    // confirm the agent never produces one.
    let state = createInitialState(PACK, SEED);
    for (let m = 1; m <= PACK.totalMonths; m++) {
      const event = eventForMonth(PACK, m, state);
      const choiceId = event ? optimalChoice(state, event) : null;
      const result = advanceMonth(
        state,
        optimalAllocation(state),
        event,
        choiceId,
        MARKET[m - 1] ?? 0,
      );
      state = result.state;
      expectIntegerMoney(state, `optimal month ${m}`);
    }
    const final: Rupees = netWorth(state);
    expect(Number.isInteger(final)).toBe(true);
  });
});
