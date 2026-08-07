import { describe, it, expect } from "vitest";
import {
  INCOME_BANDS,
  LIFE_STAGES,
  TIER_MULTIPLIER,
  moneyFields,
  scaleCopy,
  scalePack,
  scaleRupees,
} from "@/lib/profile";
import { storyFirstEarner } from "@/content/packs";
import { advanceMonth, createInitialState } from "@/lib/sim/engine";
import {
  choiceById,
  eventForMonth,
  isChoiceTakeable,
  marketForRun,
  takeableChoices,
} from "@/lib/sim/deck";
import { availableDiscretionary, netWorth } from "@/lib/sim/metrics";
import type { Allocation, ContentPack, Effect, IncomeTier, SimState } from "@/lib/sim/types";

const TIERS: IncomeTier[] = ["low", "mid", "high"];

function allEffects(pack: ContentPack): Effect[] {
  return pack.events.flatMap((e) =>
    e.choices.flatMap((c) => [...c.immediate, ...c.delayed.flatMap((d) => d.effects)]),
  );
}

/* ═════════════════════════ scaleRupees ═════════════════════════ */

describe("scaleRupees", () => {
  it("leaves the mid tier untouched", () => {
    expect(scaleRupees(42000, 1)).toBe(42000);
    expect(scaleRupees(9999, 1)).toBe(9999);
  });

  it("rounds to the nearest hundred so amounts still read like money", () => {
    expect(scaleRupees(42000, 0.55)).toBe(23100);
    expect(scaleRupees(9999, 0.55)).toBe(5500);
    expect(scaleRupees(42000, 2.2)).toBe(92400);
  });

  it("never rounds a real cost away to nothing", () => {
    // ₹149/month at the low tier is ₹100, not free.
    expect(scaleRupees(149, 0.55)).toBe(100);
    expect(scaleRupees(-149, 0.55)).toBe(-100);
    expect(scaleRupees(0, 0.55)).toBe(0);
  });

  it("preserves sign", () => {
    expect(scaleRupees(-215000, 0.55)).toBeLessThan(0);
    expect(scaleRupees(-215000, 2.2)).toBe(-473000);
  });
});

/* ═══════════════════════════ scaleCopy ═════════════════════════ */

describe("scaleCopy", () => {
  it("rewrites bare rupee figures with Indian grouping", () => {
    expect(scaleCopy("the ₹9,999 model", 0.55)).toBe("the ₹5,500 model");
    expect(scaleCopy("Cash price ₹44,999.", 0.55)).toBe("Cash price ₹24,700.");
  });

  it("rewrites lakh and crore forms", () => {
    expect(scaleCopy("₹5 lakh cover", 0.55)).toBe("₹2.75 lakh cover");
    expect(scaleCopy("₹1 crore", 2.2)).toBe("₹2.2 crore");
  });

  it("leaves anything that is not a rupee figure alone", () => {
    // Percentages, the fraud helpline, and durations must survive intact.
    const text = "42% APR, report on 1930, a 45-day interest-free loan, 8 years";
    expect(scaleCopy(text, 0.55)).toBe(text);
  });

  it("is a no-op at the mid tier", () => {
    const text = "₹2,15,000 against ₹9,000";
    expect(scaleCopy(text, 1)).toBe(text);
  });

  it("keeps derived figures arithmetically true", () => {
    // A gap scales linearly with its components, so the debrief stays honest.
    const m = 0.55;
    const allIn = scaleRupees(19200, m);
    const split = scaleRupees(56520, m);
    const gapInCopy = scaleCopy("The gap is ₹37,320.", m);
    expect(gapInCopy).toBe(`The gap is ₹${(split - allIn).toLocaleString("en-IN")}.`);
  });
});

/* ═══════════════════════════ scalePack ═════════════════════════ */

