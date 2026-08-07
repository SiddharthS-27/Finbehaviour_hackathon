/**
 * Phase 1 test fixtures — three stub events and a minimal pack.
 *
 * These are deliberately thin. Real authored content arrives in Phase 2; what
 * these exist to do is exercise the mechanics: flags, insurance, the pending
 * scheduler, and gating.
 */

import type {
  Allocation,
  ContentPack,
  EventCard,
  SimState,
} from "../types";

/* ─────────────────────────── allocations ─────────────────────── */

export const ZERO_ALLOC: Allocation = {
  discretionarySpend: 0,
  toEmergencyFund: 0,
  toInvest: 0,
  extraDebtPayment: 0,
  extraDebtTargetId: null,
};

export function alloc(partial: Partial<Allocation> = {}): Allocation {
  return { ...ZERO_ALLOC, ...partial };
}

/* ───────────────────────── stub events ───────────────────────── */

/** 1. Insurance — sets a flag and a recurring premium, or does not. */
export const STUB_INSURANCE: EventCard = {
  id: "stub-insurance",
  month: 2,
  title: "Health cover, ₹950 a month",
  body: "HR is offering a top-up health policy.",
  category: "opportunity",
  concept: "insurance",
  proofType: "ARITHMETIC",
  biases: ["optimism_bias"],
  pressure: [],
  correctChoiceId: "buy",
  choices: [
    {
      id: "buy",
      label: "Buy the cover",
      visualWeight: "normal",
      immediate: [
        { kind: "insurance", policy: "health", premiumMonthly: 950 },
        { kind: "flagAdd", flag: "health_insured" },
      ],
      delayed: [],
      fallbackNote: "You bought cover. It will feel like waste until it isn't.",
    },
    {
      id: "skip",
      label: "Skip it, you're 23",
      visualWeight: "primary",
      immediate: [{ kind: "stress", amount: -2 }],
      delayed: [],
      fallbackNote: "You skipped cover. Nothing happens this month.",
    },
  ],
  debrief: { opening: "stub", proof: "stub", rule: "stub" },
};

/**
 * 2. Phone EMI — the pending-scheduler fixture. Taking the EMI in month 3
 * queues a bill for month 8 and leaves a card debt behind for the gate.
 */
export const STUB_EMI: EventCard = {
  id: "stub-emi",
  month: 3,
  title: "Your phone dies",
  body: "No-cost EMI, or pay cash for a cheaper model.",
  category: "temptation",
  concept: "apr",
  proofType: "ARITHMETIC",
  biases: ["framing"],
  pressure: [],
  correctChoiceId: "cash",
  choices: [
    {
      id: "emi",
      label: "No-cost EMI, ₹5,417 × 12",
      visualWeight: "primary",
      immediate: [
        { kind: "flagAdd", flag: "has_card_debt" },
        {
          kind: "debtAdd",
          debt: {
            id: "card",
            label: "Credit card",
            kind: "credit_card",
            principal: 64999,
            apr: 0.42,
            minPaymentPct: 0.05,
            minPaymentFloor: 500,
            limit: 100000,
          },
        },
      ],
      // ★ five months later — fires in month 8
      delayed: [
        {
          monthsLater: 5,
          effects: [{ kind: "cash", amount: -6500 }],
          note: "The phone EMI you took in month 3 is due.",
        },
      ],
      fallbackNote: "You took the EMI. The cost shows up later, which is the point.",
    },
    {
      id: "cash",
      label: "Buy the ₹18,999 model in cash",
      visualWeight: "muted",
      immediate: [{ kind: "cash", amount: -18999 }],
      delayed: [],
      fallbackNote: "Boring, and correct.",
    },
  ],
  debrief: { opening: "stub", proof: "stub", rule: "stub" },
};

/** 3. Minimum due — gated. Never fires unless a card debt exists. */
export const STUB_GATED: EventCard = {
  id: "stub-gated",
  month: 8,
  title: "Minimum amount due",
  body: "Your card statement arrives.",
  category: "temptation",
  concept: "anchoring",
  proofType: "ARITHMETIC",
  biases: ["anchoring"],
  gate: { requiresFlags: ["has_card_debt"], requiresDebtKind: "credit_card" },
  pressure: [],
  correctChoiceId: "full",
  choices: [
    {
      id: "minimum",
      label: "Pay the minimum",
      visualWeight: "primary",
      immediate: [{ kind: "debtPay", debtId: "card", amount: 2100 }],
      delayed: [],
      fallbackNote: "The minimum is an anchor, not a target.",
    },
    {
      id: "full",
      label: "Pay it off in full",
      visualWeight: "normal",
      requires: { op: "minLiquid", amount: 40000 },
      blockedReason: "You do not have ₹40,000 liquid.",
      immediate: [{ kind: "debtPay", debtId: "card", amount: 42000 }],
      delayed: [],
      fallbackNote: "Cleared. A card is a 45-day loan or a 42% loan.",
    },
  ],
  debrief: { opening: "stub", proof: "stub", rule: "stub" },
};

export const STUB_EVENTS = [STUB_INSURANCE, STUB_EMI, STUB_GATED];

/* ──────────────────────────── the pack ───────────────────────── */

/** First Earner starting position, per plan §8.1. */
export function testPack(overrides: Partial<ContentPack> = {}): ContentPack {
  return {
    id: "test-pack",
    mode: "story",
    title: "Test pack",
    subtitle: "Phase 1 fixtures",
    lifeStages: ["first_earner"],
    totalMonths: 12,
    events: STUB_EVENTS,
    initialState: {
      packId: "test-pack",
      totalMonths: 12,
      age: 23,
      monthlyIncome: 42000,
      fixedExpenses: 26000,
      cash: 12000,
      emergencyFund: 0,
      portfolio: { value: 0, invested: 0 },
      debts: [
        {
          id: "edu",
          label: "Education loan",
          kind: "education_loan",
          principal: 180000,
          apr: 0.09,
          minPaymentPct: 0.02,
          minPaymentFloor: 2500,
        },
      ],
      insuranceHealthPremium: 0,
      insuranceTermPremium: 0,
      creditScore: 720,
      stress: 20,
      flags: [],
      subscriptions: [],
      xp: 0,
      badges: [],
      streak: 0,
    },
    ...overrides,
  };
}

/** A state, with any field overridden. */
export function testState(overrides: Partial<SimState> = {}): SimState {
  const pack = testPack();
  return {
    ...structuredClone(pack.initialState),
    seed: 12345,
    month: 1,
    pending: [],
    history: [],
    incomeBeforeBurnout: null,
    ...overrides,
  };
}

/** A flat market, so tests that are not about the market are not about it. */
export function flatMarket(months = 12): number[] {
  return Array.from({ length: months }, () => 0);
}
