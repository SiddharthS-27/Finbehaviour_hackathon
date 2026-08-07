import { describe, it, expect } from "vitest";
import {
  availableDiscretionary,
  creditUtilisation,
  debtsByApr,
  healthBand,
  healthScore,
  highInterestDebt,
  highestAprDebt,
  minPayment,
  monthlyOutflow,
  netWorth,
  runwayMonths,
  savingsRate,
  trailingSavingsRate,
} from "../metrics";
import type { Debt, MonthRecord } from "../types";
import { testState, ZERO_ALLOC } from "./fixtures";

function debt(over: Partial<Debt> = {}): Debt {
  return {
    id: "d",
    label: "Debt",
    kind: "credit_card",
    principal: 100000,
    apr: 0.42,
    minPaymentPct: 0.05,
    minPaymentFloor: 500,
    ...over,
  };
}

function record(over: Partial<MonthRecord> = {}): MonthRecord {
  return {
    month: 1,
    incomeReceived: 42000,
    fixedPaid: 26000,
    premiumsPaid: 0,
    subscriptionsPaid: 0,
    debtMinimumsPaid: 0,
    pendingFired: [],
    allocation: ZERO_ALLOC,
    eventId: null,
    choiceId: null,
    wasOptimalChoice: false,
    marketReturn: 0,
    missedPayment: false,
    netWorthEnd: 0,
    healthScoreEnd: 0,
    stressEnd: 20,
    notes: [],
    ...over,
  };
}

describe("netWorth", () => {
  it("counts liquid plus holdings, less every rupee owed", () => {
    const s = testState({
      cash: 10000,
      emergencyFund: 50000,
      portfolio: { value: 80000, invested: 70000 },
      debts: [debt({ principal: 30000 })],
    });
    expect(netWorth(s)).toBe(10000 + 50000 + 80000 - 30000);
  });

  it("goes negative when debt exceeds assets, rather than flooring at zero", () => {
    const s = testState({
      cash: 0,
      emergencyFund: 0,
      portfolio: { value: 0, invested: 0 },
      debts: [debt({ principal: 200000 })],
    });
    expect(netWorth(s)).toBe(-200000);
  });
});

describe("minPayment", () => {
  it("takes the percentage when it clears the floor", () => {
    expect(minPayment(debt({ principal: 100000, minPaymentPct: 0.05, minPaymentFloor: 500 }))).toBe(
      5000,
    );
  });

  it("takes the floor when the percentage is smaller", () => {
    expect(minPayment(debt({ principal: 5000, minPaymentPct: 0.05, minPaymentFloor: 500 }))).toBe(
      500,
    );
  });

  it("never asks for more than is owed", () => {
    expect(minPayment(debt({ principal: 300, minPaymentFloor: 500 }))).toBe(300);
  });

  it("is zero on a cleared debt", () => {
    expect(minPayment(debt({ principal: 0 }))).toBe(0);
  });
});

describe("runway", () => {
  it("divides liquid money by everything that goes out", () => {
    const s = testState({
      cash: 26000,
      emergencyFund: 26000,
      fixedExpenses: 26000,
      debts: [],
    });
    expect(runwayMonths(s)).toBe(2);
  });

  it("returns 99 rather than dividing by zero when nothing goes out", () => {
    const s = testState({ fixedExpenses: 0, debts: [], subscriptions: [] });
    expect(runwayMonths(s)).toBe(99);
    expect(Number.isFinite(runwayMonths(s))).toBe(true);
  });
});

describe("availableDiscretionary", () => {
  it("is income less everything already spoken for", () => {
    const s = testState(); // 42000 - 26000 - 3600 education-loan minimum
    expect(availableDiscretionary(s)).toBe(12400);
  });

  it("floors at zero rather than going negative", () => {
    const s = testState({ monthlyIncome: 10000, fixedExpenses: 90000 });
    expect(availableDiscretionary(s)).toBe(0);
  });

  it("subtracts premiums and subscriptions too", () => {
    const s = testState({
      insuranceHealthPremium: 950,
      insuranceTermPremium: 900,
      subscriptions: [{ id: "a", label: "A", monthlyCost: 499, startedMonth: 1 }],
    });
    expect(availableDiscretionary(s)).toBe(12400 - 950 - 900 - 499);
  });
});

describe("savingsRate", () => {
  it("is zero on zero income rather than NaN", () => {
    expect(savingsRate(record({ incomeReceived: 0 }))).toBe(0);
  });

  it("counts emergency fund, investing and extra debt payment as saving", () => {
    const r = record({
      incomeReceived: 40000,
      allocation: { ...ZERO_ALLOC, toEmergencyFund: 4000, toInvest: 3000, extraDebtPayment: 1000 },
    });
    expect(savingsRate(r)).toBeCloseTo(0.2);
  });

  it("does not count discretionary spend", () => {
    const r = record({
      incomeReceived: 40000,
      allocation: { ...ZERO_ALLOC, discretionarySpend: 20000 },
    });
    expect(savingsRate(r)).toBe(0);
  });
});

