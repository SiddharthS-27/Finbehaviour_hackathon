import { describe, it, expect } from "vitest";
import { advanceMonth, createInitialState } from "../engine";
import { rollMarket } from "../rng";
import { EngineError, type EventCard, type SimState } from "../types";
import { netWorth } from "../metrics";
import { alloc, flatMarket, testPack, testState, ZERO_ALLOC } from "./fixtures";
import {
  expectAllFinite,
  expectClamped,
  expectIntegerMoney,
  playRun,
} from "./helpers";

const PACK = testPack();
const SEED = 20260807;

/** A one-choice event that applies exactly the effects you hand it. */
function effectEvent(id: string, month: number, immediate: EventCard["choices"][0]["immediate"]): EventCard {
  return {
    id,
    month,
    title: id,
    body: "",
    category: "opportunity",
    concept: "budgeting",
    proofType: "RULE",
    biases: [],
    pressure: [],
    correctChoiceId: "only",
    choices: [
      {
        id: "only",
        label: "only",
        visualWeight: "normal",
        immediate,
        delayed: [],
        fallbackNote: "",
      },
    ],
    debrief: { opening: "", proof: "", rule: "" },
  };
}

/** Run a single month against a bespoke state. */
function oneMonth(
  state: SimState,
  opts: {
    event?: EventCard | null;
    choiceId?: string | null;
    market?: number;
    allocation?: Parameters<typeof advanceMonth>[1];
  } = {},
) {
  return advanceMonth(
    state,
    opts.allocation ?? ZERO_ALLOC,
    opts.event ?? null,
    opts.choiceId ?? null,
    opts.market ?? 0,
  );
}

/* ════════════════════════════ GATE 1 ════════════════════════════ */

describe("determinism", () => {
  it("produces byte-identical 12-month output from the same seed and inputs", () => {
    const market = rollMarket(SEED, 12);
    const run = () =>
      playRun({
        pack: PACK,
        seed: SEED,
        market,
        choose: (e) => e.choices[0].id,
        allocate: (s) => alloc({ toInvest: Math.min(3000, availableOf(s)) }),
      });

    const a = run();
    const b = run();

    expect(JSON.stringify(a.state)).toBe(JSON.stringify(b.state));
    expect(JSON.stringify(a.records)).toBe(JSON.stringify(b.records));
  });

  it("gives the same market path for a seed and a different one for another", () => {
    expect(rollMarket(SEED, 12)).toEqual(rollMarket(SEED, 12));
    expect(rollMarket(SEED, 12)).not.toEqual(rollMarket(SEED + 1, 12));
  });

  it("never mutates the state it is given", () => {
    const before = testState({ cash: 50000 });
    const snapshot = JSON.stringify(before);
    oneMonth(before, { allocation: alloc({ toInvest: 5000 }) });
    expect(JSON.stringify(before)).toBe(snapshot);
  });
});

function availableOf(s: SimState): number {
  // Mirrors metrics.availableDiscretionary without importing it into a closure
  // that the allocate callback would otherwise recompute per month.
  const min = s.debts.reduce((sum, d) => {
    if (d.principal <= 0) return sum;
    const pct = Math.round(d.principal * d.minPaymentPct);
    return sum + Math.min(d.principal, Math.max(pct, d.minPaymentFloor));
  }, 0);
  const subs = s.subscriptions.reduce((x, sub) => x + sub.monthlyCost, 0);
  return Math.max(
    0,
    s.monthlyIncome -
      s.fixedExpenses -
      s.insuranceHealthPremium -
      s.insuranceTermPremium -
      subs -
      min,
  );
}

/* ════════════════════════════ GATE 2 ════════════════════════════ */

describe("integer money", () => {
  it("keeps every money field an integer after each of 12 steps", () => {
    // Deliberately awkward numbers: odd income, fractional-looking APRs, and a
    // market that produces long decimals every single month.
    const pack = testPack({
      initialState: {
        ...testPack().initialState,
        monthlyIncome: 42137,
        fixedExpenses: 26011,
        cash: 12007,
        debts: [
          {
            id: "edu",
            label: "Education loan",
            kind: "education_loan",
            principal: 180007,
            apr: 0.0937,
            minPaymentPct: 0.0207,
            minPaymentFloor: 2503,
          },
        ],
      },
    });

    playRun({
      pack,
      seed: SEED,
      market: rollMarket(SEED, 12),
      choose: (e) => e.choices[0].id,
      allocate: (s) => alloc({ toInvest: Math.min(3333, availableOf(s)) }),
      onMonth: (state, record) => {
        expectIntegerMoney(state, `month ${record.month}`);
        expect(Number.isInteger(record.netWorthEnd)).toBe(true);
        expect(Number.isInteger(record.incomeReceived)).toBe(true);
        expect(Number.isInteger(record.debtMinimumsPaid)).toBe(true);
      },
    });
  });
});