describe("scalePack", () => {
  it("returns the pack unchanged at the mid tier", () => {
    expect(scalePack(storyFirstEarner, "mid")).toBe(storyFirstEarner);
  });

  it("never mutates the source pack", () => {
    const before = JSON.stringify(storyFirstEarner);
    scalePack(storyFirstEarner, "low");
    scalePack(storyFirstEarner, "high");
    expect(JSON.stringify(storyFirstEarner)).toBe(before);
  });

  it.each(TIERS)("keeps every money field an integer at the %s tier", (tier) => {
    const scaled = scalePack(storyFirstEarner, tier);
    for (const [field, value] of moneyFields(scaled.initialState)) {
      expect(Number.isInteger(value), `${field} = ${value}`).toBe(true);
    }
  });

  it("scales the starting salary the gate asks about", () => {
    expect(scalePack(storyFirstEarner, "low").initialState.monthlyIncome).toBe(23100);
    expect(scalePack(storyFirstEarner, "high").initialState.monthlyIncome).toBe(92400);
  });

  it("scales event effects, not just the starting state", () => {
    const low = scalePack(storyFirstEarner, "low");
    const hospital = low.events
      .find((e) => e.id === "m11-the-deposit")!
      .choices.find((c) => c.id === "personal_loan")!;
    const debtAdd = hospital.immediate.find((e) => e.kind === "debtAdd");

    expect(debtAdd).toBeDefined();
    if (debtAdd?.kind === "debtAdd") {
      expect(debtAdd.debt.principal).toBe(scaleRupees(215000, 0.55));
      // The rate is not money and must not move.
      expect(debtAdd.debt.apr).toBe(0.16);
    }
  });

  it("★ scales condition thresholds too", () => {
    // The subtle bug this prevents: a low-tier player facing a minLiquid
    // written for the mid tier would find the correct choice permanently
    // blocked, and the lesson would never land.
    const low = scalePack(storyFirstEarner, "low");
    const inFull = low.events
      .find((e) => e.id === "m08-minimum-due")!
      .choices.find((c) => c.id === "in_full")!;

    expect(inFull.requires).toEqual({ op: "minLiquid", amount: scaleRupees(46000, 0.55) });
  });

  it("scales money in pressure metadata", () => {
    const low = scalePack(storyFirstEarner, "low");
    const beat = low.events
      .find((e) => e.id === "m11-the-deposit")!
      .pressure.find((b) => b.meta?.amount !== undefined)!;

    expect(beat.meta?.amount).toBe(scaleRupees(215000, 0.55));
    expect(beat.meta?.insuredAmount).toBe(scaleRupees(9000, 0.55));
  });

  it("leaves rates, factors and non-money metadata alone", () => {
    const low = scalePack(storyFirstEarner, "low");

    for (const effect of allEffects(low)) {
      if (effect.kind === "portfolioMultiply") expect(effect.factor).toBeGreaterThan(0);
      if (effect.kind === "incomeMultiply") expect(effect.factor).toBeGreaterThan(0);
    }

    const raise = low.events
      .find((e) => e.id === "m06-the-raise")!
      .choices.find((c) => c.id === "bank_it")!
      .immediate.find((e) => e.kind === "incomeMultiply");
    if (raise?.kind === "incomeMultiply") expect(raise.factor).toBe(1.22);

    // The month-5 chart series are index points, not rupees.
    const chart = low.events
      .find((e) => e.id === "m05-sure-thing")!
      .pressure.find((b) => b.type === "chart")!;
    expect(chart.meta?.series).toEqual([100, 118, 131, 149, 172, 194]);
    const timer = low.events
      .find((e) => e.id === "m10-scam-call")!
      .pressure.find((b) => b.type === "timer")!;
    expect(timer.meta?.seconds).toBe(90);
  });

  it("keeps copy and effects agreeing with each other", () => {
    const low = scalePack(storyFirstEarner, "low");
    const budget = low.events
      .find((e) => e.id === "m03-phone")!
      .choices.find((c) => c.id === "budget_cash")!;
    const cost = budget.immediate.find((e) => e.kind === "cash");

    if (cost?.kind === "cash") {
      // The label quotes a price; the effect charges one. They must match.
      expect(budget.label).toContain(Math.abs(cost.amount).toLocaleString("en-IN"));
    }
  });

  it("keeps the deck structurally valid at every tier", () => {
    for (const tier of TIERS) {
      const scaled = scalePack(storyFirstEarner, tier);
      expect(scaled.events).toHaveLength(12);
      for (const e of scaled.events) {
        expect(e.choices.filter((c) => c.id === e.correctChoiceId)).toHaveLength(1);
        expect(e.choices.filter((c) => !c.requires).length).toBeGreaterThanOrEqual(1);
      }
    }
  });
});

/* ═════════════════ the scaled pack is still playable ═════════════════ */

const SEED = 20260807;

function saveHard(s: SimState): Allocation {
  const avail = availableDiscretionary(s);
  const spend = Math.min(Math.round(avail * 0.16), avail);
  return {
    discretionarySpend: spend,
    toEmergencyFund: avail - spend,
    toInvest: 0,
    extraDebtPayment: 0,
    extraDebtTargetId: null,
  };
}

