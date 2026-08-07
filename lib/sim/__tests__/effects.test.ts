import { describe, it, expect } from "vitest";
import { applyEffect, applyEffects, evaluateCondition, evaluateGate } from "../effects";
import type { Effect, SimState } from "../types";
import { testState } from "./fixtures";

function withEffect(s: SimState, e: Effect): SimState {
  const draft = structuredClone(s);
  applyEffect(draft, e);
  return draft;
}

describe("cash", () => {
  it("adds and subtracts", () => {
    expect(withEffect(testState({ cash: 1000 }), { kind: "cash", amount: 500 }).cash).toBe(1500);
    expect(withEffect(testState({ cash: 1000 }), { kind: "cash", amount: -1500 }).cash).toBe(-500);
  });
});

describe("emergencyFund", () => {
  it("tops up", () => {
    const s = withEffect(testState({ emergencyFund: 10000 }), {
      kind: "emergencyFund",
      amount: 5000,
    });
    expect(s.emergencyFund).toBe(15000);
  });

  it("spills a shortfall into cash instead of going negative", () => {
    // Money must never be destroyed or invented — the deficit becomes cash
    // pressure, which the overdraft step then catches.
    const s = withEffect(testState({ emergencyFund: 10000, cash: 2000 }), {
      kind: "emergencyFund",
      amount: -15000,
    });
    expect(s.emergencyFund).toBe(0);
    expect(s.cash).toBe(2000 - 5000);
  });
});

describe("portfolioAdd", () => {
  it("raises value and cost basis together on the way in", () => {
    const s = withEffect(testState({ portfolio: { value: 10000, invested: 10000 } }), {
      kind: "portfolioAdd",
      amount: 5000,
    });
    expect(s.portfolio).toEqual({ value: 15000, invested: 15000 });
  });

  it("scales the cost basis proportionally on the way out", () => {
    // Sold half of a holding that had doubled: basis should halve too.
    const s = withEffect(testState({ portfolio: { value: 20000, invested: 10000 } }), {
      kind: "portfolioAdd",
      amount: -10000,
    });
    expect(s.portfolio.value).toBe(10000);
    expect(s.portfolio.invested).toBe(5000);
  });

  it("moves no cash — content pairs it with an explicit cash effect", () => {
    const s = withEffect(testState({ cash: 1000, portfolio: { value: 20000, invested: 20000 } }), {
      kind: "portfolioAdd",
      amount: -20000,
    });
    expect(s.cash).toBe(1000);
  });

  it("clamps at zero when selling more than is held", () => {
    const s = withEffect(testState({ portfolio: { value: 5000, invested: 5000 } }), {
      kind: "portfolioAdd",
      amount: -99999,
    });
    expect(s.portfolio).toEqual({ value: 0, invested: 0 });
  });
});

describe("portfolioMultiply", () => {
  it("moves value but leaves the cost basis alone", () => {
    const s = withEffect(testState({ portfolio: { value: 100000, invested: 100000 } }), {
      kind: "portfolioMultiply",
      factor: 0.32, // the −68% Suryavanshi outcome
    });
    expect(s.portfolio.value).toBe(32000);
    expect(s.portfolio.invested).toBe(100000);
  });

  it("never produces a negative holding", () => {
    const s = withEffect(testState({ portfolio: { value: 100000, invested: 100000 } }), {
      kind: "portfolioMultiply",
      factor: -1,
    });
    expect(s.portfolio.value).toBe(0);
  });
});

describe("debtAdd", () => {
  it("appends a new debt with a deterministic id when none is given", () => {
    const s = withEffect(testState({ debts: [], month: 4 }), {
      kind: "debtAdd",
      debt: {
        label: "Card",
        kind: "credit_card",
        principal: 50000,
        apr: 0.42,
        minPaymentPct: 0.05,
        minPaymentFloor: 500,
      },
    });
    expect(s.debts).toHaveLength(1);
    expect(s.debts[0].id).toBe("credit_card-m4-0");
  });

  it("charges more to a card already carried rather than opening a second", () => {
    const base = testState({
      debts: [
        {
          id: "card",
          label: "Card",
          kind: "credit_card",
          principal: 20000,
          apr: 0.42,
          minPaymentPct: 0.05,
          minPaymentFloor: 500,
        },
      ],
    });
    const s = withEffect(base, {
      kind: "debtAdd",
      debt: {
        id: "card",
        label: "Card",
        kind: "credit_card",
        principal: 15000,
        apr: 0.42,
        minPaymentPct: 0.05,
        minPaymentFloor: 500,
      },
    });
    expect(s.debts).toHaveLength(1);
    expect(s.debts[0].principal).toBe(35000);
  });
});