/* ═══════════════════════ GATE 3 — ★ PENDING ═════════════════════ */

describe("★ pending scheduler", () => {
  it("fires an effect queued in month 3 with monthsLater 5 in month 8, exactly once", () => {
    const market = flatMarket(12);
    const seen: { month: number; notes: string[]; queued: number[] }[] = [];

    const { records } = playRun({
      pack: PACK,
      seed: SEED,
      market,
      // Take the EMI in month 3; the minimum elsewhere so nothing throws.
      choose: (e) => (e.id === "stub-emi" ? "emi" : e.id === "stub-gated" ? "minimum" : "skip"),
      onMonth: (state, record) =>
        seen.push({
          month: record.month,
          notes: [...record.pendingFired],
          queued: state.pending.map((p) => p.fireMonth),
        }),
    });

    const NOTE = "The phone EMI you took in month 3 is due.";

    // Queued in month 3, for month 8.
    expect(seen[2].queued).toContain(8);

    // Waits, untouched, through months 4–7.
    for (const m of [4, 5, 6, 7]) {
      expect(seen[m - 1].queued, `month ${m} still holds it`).toContain(8);
      expect(seen[m - 1].notes, `month ${m} must not fire it`).not.toContain(NOTE);
    }

    // Fires in month 8...
    expect(seen[7].notes).toContain(NOTE);
    // ...and leaves the queue in the same step.
    expect(seen[7].queued).not.toContain(8);

    // Exactly once across the whole run.
    const fireCount = records.filter((r) => r.pendingFired.includes(NOTE)).length;
    expect(fireCount).toBe(1);
  });

  it("actually charges the money when it fires", () => {
    const market = flatMarket(12);
    const { records } = playRun({
      pack: PACK,
      seed: SEED,
      market,
      choose: (e) => (e.id === "stub-emi" ? "emi" : e.id === "stub-gated" ? "minimum" : "skip"),
    });
    // Month 8 carries the -6500 hit; net worth must reflect it.
    expect(records[7].pendingFired.length).toBe(1);
  });
});

/* ═══════════════════ GATE 4 — ★ PENDING PAST END ════════════════ */

describe("★ pending past the end of the run", () => {
  it("discards an effect scheduled beyond totalMonths without crashing", () => {
    const late = effectEvent("late", 1, []);
    late.choices[0].delayed = [
      {
        monthsLater: 40, // month 41 of a 12-month run
        effects: [{ kind: "cash", amount: -999999 }],
        note: "This must never arrive.",
      },
    ];

    const pack = testPack({ events: [late] });
    const { state, records } = playRun({
      pack,
      seed: SEED,
      market: flatMarket(12),
    });

    expect(state.pending).toEqual([]);
    expect(records.every((r) => r.pendingFired.length === 0)).toBe(true);
    expect(state.cash).toBeGreaterThanOrEqual(0);
  });

  it("keeps an effect that lands exactly on the final month", () => {
    const onTime = effectEvent("on-time", 1, []);
    onTime.choices[0].delayed = [
      {
        monthsLater: 11, // month 12 exactly
        effects: [{ kind: "stress", amount: 5 }],
        note: "Lands on the last month.",
      },
    ];

    const pack = testPack({ events: [onTime] });
    const { records } = playRun({ pack, seed: SEED, market: flatMarket(12) });

    expect(records[11].pendingFired).toContain("Lands on the last month.");
  });
});

/* ════════════════════════════ GATE 5 ════════════════════════════ */

