import { describe, it, expect } from "vitest";
import { advanceMonth, createInitialState } from "@/lib/sim/engine";
import {
  choiceById,
  choiceAvailability,
  eventForMonth,
  isChoiceTakeable,
  marketForRun,
  quietReason,
  takeableChoices,
} from "@/lib/sim/deck";
import { availableDiscretionary, netWorth } from "@/lib/sim/metrics";
import type { Allocation, MonthRecord, SimState } from "@/lib/sim/types";
import { storyFirstEarner } from "../packs/story-first-earner";

/**
 * The seven interconnections, proved by actually playing the pack through the
 * engine rather than by inspecting the data that describes it.
 *
 * These are the tests that would catch a flag renamed in one place and not the
 * other — the failure mode that silently removes the demo's best moment.
 */

const PACK = storyFirstEarner;
const SEED = 20260807;

/** Everything spare into the buffer, so `minLiquid` requirements can be met. */
function saveHard(s: SimState): Allocation {
  const avail = availableDiscretionary(s);
  const spend = Math.min(2000, avail);
  return {
    discretionarySpend: spend,
    toEmergencyFund: avail - spend,
    toInvest: 0,
    extraDebtPayment: 0,
    extraDebtTargetId: null,
  };
}

interface Play {
  state: SimState;
  records: MonthRecord[];
  states: SimState[];
  /** what the player was actually able to pick each month */
  chosen: (string | null)[];
}

/**
 * Play the story pack, choosing `choices[month]` where given and the correct
 * answer otherwise. A blocked choice falls back to the first takeable one,
 * which is exactly what the UI would force.
 */
function playStory(
  choices: Record<number, string> = {},
  allocate: (s: SimState) => Allocation = saveHard,
): Play {
  let state = createInitialState(PACK, SEED);
  const market = marketForRun(PACK, SEED);
  const records: MonthRecord[] = [];
  const states: SimState[] = [structuredClone(state)];
  const chosen: (string | null)[] = [];

  for (let m = 1; m <= PACK.totalMonths; m++) {
    const event = eventForMonth(PACK, m, state);
    let choiceId: string | null = null;

    if (event) {
      const wanted = choices[m] ?? event.correctChoiceId;
      const choice = choiceById(event, wanted);
      choiceId =
        choice && isChoiceTakeable(state, choice)
          ? wanted
          : (takeableChoices(state, event)[0]?.id ?? null);
    }

    const result = advanceMonth(state, allocate(state), event, choiceId, market[m - 1]);
    state = result.state;
    records.push(result.record);
    states.push(structuredClone(state));
    chosen.push(choiceId);
  }

  return { state, records, states, chosen };
}

/** State as it stood when month `m`'s event was presented. */
const before = (play: Play, m: number) => play.states[m - 1];

/* ═══════════════ 1 & 2 · M2 → M11, and the M7 lapse ═══════════════ */

