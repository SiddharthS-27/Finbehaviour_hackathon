import { describe, it, expect } from "vitest";
import {
  CRITICAL,
  creditBlockReason,
  criticalBanner,
  criticalState,
  isCreditChoice,
  lockedSlider,
} from "../bandwidth";
import { advanceMonth } from "../engine";
import { runwayMonths } from "../metrics";
import { choiceAvailability, takeableChoices } from "../deck";
import type { Choice, EventCard, SimState } from "../types";
import { testState, ZERO_ALLOC } from "./fixtures";

/**
 * The bandwidth tax and the other near-death states.
 *
 * These are game mechanics, not presentation, which is why they are tested
 * here rather than only through the UI: the shadow agent has to face exactly
 * what the player faces, and a rule that lived in a component could not be
 * shared with it.
 */

const withStress = (stress: number, patch: Partial<SimState> = {}): SimState => ({
  ...testState(),
  stress,
  ...patch,
});

describe("criticalState thresholds", () => {
  it("is quiet when nothing is wrong", () => {
    const s = withStress(20, { emergencyFund: 500000, month: 4 });
    const c = criticalState(s);
    expect(c.any).toBe(false);
    expect(c.desaturation).toBe(0);
  });

  it("flags runway under a month", () => {
    const s = withStress(10, { cash: 0, emergencyFund: 0, month: 4 });
    expect(runwayMonths(s)).toBeLessThan(1);
    expect(criticalState(s).runwayCritical).toBe(true);
    expect(criticalState(s).desaturation).toBeGreaterThan(0);
  });

  it("★ never desaturates month 1, because that is the starting position", () => {
    // The First Earner opens on 0.4 months of runway. Draining the colour from
    // the first frame would make the signal meaningless.
    const opening = withStress(20, { month: 1 });
    expect(runwayMonths(opening)).toBeLessThan(1);
    expect(criticalState(opening).runwayCritical).toBe(true);
    expect(criticalState(opening).desaturation).toBe(0);

    // The banner still speaks up — it is useful advice, not a punishment.
    expect(criticalBanner(opening)?.title).toMatch(/cover/i);

    // And by month 2 the visual consequence is live.
    expect(criticalState({ ...opening, month: 2 }).desaturation).toBeGreaterThan(0);
  });

  it("locks a slider above 70 and times choices above 85", () => {
    expect(criticalState(withStress(70)).stressLocked).toBe(false);
    expect(criticalState(withStress(71)).stressLocked).toBe(true);
    expect(criticalState(withStress(85)).stressTimed).toBe(false);
    expect(criticalState(withStress(86)).stressTimed).toBe(true);
  });

  it("flags EXPENSIVE debt above three months of income", () => {
    const s = withStress(10, { emergencyFund: 500000 });
    const card = (principal: number) => ({
      id: "card",
      label: "Card",
      kind: "credit_card" as const,
      principal,
      apr: 0.42,
      minPaymentPct: 0.05,
      minPaymentFloor: 1000,
    });

    expect(criticalState({ ...s, debts: [card(s.monthlyIncome * 2)] }).debtCritical).toBe(false);
    expect(criticalState({ ...s, debts: [card(s.monthlyIncome * 3 + 1)] }).debtCritical).toBe(true);
  });

  it("★ a cheap education loan never triggers the notifications", () => {
    // The First Earner opens the game at 4.3x income on a 9% loan. Shouting at
    // them from month 1 would desensitise them long before it matters.
    const s = withStress(10, { emergencyFund: 500000 });
    expect(s.debts[0].apr).toBeLessThan(0.12);
    expect(s.debts[0].principal).toBeGreaterThan(s.monthlyIncome * 3);
    expect(criticalState(s).debtCritical).toBe(false);
    expect(criticalState(s).any).toBe(false);
  });

  it("flags a CIBIL under 600", () => {
    expect(criticalState(withStress(10, { creditScore: 600 })).creditCritical).toBe(false);
    expect(criticalState(withStress(10, { creditScore: 599 })).creditCritical).toBe(true);
  });

  it("deepens the desaturation as things get worse", () => {
    const tight = criticalState(withStress(75, { cash: 0, emergencyFund: 0, month: 4 }));
    const dire = criticalState(withStress(95, { cash: 0, emergencyFund: 0, month: 4 }));
    expect(dire.desaturation).toBeGreaterThan(tight.desaturation);
    expect(dire.desaturation).toBeLessThanOrEqual(1);
  });
});