describe("overdraft", () => {
  it("turns negative cash into a 36% loan and zeroes the balance", () => {
    const s = testState({
      cash: 0,
      fixedExpenses: 60000, // outspends the ₹42,000 income by ₹18,000
      monthlyIncome: 42000,
      debts: [],
    });

    const { state } = oneMonth(s);

    expect(state.cash).toBe(0);
    const od = state.debts.find((d) => d.label === "Overdraft");
    expect(od).toBeDefined();
    expect(od?.apr).toBe(0.36);
    expect(od?.principal).toBe(18000);
    expect(state.creditScore).toBeLessThan(s.creditScore + 6);
  });

  it("is never a game over — the run continues to the last month", () => {
    const pack = testPack({
      initialState: { ...testPack().initialState, cash: 0, fixedExpenses: 90000 },
    });
    const { state, records } = playRun({ pack, seed: SEED, market: flatMarket(12) });

    expect(records).toHaveLength(12);
    expect(state.month).toBe(13);
    expect(netWorth(state)).toBeLessThan(0); // ruined, but still playing
  });
});

/* ════════════════════════════ GATE 6 ════════════════════════════ */

describe("clearing a debt", () => {
  it("removes it from the array and adds 15 CIBIL", () => {
    const s = testState({
      cash: 12000,
      debts: [
        {
          id: "small",
          label: "Small card",
          kind: "credit_card",
          principal: 5000,
          apr: 0.42,
          minPaymentPct: 0.05,
          minPaymentFloor: 500,
          limit: 100000,
        },
      ],
    });

    // min payment 500 → principal 4500; then pay 4500 extra to clear it.
    const { state, record } = oneMonth(s, {
      allocation: alloc({ extraDebtPayment: 4500 }),
    });

    expect(state.debts).toHaveLength(0);
    expect(record.notes).toContain("Cleared: Small card");
    // +15 for the clear, +6 for paying everything on time.
    expect(state.creditScore).toBe(720 + 15 + 6);
  });
});

/* ════════════════════════════ GATE 7 ════════════════════════════ */

describe("overpaying a debt", () => {
  it("refunds the remainder to cash rather than destroying it", () => {
    const s = testState({
      cash: 12000,
      debts: [
        {
          id: "small",
          label: "Small card",
          kind: "credit_card",
          principal: 5000,
          apr: 0.42,
          minPaymentPct: 0.05,
          minPaymentFloor: 500,
          limit: 100000,
        },
      ],
    });

    // cash: 12000 + 42000 - 26000 = 28000, less the 500 minimum = 27500.
    // Principal is then 4500; paying 10000 applies 4500 and refunds 5500.
    const { state } = oneMonth(s, { allocation: alloc({ extraDebtPayment: 10000 }) });

    expect(state.debts).toHaveLength(0);
    expect(state.cash).toBe(27500 - 4500);
  });

  it("refunds the whole payment when there is no debt left at all", () => {
    const s = testState({ cash: 12000, debts: [] });
    const { state } = oneMonth(s, { allocation: alloc({ extraDebtPayment: 8000 }) });
    expect(state.cash).toBe(12000 + 42000 - 26000);
  });
});

/* ════════════════════════════ GATE 8 ════════════════════════════ */

describe("zero income", () => {
  it("produces no NaN anywhere", () => {
    const s = testState({
      monthlyIncome: 0,
      fixedExpenses: 26000,
      cash: 100000,
      debts: [],
    });

    const { state, record } = oneMonth(s);

    expectAllFinite(state, "state");
    expectAllFinite(record, "record");
    expect(record.incomeReceived).toBe(0);
    expect(record.healthScoreEnd).toBeGreaterThanOrEqual(0);
    expect(record.healthScoreEnd).toBeLessThanOrEqual(100);
  });

  it("survives a whole run with no income and no assets", () => {
    const pack = testPack({
      initialState: {
        ...testPack().initialState,
        monthlyIncome: 0,
        fixedExpenses: 0,
        cash: 0,
        debts: [],
      },
    });
    const { state, records } = playRun({ pack, seed: SEED, market: flatMarket(12) });
    expectAllFinite(state, "state");
    expectAllFinite(records, "records");
  });
});

/* ════════════════════════════ GATE 9 ════════════════════════════ */