describe("debtPay", () => {
  const base = testState({
    cash: 50000,
    debts: [
      {
        id: "card",
        label: "Card",
        kind: "credit_card",
        principal: 20000,
        apr: 0.42,
        minPaymentPct: 0.05,
        minPaymentFloor: 500,
      },
      {
        id: "edu",
        label: "Education",
        kind: "education_loan",
        principal: 100000,
        apr: 0.09,
        minPaymentPct: 0.02,
        minPaymentFloor: 2500,
      },
    ],
  });

  it("pays the named debt and takes the money from cash", () => {
    const s = withEffect(base, { kind: "debtPay", debtId: "card", amount: 5000 });
    expect(s.debts.find((d) => d.id === "card")?.principal).toBe(15000);
    expect(s.cash).toBe(45000);
  });

  it("targets the highest APR when no id is given", () => {
    const s = withEffect(base, { kind: "debtPay", debtId: null, amount: 5000 });
    expect(s.debts.find((d) => d.id === "card")?.principal).toBe(15000);
    expect(s.debts.find((d) => d.id === "edu")?.principal).toBe(100000);
  });

  it("never pays more than is owed", () => {
    const s = withEffect(base, { kind: "debtPay", debtId: "card", amount: 999999 });
    expect(s.debts.find((d) => d.id === "card")?.principal).toBe(0);
    expect(s.cash).toBe(50000 - 20000);
  });

  it("is a no-op when the debt is already gone (edge case 12)", () => {
    const s = withEffect(base, { kind: "debtPay", debtId: "vanished", amount: 5000 });
    expect(s.cash).toBe(50000);
    expect(s.debts).toHaveLength(2);
  });

  it("is a no-op when there is no debt at all", () => {
    const s = withEffect(testState({ debts: [], cash: 5000 }), {
      kind: "debtPay",
      debtId: null,
      amount: 5000,
    });
    expect(s.cash).toBe(5000);
  });
});

describe("insurance", () => {
  it("activates a policy", () => {
    const s = withEffect(testState(), {
      kind: "insurance",
      policy: "health",
      premiumMonthly: 950,
    });
    expect(s.insuranceHealthPremium).toBe(950);
  });

  it("cancels with a premium of zero — this is how the month-7 lapse works", () => {
    const s = withEffect(testState({ insuranceHealthPremium: 950 }), {
      kind: "insurance",
      policy: "health",
      premiumMonthly: 0,
    });
    expect(s.insuranceHealthPremium).toBe(0);
  });

  it("keeps the two policies independent", () => {
    const s = withEffect(testState({ insuranceHealthPremium: 950 }), {
      kind: "insurance",
      policy: "term",
      premiumMonthly: 900,
    });
    expect(s.insuranceHealthPremium).toBe(950);
    expect(s.insuranceTermPremium).toBe(900);
  });
});

describe("subscriptionAdd", () => {
  it("stamps the month it started", () => {
    const s = withEffect(testState({ month: 4 }), {
      kind: "subscriptionAdd",
      sub: { id: "gym", label: "Fitness app", monthlyCost: 499 },
    });
    expect(s.subscriptions[0].startedMonth).toBe(4);
  });

  it("does not double-add the same subscription", () => {
    let s = testState();
    const e: Effect = {
      kind: "subscriptionAdd",
      sub: { id: "gym", label: "Fitness app", monthlyCost: 499 },
    };
    s = withEffect(s, e);
    s = withEffect(s, e);
    expect(s.subscriptions).toHaveLength(1);
  });
});

describe("flags", () => {
  it("adds without duplicating", () => {
    let s = withEffect(testState(), { kind: "flagAdd", flag: "health_insured" });
    s = withEffect(s, { kind: "flagAdd", flag: "health_insured" });
    expect(s.flags).toEqual(["health_insured"]);
  });

  it("removes", () => {
    const s = withEffect(testState({ flags: ["health_insured", "other"] }), {
      kind: "flagRemove",
      flag: "health_insured",
    });
    expect(s.flags).toEqual(["other"]);
  });

  it("removing something absent is harmless", () => {
    const s = withEffect(testState({ flags: ["a"] }), { kind: "flagRemove", flag: "b" });
    expect(s.flags).toEqual(["a"]);
  });
});