describe("★ M2 → M11 — the insurance chain", () => {
  it("buying the top-up in month 2 sets health_insured", () => {
    const play = playStory({ 2: "top_up" });
    expect(play.states[2].flags).toContain("health_insured");
    expect(play.states[2].insuranceHealthPremium).toBe(950);
  });

  it("the bundled product does NOT set health cover — it is life cover", () => {
    const play = playStory({ 2: "combo" });
    expect(play.states[2].flags).not.toContain("health_insured");
    expect(play.states[2].insuranceHealthPremium).toBe(0);
    // It is real cover, just not the kind a hospital accepts.
    expect(play.states[2].insuranceTermPremium).toBe(2500);
  });

  it("month 11 opens the cashless door only for the insured", () => {
    const insured = playStory({ 2: "top_up", 7: "open_all" });
    const event = eventForMonth(PACK, 11, before(insured, 11));
    expect(event?.id).toBe("m11-the-deposit");

    const cashless = choiceAvailability(before(insured, 11), event!).find(
      (c) => c.choice.id === "cashless",
    );
    expect(cashless?.available).toBe(true);
    expect(insured.chosen[10]).toBe("cashless");
  });

  it("month 11 blocks it for the uninsured, and says why", () => {
    const uninsured = playStory({ 2: "skip" });
    const event = eventForMonth(PACK, 11, before(uninsured, 11))!;
    const cashless = choiceAvailability(before(uninsured, 11), event).find(
      (c) => c.choice.id === "cashless",
    );

    expect(cashless?.available).toBe(false);
    // Rendered, disabled, reason visible — never hidden. (Edge case 9.)
    expect(cashless?.reason).toMatch(/no active health cover/i);
  });

  it("the uninsured always have a takeable option — no softlock at 2:40 a.m.", () => {
    const uninsured = playStory({ 2: "skip" });
    const event = eventForMonth(PACK, 11, before(uninsured, 11))!;
    expect(takeableChoices(before(uninsured, 11), event).length).toBeGreaterThanOrEqual(4);
  });

  it("★ the gap is the whole demo: ₹9,000 against ₹2,15,000", () => {
    const insured = playStory({ 2: "top_up", 7: "open_all" });
    const uninsured = playStory({ 2: "skip", 7: "open_all", 11: "personal_loan" });

    // The insured player paid ten months of premiums and a co-pay.
    expect(insured.chosen[10]).toBe("cashless");
    expect(uninsured.chosen[10]).toBe("personal_loan");

    const gap = netWorth(insured.state) - netWorth(uninsured.state);
    expect(gap).toBeGreaterThan(150000);

    // Nobody is carrying a hospital debt into month 12 on the insured path.
    expect(insured.state.debts.some((d) => d.id.startsWith("hospital"))).toBe(false);
    expect(uninsured.state.debts.some((d) => d.id === "hospital-loan")).toBe(true);
  });
});

describe("★ M7 → M11 — the lapse", () => {
  it("leaving the envelopes sealed removes health_insured", () => {
    const play = playStory({ 2: "top_up", 7: "all_sealed" });

    // Held it through month 6...
    expect(play.states[6].flags).toContain("health_insured");
    // ...and lost it in month 7.
    expect(play.states[7].flags).not.toContain("health_insured");
    expect(play.states[7].insuranceHealthPremium).toBe(0);
    expect(play.states[7].flags).toContain("policy_lapsed");
  });

  it("opening all three keeps the policy alive", () => {
    const play = playStory({ 2: "top_up", 7: "open_all" });
    expect(play.states[7].flags).toContain("health_insured");
    expect(play.states[7].insuranceHealthPremium).toBe(950);
  });

  it("★ you paid for protection you did not have when it mattered", () => {
    const lapsed = playStory({ 2: "top_up", 7: "all_sealed" });

    // Six months of premiums actually left the account.
    const paid = lapsed.records.slice(1, 7).reduce((sum, r) => sum + r.premiumsPaid, 0);
    expect(paid).toBeGreaterThan(0);

    // And month 11 still turns them away.
    const event = eventForMonth(PACK, 11, before(lapsed, 11))!;
    const cashless = choiceAvailability(before(lapsed, 11), event).find(
      (c) => c.choice.id === "cashless",
    );
    expect(cashless?.available).toBe(false);
    expect(lapsed.chosen[10]).not.toBe("cashless");
  });

  it("the relief is real and immediate — that is the mechanism", () => {
    const sealed = playStory({ 2: "top_up", 7: "all_sealed" });
    const opened = playStory({ 2: "top_up", 7: "open_all" });
    expect(sealed.records[6].stressEnd).toBeLessThan(opened.records[6].stressEnd);
  });

  it("and the ₹5,000 filing penalty lands the month after", () => {
    const sealed = playStory({ 2: "top_up", 7: "all_sealed" });
    expect(sealed.records[7].pendingFired.join(" ")).toMatch(/filing deadline passed/i);
  });
});

/* ═══════════════════ 3 · M3 → M8, the gate ═══════════════════ */