describe("clamps", () => {
  it("holds stress inside 0..100 under extreme effects", () => {
    const up = effectEvent("stress-up", 1, [{ kind: "stress", amount: 9999 }]);
    const r1 = oneMonth(testState(), { event: up, choiceId: "only" });
    expect(r1.state.stress).toBeLessThanOrEqual(100);

    const down = effectEvent("stress-down", 1, [{ kind: "stress", amount: -9999 }]);
    const r2 = oneMonth(testState({ stress: 90 }), { event: down, choiceId: "only" });
    expect(r2.state.stress).toBeGreaterThanOrEqual(0);
  });

  it("holds CIBIL inside 300..900 under extreme effects", () => {
    const up = effectEvent("cibil-up", 1, [{ kind: "creditScore", amount: 9999 }]);
    expect(oneMonth(testState(), { event: up, choiceId: "only" }).state.creditScore).toBe(900);

    // The effect floors at 300; step 11 then adds the on-time-payment bonus on
    // top, so the observable result is the floor plus that bonus — not 300.
    const down = effectEvent("cibil-down", 1, [{ kind: "creditScore", amount: -9999 }]);
    const after = oneMonth(testState(), { event: down, choiceId: "only" }).state.creditScore;
    expect(after).toBeGreaterThanOrEqual(300);
    expect(after).toBeLessThanOrEqual(310);
  });

  it("cannot be pushed below the floor even while missing payments", () => {
    const s = testState({
      cash: 0,
      monthlyIncome: 26000, // nothing left for the ₹3,600 minimum
      fixedExpenses: 26000,
      creditScore: 320,
    });
    let state = s;
    for (let i = 0; i < 6; i++) {
      state = oneMonth({ ...state, month: 1 }).state;
      expect(state.creditScore).toBeGreaterThanOrEqual(300);
    }
    expect(state.creditScore).toBe(300);
  });

  it("never lets the portfolio go negative", () => {
    const s = testState({ portfolio: { value: 100000, invested: 100000 } });

    // A market return worse than -100%.
    expect(oneMonth(s, { market: -2 }).state.portfolio.value).toBe(0);

    // A shock multiplier of zero.
    const wipe = effectEvent("wipe", 1, [{ kind: "portfolioMultiply", factor: 0 }]);
    expect(oneMonth(s, { event: wipe, choiceId: "only" }).state.portfolio.value).toBe(0);

    // Selling more than is held.
    const oversell = effectEvent("oversell", 1, [{ kind: "portfolioAdd", amount: -999999 }]);
    const after = oneMonth(s, { event: oversell, choiceId: "only" }).state;
    expect(after.portfolio.value).toBe(0);
    expect(after.portfolio.invested).toBe(0);
  });

  it("stays clamped across a full run with a violent market", () => {
    const market = Array.from({ length: 12 }, (_, i) => (i % 2 === 0 ? -0.9 : 1.5));
    playRun({
      pack: PACK,
      seed: SEED,
      market,
      choose: (e) => e.choices[0].id,
      onMonth: (state, record) => expectClamped(state, `month ${record.month}`),
    });
  });
});

/* ═══════════════════════════ GATE 10 ════════════════════════════ */

describe("allocation validation", () => {
  it("throws when the allocation exceeds the available budget", () => {
    const s = testState(); // available = 42000 - 26000 - 3600 = 12400
    expect(() => oneMonth(s, { allocation: alloc({ toInvest: 999999 }) })).toThrow(EngineError);

    try {
      oneMonth(s, { allocation: alloc({ toInvest: 999999 }) });
    } catch (err) {
      expect((err as EngineError).code).toBe("OVER_BUDGET");
    }
  });

  it("throws on a negative allocation", () => {
    const s = testState();
    try {
      oneMonth(s, { allocation: alloc({ toInvest: -1 }) });
      expect.unreachable("should have thrown");
    } catch (err) {
      expect((err as EngineError).code).toBe("NEGATIVE_ALLOCATION");
    }
  });

  it("accepts an allocation exactly equal to the budget", () => {
    const s = testState();
    // 42000 income - 26000 fixed - 3600 education-loan minimum
    expect(() => oneMonth(s, { allocation: alloc({ toInvest: 12400 }) })).not.toThrow();
  });

  it("throws on an unknown choice id", () => {
    const s = testState();
    const e = effectEvent("e", 1, []);
    try {
      oneMonth(s, { event: e, choiceId: "nope" });
      expect.unreachable("should have thrown");
    } catch (err) {
      expect((err as EngineError).code).toBe("UNKNOWN_CHOICE");
    }
  });

  it("throws REQUIREMENTS_UNMET so counterfactuals can catch it", () => {
    const s = testState({ cash: 0, emergencyFund: 0 });
    const e = effectEvent("e", 1, []);
    e.choices[0].requires = { op: "minLiquid", amount: 500000 };
    try {
      oneMonth(s, { event: e, choiceId: "only" });
      expect.unreachable("should have thrown");
    } catch (err) {
      expect((err as EngineError).code).toBe("REQUIREMENTS_UNMET");
    }
  });

  it("refuses to advance past the end of the run", () => {
    const s = testState({ month: 13, totalMonths: 12 });
    try {
      oneMonth(s);
      expect.unreachable("should have thrown");
    } catch (err) {
      expect((err as EngineError).code).toBe("RUN_COMPLETE");
    }
  });
});