function playScaled(tier: IncomeTier, choices: Record<number, string> = {}) {
  const pack = scalePack(storyFirstEarner, tier);
  let state = createInitialState(pack, SEED);
  const market = marketForRun(pack, SEED);
  const blocked: string[] = [];

  for (let m = 1; m <= pack.totalMonths; m++) {
    const event = eventForMonth(pack, m, state);
    let choiceId: string | null = null;

    if (event) {
      const wanted = choices[m] ?? event.correctChoiceId;
      const choice = choiceById(event, wanted);
      if (choice && isChoiceTakeable(state, choice)) {
        choiceId = wanted;
      } else {
        choiceId = takeableChoices(state, event)[0]?.id ?? null;
        blocked.push(`m${m}:${wanted}`);
      }
    }

    state = advanceMonth(state, saveHard(state), event, choiceId, market[m - 1]).state;
  }

  return { state, blocked, pack };
}

describe("a scaled pack is still a playable pack", () => {
  it.each(TIERS)("plays twelve months at the %s tier without throwing", (tier) => {
    const { state } = playScaled(tier);
    expect(state.month).toBe(13);
    expect(state.history).toHaveLength(12);
  });

  it.each(TIERS)("keeps every money field an integer through a %s-tier run", (tier) => {
    const { state } = playScaled(tier);
    for (const [field, value] of moneyFields(state)) {
      expect(Number.isInteger(value), `${field} = ${value}`).toBe(true);
    }
    expect(Number.isInteger(netWorth(state))).toBe(true);
  });

  it("★ the correct path stays affordable at every tier", () => {
    // This is the assertion that makes scaling meaningful. If a threshold
    // scaled but the money to meet it did not, the right answer would be
    // permanently blocked for poorer players — the exact opposite of the point.
    for (const tier of TIERS) {
      const { blocked } = playScaled(tier, { 2: "top_up", 7: "open_all" });
      expect(blocked, `${tier} tier blocked on: ${blocked.join(", ")}`).toEqual([]);
    }
  });

  it.each(TIERS)("still rewards good decisions over tempting ones at the %s tier", (tier) => {
    const best = playScaled(tier, { 2: "top_up", 7: "open_all" });
    const worst = playScaled(tier, {
      1: "celebrate",
      2: "skip",
      3: "emi",
      4: "all_seven",
      5: "all_in",
      6: "flat_and_car",
      7: "all_sealed",
      8: "minimum_only",
      9: "sell_all",
      11: "credit_card",
      12: "keep_saving",
    });
    expect(netWorth(best.state)).toBeGreaterThan(netWorth(worst.state));
  });

  it("scales outcomes roughly in proportion, not erratically", () => {
    const low = netWorth(playScaled("low", { 2: "top_up", 7: "open_all" }).state);
    const mid = netWorth(playScaled("mid", { 2: "top_up", 7: "open_all" }).state);
    const high = netWorth(playScaled("high", { 2: "top_up", 7: "open_all" }).state);

    expect(low).toBeLessThan(mid);
    expect(mid).toBeLessThan(high);
    // Rounding to ₹100 and integer minimum payments introduce drift, but the
    // shape must hold — roughly the tier ratio, not an order of magnitude out.
    expect(high / mid).toBeGreaterThan(1.5);
    expect(high / mid).toBeLessThan(3.5);
  });

  it("keeps the month-8 gate working at every tier", () => {
    for (const tier of TIERS) {
      const pack = scalePack(storyFirstEarner, tier);
      const cash = playScaled(tier, { 3: "budget_cash" });
      const emi = playScaled(tier, { 3: "emi" });

      expect(cash.state.history[7].eventId, `${tier} cash path`).toBeNull();
      expect(emi.state.history[7].eventId, `${tier} emi path`).toBe("m08-minimum-due");
      expect(pack.events.find((e) => e.month === 8)?.gate?.requiresFlags).toContain(
        "has_credit_card",
      );
    }
  });
});

/* ═══════════════════════════ the buckets ═══════════════════════════ */

describe("buckets and bands", () => {
  it("ships five life stages with exactly one available", () => {
    expect(LIFE_STAGES).toHaveLength(5);
    expect(LIFE_STAGES.filter((s) => s.available)).toHaveLength(1);
    expect(LIFE_STAGES.find((s) => s.available)?.id).toBe("first_earner");
  });

  it("every unavailable bucket still has a blurb worth reading", () => {
    // They are roadmap, not filler — a judge reads them.
    for (const s of LIFE_STAGES) expect(s.blurb.length).toBeGreaterThan(20);
  });

  it("has a band for every tier multiplier", () => {
    expect(INCOME_BANDS).toHaveLength(3);
    for (const b of INCOME_BANDS) expect(TIER_MULTIPLIER[b.id]).toBeGreaterThan(0);
  });
});