describe("★ M3 → M8 — no card, no statement", () => {
  it("paying cash for the phone means month 8 produces no event at all", () => {
    const play = playStory({ 3: "budget_cash" });

    expect(play.states[3].flags).not.toContain("has_credit_card");
    expect(eventForMonth(PACK, 8, before(play, 8))).toBeNull();
    expect(quietReason(PACK, 8, before(play, 8))).toBe("gate_unmet");

    // The month still runs — it is quiet, not missing. (Edge case 8.)
    expect(play.records[7].month).toBe(8);
    expect(play.records[7].eventId).toBeNull();
    expect(play.records[7].choiceId).toBeNull();
  });

  it("taking the EMI opens the card, and month 8 fires", () => {
    const play = playStory({ 3: "emi" });

    expect(play.states[3].flags).toContain("has_credit_card");
    expect(play.states[3].debts.some((d) => d.id === "card")).toBe(true);

    expect(eventForMonth(PACK, 8, before(play, 8))?.id).toBe("m08-minimum-due");
    expect(play.records[7].eventId).toBe("m08-minimum-due");
  });

  it("the card compounds at 42% between month 3 and month 8", () => {
    const play = playStory({ 3: "emi", 8: "minimum_only" });
    const atM3 = play.states[3].debts.find((d) => d.id === "card")!.principal;
    const atM8 = before(play, 8).debts.find((d) => d.id === "card")!.principal;

    // Minimums are being paid every month, and the balance still barely moves.
    expect(atM3).toBeGreaterThan(49999);
    expect(atM8).toBeGreaterThan(40000);
    expect(atM8).toBeLessThan(atM3);
  });

  it("clearing it in full removes the debt and lifts CIBIL", () => {
    const play = playStory({ 3: "emi", 8: "in_full" });

    // A saver can afford this by month 8. If that stops being true the correct
    // answer becomes unreachable, so assert it rather than tolerating it.
    expect(play.chosen[7]).toBe("in_full");
    expect(play.states[8].debts.some((d) => d.id === "card")).toBe(false);
    expect(play.states[8].creditScore).toBeGreaterThan(before(play, 8).creditScore);
  });
});

/* ═══════════════════ 4 · M5 → M9, concentration ═══════════════════ */

describe("★ M5 → M9 — concentrated versus diversified", () => {
  it("both start from the same ₹60,000 bonus", () => {
    const allIn = playStory({ 5: "all_in" });
    const split = playStory({ 5: "split" });
    expect(allIn.states[5].portfolio.value).toBe(split.states[5].portfolio.value);
  });

  it("the regulation news lands in month 9, four months later", () => {
    const allIn = playStory({ 5: "all_in" });
    expect(allIn.records[8].pendingFired.join(" ")).toMatch(/subsidy was withdrawn/i);
    expect(allIn.records[8].pendingFired.join(" ")).toMatch(/68%/);

    // Nothing fires early.
    for (const m of [5, 6, 7]) {
      expect(allIn.records[m].pendingFired.join(" ")).not.toMatch(/subsidy/i);
    }
  });

  it("★ concentration costs far more than the correction does", () => {
    const allIn = playStory({ 5: "all_in", 9: "hold" });
    const split = playStory({ 5: "split", 9: "hold" });

    const allInDrop = allIn.states[8].portfolio.value - allIn.states[9].portfolio.value;
    const splitDrop = split.states[8].portfolio.value - split.states[9].portfolio.value;

    expect(allInDrop).toBeGreaterThan(splitDrop * 3);
    expect(split.state.portfolio.value).toBeGreaterThan(allIn.state.portfolio.value);
  });

  it("holding through the correction beats selling into it", () => {
    const held = playStory({ 5: "split", 9: "hold" });
    const sold = playStory({ 5: "split", 9: "sell_all" });

    // Selling stops the recovery dead — the position is flat from month 9 on.
    expect(sold.states[12].portfolio.value).toBeLessThan(held.states[12].portfolio.value);
    expect(sold.records[9].pendingFired.join(" ")).toMatch(/you were in cash/i);
  });

  it("and selling really does feel better at the time", () => {
    const held = playStory({ 5: "split", 9: "hold" });
    const sold = playStory({ 5: "split", 9: "sell_all" });
    expect(sold.records[8].stressEnd).toBeLessThan(held.records[8].stressEnd);
  });
});

/* ═══════════════════ 5 · M6 → M11, lifestyle creep ═══════════════════ */