describe("trailingSavingsRate", () => {
  it("is zero with no history", () => {
    expect(trailingSavingsRate([])).toBe(0);
  });

  it("averages only the last three months", () => {
    const hi = record({
      incomeReceived: 10000,
      allocation: { ...ZERO_ALLOC, toInvest: 10000 },
    });
    const lo = record({ incomeReceived: 10000 });
    expect(trailingSavingsRate([hi, hi, hi, lo, lo, lo])).toBe(0);
  });
});

describe("debt ordering", () => {
  it("sorts ascending by APR for deterministic payment order", () => {
    const debts = [
      debt({ id: "c", apr: 0.42 }),
      debt({ id: "a", apr: 0.09 }),
      debt({ id: "b", apr: 0.16 }),
    ];
    expect(debtsByApr(debts).map((d) => d.id)).toEqual(["a", "b", "c"]);
  });

  it("breaks APR ties by id, so the order never wobbles", () => {
    const debts = [debt({ id: "z", apr: 0.2 }), debt({ id: "a", apr: 0.2 })];
    expect(debtsByApr(debts).map((d) => d.id)).toEqual(["a", "z"]);
  });

  it("does not mutate the array it is given", () => {
    const debts = [debt({ id: "c", apr: 0.42 }), debt({ id: "a", apr: 0.09 })];
    debtsByApr(debts);
    expect(debts.map((d) => d.id)).toEqual(["c", "a"]);
  });

  it("picks the highest APR still owing as the avalanche target", () => {
    const debts = [
      debt({ id: "cleared", apr: 0.9, principal: 0 }),
      debt({ id: "card", apr: 0.42 }),
      debt({ id: "edu", apr: 0.09 }),
    ];
    expect(highestAprDebt(debts)?.id).toBe("card");
  });

  it("returns null when everything is cleared", () => {
    expect(highestAprDebt([debt({ principal: 0 })])).toBeNull();
  });
});

describe("highInterestDebt", () => {
  it("counts only what is above 12%", () => {
    const s = testState({
      debts: [debt({ id: "card", apr: 0.42, principal: 50000 }), debt({ id: "edu", apr: 0.09, principal: 180000 })],
    });
    expect(highInterestDebt(s)).toBe(50000);
  });
});

describe("creditUtilisation", () => {
  it("is zero when there are no cards, rather than NaN", () => {
    expect(creditUtilisation(testState({ debts: [] }))).toBe(0);
  });

  it("is balance over limit across all cards", () => {
    const s = testState({
      debts: [debt({ id: "c1", principal: 40000, limit: 50000 })],
    });
    expect(creditUtilisation(s)).toBeCloseTo(0.8);
  });

  it("ignores non-card debt", () => {
    const s = testState({
      debts: [debt({ id: "edu", kind: "education_loan", principal: 180000 })],
    });
    expect(creditUtilisation(s)).toBe(0);
  });
});

describe("monthlyOutflow", () => {
  it("sums fixed costs, premiums, subscriptions and minimums", () => {
    const s = testState({
      fixedExpenses: 26000,
      insuranceHealthPremium: 950,
      subscriptions: [{ id: "a", label: "A", monthlyCost: 499, startedMonth: 1 }],
    });
    expect(monthlyOutflow(s)).toBe(26000 + 950 + 499 + 3600);
  });
});

describe("healthScore", () => {
  it("stays inside 0..100 for a wrecked position", () => {
    const s = testState({
      cash: 0,
      emergencyFund: 0,
      portfolio: { value: 0, invested: 0 },
      debts: [debt({ principal: 900000, apr: 0.42 })],
    });
    const score = healthScore(s, []);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("stays inside 0..100 for an excellent one", () => {
    const s = testState({
      cash: 500000,
      emergencyFund: 500000,
      portfolio: { value: 5000000, invested: 3000000 },
      debts: [],
      insuranceHealthPremium: 950,
      insuranceTermPremium: 900,
    });
    const saving = record({
      incomeReceived: 42000,
      allocation: { ...ZERO_ALLOC, toInvest: 20000 },
    });
    expect(healthScore(s, [saving, saving, saving])).toBe(100);
  });

  it("is finite on a zero-income state", () => {
    const s = testState({ monthlyIncome: 0, debts: [], fixedExpenses: 0 });
    expect(Number.isFinite(healthScore(s, []))).toBe(true);
  });

  it("rewards cover — the same position insured scores higher", () => {
    const bare = testState({ debts: [] });
    const covered = testState({
      debts: [],
      insuranceHealthPremium: 950,
      insuranceTermPremium: 900,
    });
    expect(healthScore(covered, [])).toBeGreaterThan(healthScore(bare, []));
  });
});

describe("healthBand", () => {
  it("maps each band at its boundary", () => {
    expect(healthBand(0)).toBe("Fragile");
    expect(healthBand(24)).toBe("Fragile");
    expect(healthBand(25)).toBe("Shaky");
    expect(healthBand(49)).toBe("Shaky");
    expect(healthBand(50)).toBe("Steady");
    expect(healthBand(69)).toBe("Steady");
    expect(healthBand(70)).toBe("Solid");
    expect(healthBand(84)).toBe("Solid");
    expect(healthBand(85)).toBe("Compounding");
    expect(healthBand(100)).toBe("Compounding");
  });
});