describe("★ the bandwidth tax", () => {
  it("takes nothing at or below 70", () => {
    expect(lockedSlider(withStress(70))).toBeNull();
    expect(lockedSlider(withStress(0))).toBeNull();
  });

  it("is deterministic — the same state always locks the same control", () => {
    const s = withStress(80);
    const a = lockedSlider(s);
    const b = lockedSlider({ ...s });
    expect(a?.key).toBe(b?.key);
    // A random lock would be a dice roll rather than a tax, and the shadow
    // agent could not face it identically.
    for (let i = 0; i < 20; i++) expect(lockedSlider(s)?.key).toBe(a?.key);
  });

  it("★ takes the lever you most need", () => {
    // No buffer → the buffer is what you cannot face.
    const broke = withStress(80, { cash: 0, emergencyFund: 0 });
    expect(lockedSlider(broke)?.key).toBe("toEmergencyFund");

    // Buffer fine, expensive debt → the debt is what you cannot face.
    const indebted = withStress(80, {
      emergencyFund: 500000,
      debts: [
        {
          id: "card",
          label: "Card",
          kind: "credit_card",
          principal: 50000,
          apr: 0.42,
          minPaymentPct: 0.05,
          minPaymentFloor: 1000,
        },
      ],
    });
    expect(lockedSlider(indebted)?.key).toBe("extraDebtPayment");

    // Nothing urgent → the future is what you cannot face.
    const comfortable = withStress(80, { emergencyFund: 500000, debts: [] });
    expect(lockedSlider(comfortable)?.key).toBe("toInvest");
  });

  it("★ never locks discretionary spending", () => {
    // Forcing someone to save would be a help, and would invert the lesson.
    const states = [
      withStress(75, { cash: 0, emergencyFund: 0 }),
      withStress(90, { emergencyFund: 500000, debts: [] }),
      withStress(100, { emergencyFund: 1, debts: [] }),
    ];
    for (const s of states) expect(lockedSlider(s)?.key).not.toBe("discretionarySpend");
  });

  it("always explains itself", () => {
    const lock = lockedSlider(withStress(80));
    expect(lock?.reason.length).toBeGreaterThan(30);
    expect(lock?.reason).toMatch(/70/);
  });
});

describe("credit closes off below 600", () => {
  const creditChoice: Choice = {
    id: "borrow",
    label: "Put it on the card",
    visualWeight: "primary",
    immediate: [
      {
        kind: "debtAdd",
        debt: {
          id: "x",
          label: "Card",
          kind: "credit_card",
          principal: 100000,
          apr: 0.42,
          minPaymentPct: 0.05,
          minPaymentFloor: 1000,
        },
      },
    ],
    delayed: [],
    fallbackNote: "You borrowed, and it will cost you more than the thing did.",
  };

  const cashChoice: Choice = {
    id: "pay",
    label: "Pay from savings",
    visualWeight: "normal",
    immediate: [{ kind: "emergencyFund", amount: -10000 }],
    delayed: [],
    fallbackNote: "That came straight out of the buffer, which is what it was for.",
  };

  it("recognises a credit-taking choice", () => {
    expect(isCreditChoice(creditChoice)).toBe(true);
    expect(isCreditChoice(cashChoice)).toBe(false);
  });

  it("blocks credit choices under 600 and says why", () => {
    const s = withStress(10, { creditScore: 550 });
    const reason = creditBlockReason(s, creditChoice);
    expect(reason).toBeTruthy();
    expect(reason).toMatch(/550/);
    expect(creditBlockReason(s, cashChoice)).toBeNull();
  });

  it("leaves everything alone at 600 and above", () => {
    const s = withStress(10, { creditScore: 600 });
    expect(creditBlockReason(s, creditChoice)).toBeNull();
  });

  it("★ flows through deck availability, so the shadow agent is bound too", () => {
    const event: EventCard = {
      id: "credit-test",
      month: 1,
      title: "Credit test",
      body: "A choice that needs credit, and one that does not.",
      category: "emergency",
      concept: "apr",
      proofType: "ARITHMETIC",
      biases: [],
      pressure: [],
      choices: [creditChoice, cashChoice],
      correctChoiceId: "pay",
      debrief: { opening: "x", proof: "y", rule: "z" },
    };

    const healthy = withStress(10, { creditScore: 720 });
    const damaged = withStress(10, { creditScore: 520 });

    expect(takeableChoices(healthy, event)).toHaveLength(2);
    expect(takeableChoices(damaged, event).map((c) => c.id)).toEqual(["pay"]);

    // Blocked, not hidden — *why you cannot* is the lesson.
    const blocked = choiceAvailability(damaged, event).find((c) => c.choice.id === "borrow");
    expect(blocked?.available).toBe(false);
    expect(blocked?.reason).toMatch(/CIBIL/);
  });
});