describe("income and expenses", () => {
  it("multiplies income and rounds", () => {
    const s = withEffect(testState({ monthlyIncome: 42000 }), {
      kind: "incomeMultiply",
      factor: 1.22,
    });
    expect(s.monthlyIncome).toBe(51240);
    expect(Number.isInteger(s.monthlyIncome)).toBe(true);
  });

  it("shifts fixed expenses but never below zero", () => {
    expect(
      withEffect(testState({ fixedExpenses: 26000 }), { kind: "expenseDelta", amount: -99999 })
        .fixedExpenses,
    ).toBe(0);
  });
});

describe("applyEffects", () => {
  it("applies a list in order", () => {
    const s = structuredClone(testState({ cash: 0 }));
    applyEffects(s, [
      { kind: "cash", amount: 1000 },
      { kind: "cash", amount: -300 },
      { kind: "flagAdd", flag: "done" },
    ]);
    expect(s.cash).toBe(700);
    expect(s.flags).toContain("done");
  });
});

/* ───────────────────────── conditions ────────────────────────── */

describe("evaluateCondition", () => {
  const s = testState({ cash: 10000, emergencyFund: 40000, flags: ["health_insured"] });

  it("checks flags both ways", () => {
    expect(evaluateCondition(s, { op: "hasFlag", flag: "health_insured" })).toBe(true);
    expect(evaluateCondition(s, { op: "hasFlag", flag: "nope" })).toBe(false);
    expect(evaluateCondition(s, { op: "lacksFlag", flag: "nope" })).toBe(true);
  });

  it("checks cash and liquid separately", () => {
    expect(evaluateCondition(s, { op: "minCash", amount: 10000 })).toBe(true);
    expect(evaluateCondition(s, { op: "minCash", amount: 10001 })).toBe(false);
    // minLiquid counts the emergency fund; minCash does not.
    expect(evaluateCondition(s, { op: "minLiquid", amount: 50000 })).toBe(true);
    expect(evaluateCondition(s, { op: "minLiquid", amount: 50001 })).toBe(false);
  });

  it("composes with and / or / not", () => {
    expect(
      evaluateCondition(s, {
        op: "and",
        all: [
          { op: "hasFlag", flag: "health_insured" },
          { op: "minCash", amount: 5000 },
        ],
      }),
    ).toBe(true);

    expect(
      evaluateCondition(s, {
        op: "or",
        any: [
          { op: "hasFlag", flag: "nope" },
          { op: "minCash", amount: 5000 },
        ],
      }),
    ).toBe(true);

    expect(evaluateCondition(s, { op: "not", cond: { op: "hasFlag", flag: "nope" } })).toBe(true);
  });
});

/* ─────────────────────────── gates ───────────────────────────── */

describe("evaluateGate", () => {
  const s = testState({
    flags: ["has_card_debt"],
    stress: 50,
    debts: [
      {
        id: "card",
        label: "Card",
        kind: "credit_card",
        principal: 20000,
        apr: 0.42,
        minPaymentPct: 0.05,
        minPaymentFloor: 500,
      },
    ],
  });

  it("passes with no gate at all", () => {
    expect(evaluateGate(s, undefined)).toBe(true);
  });

  it("checks required and forbidden flags", () => {
    expect(evaluateGate(s, { requiresFlags: ["has_card_debt"] })).toBe(true);
    expect(evaluateGate(s, { requiresFlags: ["missing"] })).toBe(false);
    expect(evaluateGate(s, { forbidsFlags: ["has_card_debt"] })).toBe(false);
    expect(evaluateGate(s, { forbidsFlags: ["missing"] })).toBe(true);
  });

  it("checks a stress floor — the scam only targets depleted bandwidth", () => {
    expect(evaluateGate(s, { minStress: 45 })).toBe(true);
    expect(evaluateGate(s, { minStress: 51 })).toBe(false);
  });

  it("checks for a live debt of a given kind", () => {
    expect(evaluateGate(s, { requiresDebtKind: "credit_card" })).toBe(true);
    expect(evaluateGate(s, { requiresDebtKind: "personal_loan" })).toBe(false);
  });

  it("ignores a cleared debt of the right kind", () => {
    const cleared = testState({
      debts: [
        {
          id: "card",
          label: "Card",
          kind: "credit_card",
          principal: 0,
          apr: 0.42,
          minPaymentPct: 0.05,
          minPaymentFloor: 500,
        },
      ],
    });
    expect(evaluateGate(cleared, { requiresDebtKind: "credit_card" })).toBe(false);
  });

  it("requires every criterion at once", () => {
    expect(
      evaluateGate(s, { requiresFlags: ["has_card_debt"], minStress: 90 }),
    ).toBe(false);
  });
});