describe("★ M6 → M11 — a higher floor makes every later option worse", () => {
  it("the raise arrives either way", () => {
    const banked = playStory({ 6: "bank_it" });
    const spent = playStory({ 6: "flat_and_car" });
    expect(banked.states[6].monthlyIncome).toBe(spent.states[6].monthlyIncome);
    expect(banked.states[6].monthlyIncome).toBe(Math.round(42000 * 1.22));
  });

  it("but committing it leaves less to allocate every month afterwards", () => {
    const banked = playStory({ 6: "bank_it" });
    const spent = playStory({ 6: "flat_and_car" });

    expect(availableDiscretionary(spent.states[6])).toBeLessThan(
      availableDiscretionary(banked.states[6]),
    );
    expect(spent.states[6].debts.some((d) => d.id === "car-loan")).toBe(true);
  });

  it("★ and a thinner buffer by the time the hospital asks", () => {
    const banked = playStory({ 6: "bank_it", 2: "top_up", 7: "open_all" });
    const spent = playStory({ 6: "flat_and_car", 2: "top_up", 7: "open_all" });

    expect(before(spent, 11).emergencyFund).toBeLessThan(before(banked, 11).emergencyFund);
    expect(netWorth(spent.state)).toBeLessThan(netWorth(banked.state));
  });

  it("the new flat stops feeling new after three months", () => {
    const spent = playStory({ 6: "flat_and_car" });
    expect(spent.records[8].pendingFired.join(" ")).toMatch(/stopped feeling new/i);
  });
});

/* ═══════════════════ 6 · stress → M10, the scam ═══════════════════ */

describe("★ stress → M10 — fraud targets depleted bandwidth", () => {
  it("a calm player never gets the call", () => {
    // Spending relieves stress; a relaxed run stays under the gate.
    const calm = playStory({ 2: "top_up", 7: "open_all" }, (s) => {
      const avail = availableDiscretionary(s);
      return {
        discretionarySpend: avail,
        toEmergencyFund: 0,
        toInvest: 0,
        extraDebtPayment: 0,
        extraDebtTargetId: null,
      };
    });

    expect(before(calm, 10).stress).toBeLessThan(45);
    expect(eventForMonth(PACK, 10, before(calm, 10))).toBeNull();
    expect(quietReason(PACK, 10, before(calm, 10))).toBe("gate_unmet");
  });

  it("★ the player carrying a real loss does", () => {
    // Interconnection 4 feeding interconnection 6: concentration → the month-9
    // crash → depleted bandwidth → the call finds you.
    const allIn = playStory({ 5: "all_in", 9: "hold" });
    const split = playStory({ 5: "split", 9: "hold" });

    expect(before(allIn, 10).stress).toBeGreaterThanOrEqual(20);
    expect(eventForMonth(PACK, 10, before(allIn, 10))?.id).toBe("m10-scam-call");

    expect(before(split, 10).stress).toBeLessThan(20);
    expect(eventForMonth(PACK, 10, before(split, 10))).toBeNull();
  });

  it("the crash is what raises the stress — the same run diversified stays calm", () => {
    const allInHeld = playStory({ 5: "all_in", 9: "hold" });
    const splitHeld = playStory({ 5: "split", 9: "hold" });
    expect(before(allInHeld, 10).stress).toBeGreaterThan(before(splitHeld, 10).stress);
  });

  it("but the panic-seller is not targeted, because the relief was real", () => {
    // Selling relieves 20 points, which drops the seller back under the gate.
    // Counterintuitive and correct: that relief is exactly what makes month 9
    // a trap, and the engine should not pretend otherwise.
    const sold = playStory({ 5: "all_in", 9: "sell_all" });
    expect(before(sold, 10).stress).toBeLessThan(20);
    expect(eventForMonth(PACK, 10, before(sold, 10))).toBeNull();
  });

  it("and a thoroughly careless run is targeted outright", () => {
    const careless = playStory({
      1: "celebrate",
      2: "skip",
      3: "emi",
      4: "all_seven",
      5: "all_in",
      6: "flat_and_car",
      7: "all_sealed",
      8: "minimum_only",
      9: "sell_all",
    });
    expect(before(careless, 10).stress).toBeGreaterThanOrEqual(20);
    expect(eventForMonth(PACK, 10, before(careless, 10))?.id).toBe("m10-scam-call");
  });

  it("hanging up costs nothing at all — the anticlimax is the lesson", () => {
    const s = createInitialState(PACK, SEED);
    const primed: SimState = { ...structuredClone(s), month: 10, stress: 60 };
    const event = eventForMonth(PACK, 10, primed)!;
    expect(event.id).toBe("m10-scam-call");

    const zero: Allocation = {
      discretionarySpend: 0,
      toEmergencyFund: 0,
      toInvest: 0,
      extraDebtPayment: 0,
      extraDebtTargetId: null,
    };
    const hungUp = advanceMonth(primed, zero, event, "hang_up", 0);
    const gaveOtp = advanceMonth(primed, zero, event, "otp", 0);

    expect(netWorth(hungUp.state)).toBeGreaterThan(netWorth(gaveOtp.state));
    expect(netWorth(hungUp.state) - netWorth(gaveOtp.state)).toBe(47000);
  });
});