describe("the banner", () => {
  it("says nothing when nothing is wrong", () => {
    expect(criticalBanner(withStress(10, { emergencyFund: 500000, month: 4 }))).toBeNull();
  });

  it("leads with runway, which is the most urgent thing", () => {
    const s = withStress(90, { cash: 0, emergencyFund: 0 });
    expect(criticalBanner(s)?.title).toMatch(/cover/i);
  });

  it("never shames the player", () => {
    const states = [
      withStress(75, { cash: 0, emergencyFund: 0, month: 4 }),
      withStress(95, { emergencyFund: 500000, month: 4 }),
      withStress(10, { creditScore: 480, emergencyFund: 500000, month: 4 }),
    ];
    for (const s of states) {
      const b = criticalBanner(s);
      expect(b).toBeTruthy();
      // "you failed", "your fault", "stupid" — none of it, ever.
      expect(`${b!.title} ${b!.body}`).not.toMatch(/failed|fault|stupid|bad with money/i);
    }
  });
});

describe("★ the run never ends early", () => {
  it("survives twelve months of the worst state we can construct", () => {
    // Zero income, no buffer, maximum stress, ruinous debt, floor CIBIL.
    let s: SimState = {
      ...testState(),
      monthlyIncome: 0,
      cash: 0,
      emergencyFund: 0,
      stress: 100,
      creditScore: 300,
      debts: [
        {
          id: "ruin",
          label: "Everything",
          kind: "credit_card",
          principal: 900000,
          apr: 0.42,
          minPaymentPct: 0.05,
          minPaymentFloor: 5000,
        },
      ],
    };

    for (let m = 1; m <= 12; m++) {
      const result = advanceMonth(s, ZERO_ALLOC, null, null, -0.18);
      s = result.state;

      // No game over, no NaN, no escape from the clamps.
      expect(Number.isFinite(s.cash)).toBe(true);
      expect(s.stress).toBeGreaterThanOrEqual(0);
      expect(s.stress).toBeLessThanOrEqual(100);
      expect(s.creditScore).toBeGreaterThanOrEqual(300);
      expect(s.portfolio.value).toBeGreaterThanOrEqual(0);
      expect(criticalState(s)).toBeTruthy();
    }

    expect(s.month).toBe(13);
    expect(s.history).toHaveLength(12);
  });

  it("recovery reverses the lock and the desaturation exactly", () => {
    const bad = withStress(90, { cash: 0, emergencyFund: 0, month: 4 });
    expect(lockedSlider(bad)).not.toBeNull();
    expect(criticalState(bad).desaturation).toBeGreaterThan(0);

    const recovered: SimState = { ...bad, stress: 20, emergencyFund: bad.monthlyIncome * 5 };
    expect(lockedSlider(recovered)).toBeNull();
    expect(criticalState(recovered).desaturation).toBe(0);
    expect(criticalState(recovered).any).toBe(false);
  });
});

describe("thresholds are declared once", () => {
  it("matches the plan's numbers", () => {
    expect(CRITICAL.runwayMonths).toBe(1);
    expect(CRITICAL.stressLock).toBe(70);
    expect(CRITICAL.stressTimer).toBe(85);
    expect(CRITICAL.debtMultipleOfIncome).toBe(3);
    expect(CRITICAL.creditScore).toBe(600);
    expect(CRITICAL.timedChoiceSeconds).toBe(20);
  });
});