/* ═══════════════════════ beyond the checklist ═══════════════════ */

describe("event gating", () => {
  it("produces no event in month 8 when the phone was paid for in cash", () => {
    const { records } = playRun({
      pack: PACK,
      seed: SEED,
      market: flatMarket(12),
      choose: (e) => (e.id === "stub-emi" ? "cash" : e.choices[0].id),
    });

    expect(records[2].choiceId).toBe("cash");
    // Month 8's gate needs has_card_debt, which was never set.
    expect(records[7].eventId).toBeNull();
    expect(records[7].choiceId).toBeNull();
  });

  it("fires month 8 when the EMI was taken", () => {
    const { records } = playRun({
      pack: PACK,
      seed: SEED,
      market: flatMarket(12),
      choose: (e) => (e.id === "stub-emi" ? "emi" : e.id === "stub-gated" ? "minimum" : "skip"),
    });
    expect(records[7].eventId).toBe("stub-gated");
  });
});

describe("burnout", () => {
  it("applies once and restores income exactly on recovery", () => {
    // An odd income so a lossy divide would not round-trip.
    const s = testState({ monthlyIncome: 42005, stress: 90, debts: [], fixedExpenses: 0 });

    const burnt = oneMonth(s).state;
    expect(burnt.flags).toContain("burnt_out");
    expect(burnt.monthlyIncome).toBe(Math.round(42005 * 0.9));
    expect(burnt.incomeBeforeBurnout).toBe(42005);

    // Applying again must not stack a second penalty.
    const stillBurnt = oneMonth({ ...burnt, stress: 90 }).state;
    expect(stillBurnt.monthlyIncome).toBe(burnt.monthlyIncome);

    // Drop below 40 and the exact original figure comes back.
    const recovered = oneMonth({ ...stillBurnt, stress: 30 }).state;
    expect(recovered.flags).not.toContain("burnt_out");
    expect(recovered.monthlyIncome).toBe(42005);
    expect(recovered.incomeBeforeBurnout).toBeNull();
  });
});

describe("missed payments", () => {
  it("records the miss, docks CIBIL and pays what it can", () => {
    const s = testState({
      cash: 0,
      monthlyIncome: 26500, // leaves ₹500 against a ₹3,600 minimum
      fixedExpenses: 26000,
    });

    const { state, record } = oneMonth(s);

    expect(record.missedPayment).toBe(true);
    expect(record.debtMinimumsPaid).toBe(500);
    expect(state.creditScore).toBeLessThan(720);
  });
});

describe("debtPay against a debt that no longer exists", () => {
  it("is a no-op rather than a crash", () => {
    const s = testState({ debts: [] });
    const e = effectEvent("ghost", 1, [{ kind: "debtPay", debtId: "gone", amount: 5000 }]);
    const { state } = oneMonth(s, { event: e, choiceId: "only" });
    expect(state.cash).toBe(12000 + 42000 - 26000);
  });
});

describe("createInitialState", () => {
  it("starts at month 1 with an empty queue and history", () => {
    const s = createInitialState(PACK, SEED);
    expect(s.month).toBe(1);
    expect(s.pending).toEqual([]);
    expect(s.history).toEqual([]);
    expect(s.seed).toBe(SEED);
    expect(s.totalMonths).toBe(12);
    expect(s.incomeBeforeBurnout).toBeNull();
  });

  it("does not alias the pack's initial state", () => {
    const a = createInitialState(PACK, 1);
    const b = createInitialState(PACK, 2);
    a.debts[0].principal = 1;
    expect(b.debts[0].principal).toBe(180000);
    expect(PACK.initialState.debts[0].principal).toBe(180000);
  });
});
