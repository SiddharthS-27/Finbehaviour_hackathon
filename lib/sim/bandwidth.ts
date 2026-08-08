/**
 * Near-death states and the bandwidth tax.
 *
 * Pure, and deliberately so. The slider lock is not a UI flourish — it is a
 * game mechanic that changes what the player can do, so it has to live where
 * the engine lives and be derivable from state alone. The shadow agent must
 * face exactly the same restrictions the player does, or the comparison stops
 * being honest.
 *
 * The claim worth making out loud: the literature describes scarcity taxing
 * cognitive bandwidth and calls the lack of a mechanical implementation an
 * open gap. This is the mechanical implementation. It costs fifteen lines.
 *
 * No game over anywhere in this file. Critical states make the interface
 * hostile; the run always finishes. Recovery arcs demo better than fail states.
 */

import type { Choice, SimState } from "./types";
import { highInterestDebt, runwayMonths } from "./metrics";

export type AllocationKey =
  | "discretionarySpend"
  | "toEmergencyFund"
  | "toInvest"
  | "extraDebtPayment";

/** Thresholds, in one place, so the UI and the engine cannot drift apart. */
export const CRITICAL = {
  runwayMonths: 1,
  stressLock: 70,
  stressTimer: 85,
  /**
   * Months of income of **high-interest** debt before it starts shouting.
   *
   * Measured against `highInterestDebt`, not the total. The First Earner opens
   * the game owing ₹1,80,000 on a 9% education loan — 4.3× income — and
   * notifying every eight seconds from month 1 would desensitise the player
   * long before the mechanic matters. A student loan being repaid on schedule
   * is not the psychological pressure this models; a 42% card is.
   */
  debtMultipleOfIncome: 3,
  creditScore: 600,
  /** Seconds a player gets per choice once stress passes the timer threshold. */
  timedChoiceSeconds: 20,
} as const;

export interface CriticalState {
  /** Under a month of cover. Screen desaturates, banner stays up. */
  runwayCritical: boolean;
  /** ★ Bandwidth tax: one allocation slider is taken away. */
  stressLocked: boolean;
  /** Decisions get a clock. */
  stressTimed: boolean;
  /** Debt above three months of income starts notifying. */
  debtCritical: boolean;
  /** Credit-taking choices close off. */
  creditCritical: boolean;
  burntOut: boolean;
  any: boolean;
  /** 0 = untouched, 1 = fully drained of colour. */
  desaturation: number;
}

export function criticalState(s: SimState): CriticalState {
  const runwayCritical = runwayMonths(s) < CRITICAL.runwayMonths;
  const stressLocked = s.stress > CRITICAL.stressLock;
  const stressTimed = s.stress > CRITICAL.stressTimer;
  const debtCritical =
    s.monthlyIncome > 0 &&
    highInterestDebt(s) > s.monthlyIncome * CRITICAL.debtMultipleOfIncome;
  const creditCritical = s.creditScore < CRITICAL.creditScore;
  const burntOut = s.flags.includes("burnt_out");

  return {
    runwayCritical,
    stressLocked,
    stressTimed,
    debtCritical,
    creditCritical,
    burntOut,
    any: runwayCritical || stressLocked || debtCritical || creditCritical || burntOut,

    // The plan asks for roughly 40% desaturation when runway collapses; stress
    // deepens it a little further so a bad month reads worse than a tight one.
    //
    // Month 1 is exempt. The First Earner *opens* the game on ₹12,000 against
    // ₹29,600 of outflow — 0.4 months of runway — so a literal reading would
    // desaturate the very first frame and greet the player with dread before
    // they had made a single decision. Desaturation signals *deterioration*;
    // it cannot also be the baseline or it means nothing.
    //
    // The banner still shows in month 1, because "you have under a month of
    // cover, and filling the buffer is the highest-value thing you can do" is
    // true, actionable, and exactly the right thing to say first.
    desaturation:
      s.month <= 1 ? 0 : runwayCritical ? (stressTimed ? 0.55 : 0.4) : stressLocked ? 0.2 : 0,
  };
}

/**
 * ★ Which slider stress takes away, and why.
 *
 * Deterministic — the same state always locks the same control, because a
 * random one would be a dice roll rather than a tax, and the shadow agent
 * could not face it identically.
 *
 * The rule is that depletion removes **the lever you most need**, which is
 * what scarcity actually does to people. It never locks discretionary
 * spending: forcing someone to save would be a *help*, and would invert the
 * entire lesson.
 */
export function lockedSlider(
  s: SimState,
): { key: AllocationKey; reason: string } | null {
  if (s.stress <= CRITICAL.stressLock) return null;

  if (runwayMonths(s) < CRITICAL.runwayMonths) {
    return {
      key: "toEmergencyFund",
      reason:
        "Stress is over 70. You cannot face the buffer this month — which is exactly the month you needed it.",
    };
  }

  if (highInterestDebt(s) > 0) {
    return {
      key: "extraDebtPayment",
      reason:
        "Stress is over 70. Dealing with the debt is off the table this month. It keeps compounding anyway.",
    };
  }

  return {
    key: "toInvest",
    reason: "Stress is over 70. Anything that needs thinking about the future is not happening.",
  };
}

/**
 * Does this choice mean taking on new credit?
 *
 * Used to close credit options off below a CIBIL of 600 — the consequence made
 * visible before it is needed, rather than at the moment it hurts.
 *
 * Lives here rather than in the UI so the shadow agent is bound by it too.
 */
export function isCreditChoice(choice: Choice): boolean {
  return choice.immediate.some(
    (e) =>
      e.kind === "debtAdd" &&
      (e.debt.kind === "credit_card" ||
        e.debt.kind === "personal_loan" ||
        e.debt.kind === "emi"),
  );
}

/** Null when the choice is takeable; otherwise the reason it is not. */
export function creditBlockReason(s: SimState, choice: Choice): string | null {
  if (s.creditScore >= CRITICAL.creditScore) return null;
  if (!isCreditChoice(choice)) return null;
  return `Declined — your CIBIL is ${Math.round(s.creditScore)}. Lenders stopped saying yes a while ago.`;
}

/** Copy for the persistent banner. Blunt, and never shaming. */
export function criticalBanner(s: SimState): { title: string; body: string } | null {
  const c = criticalState(s);

  if (c.runwayCritical) {
    return {
      title: "Under a month of cover",
      body: "One unexpected bill and this becomes debt. Getting anything into the buffer is the highest-value thing you can do right now.",
    };
  }
  if (c.stressTimed) {
    return {
      title: "You are running on empty",
      body: "Decisions are timed and your take-home has slipped. This is what depletion costs — it is not a character flaw.",
    };
  }
  if (c.stressLocked) {
    return {
      title: "Bandwidth tax in effect",
      body: "Stress is over 70, so one allocation is locked this month. Overloaded people do not make worse choices because they are worse — they make them with less to think with.",
    };
  }
  if (c.creditCritical) {
    return {
      title: "Credit has closed off",
      body: "Below 600, lenders stop offering. The options that need credit are gone until the score recovers.",
    };
  }
  if (c.debtCritical) {
    return {
      title: "Expensive debt is above three months of income",
      body: "It compounds whether or not you look at it. Paying the most expensive one first is the highest guaranteed return available to you.",
    };
  }
  return null;
}