/* ═══════════════════ 7 · M4 → report, the quiet drain ═══════════════════ */

describe("★ M4 → report — the drain nobody notices", () => {
  it("all seven trials cost ₹2,140 a month, every month after", () => {
    const play = playStory({ 4: "all_seven" });
    const cost = play.states[4].subscriptions.reduce((s, x) => s + x.monthlyCost, 0);
    expect(cost).toBe(2140);
    expect(play.states[4].subscriptions).toHaveLength(7);
  });

  it("two of them cost ₹448", () => {
    const play = playStory({ 4: "two_only" });
    expect(play.states[4].subscriptions.reduce((s, x) => s + x.monthlyCost, 0)).toBe(448);
  });

  it("★ eight months of the difference is a real number", () => {
    const all = playStory({ 4: "all_seven" });
    const two = playStory({ 4: "two_only" });

    const allPaid = all.records.reduce((s, r) => s + r.subscriptionsPaid, 0);
    const twoPaid = two.records.reduce((s, r) => s + r.subscriptionsPaid, 0);

    expect(allPaid - twoPaid).toBe((2140 - 448) * 8); // months 5–12
    expect(availableDiscretionary(all.states[5])).toBeLessThan(
      availableDiscretionary(two.states[5]),
    );
  });
});

/* ═════════════════════════ the run as a whole ════════════════════════ */

describe("the pack plays end to end", () => {
  it("finishes twelve months whatever the player does", () => {
    const optimal = playStory();
    expect(optimal.records).toHaveLength(12);
    expect(optimal.state.month).toBe(13);

    const worst = playStory({
      1: "celebrate",
      2: "skip",
      3: "emi",
      4: "all_seven",
      5: "all_in",
      6: "flat_and_car",
      7: "all_sealed",
      8: "minimum_only",
      9: "sell_all",
      10: "otp",
      11: "credit_card",
      12: "keep_saving",
    });
    expect(worst.records).toHaveLength(12);
    expect(worst.state.month).toBe(13);
  });

  it("rewards the correct answers over the tempting ones", () => {
    const best = playStory();
    const worst = playStory({
      1: "celebrate",
      2: "skip",
      3: "emi",
      4: "all_seven",
      5: "all_in",
      6: "flat_and_car",
      7: "all_sealed",
      8: "minimum_only",
      9: "sell_all",
      10: "otp",
      11: "credit_card",
      12: "keep_saving",
    });

    expect(netWorth(best.state)).toBeGreaterThan(netWorth(worst.state));
    expect(best.state.xp).toBeGreaterThan(worst.state.xp);
  });

  it("is deterministic — the same choices give the same run twice", () => {
    const a = playStory({ 3: "emi", 5: "all_in" });
    const b = playStory({ 3: "emi", 5: "all_in" });
    expect(JSON.stringify(a.state)).toBe(JSON.stringify(b.state));
  });

  it("never leaves a month with no takeable choice", () => {
    const play = playStory();
    for (let m = 1; m <= 12; m++) {
      const event = eventForMonth(PACK, m, before(play, m));
      if (!event) continue;
      expect(takeableChoices(before(play, m), event).length, `month ${m}`).toBeGreaterThanOrEqual(1);
    }
  });

  it("puts the correction on month 9, where the card says it is", () => {
    const market = marketForRun(PACK, SEED);
    expect(market).toHaveLength(12);
    expect(market[8]).toBe(-0.14);
    expect(Math.min(...market)).toBe(market[8]);
    expect(PACK.events.find((e) => e.month === 9)?.concept).toBe("volatility");
  });
});
