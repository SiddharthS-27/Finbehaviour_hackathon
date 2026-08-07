/**
 * ★ The heart of the project.
 *
 * `advanceMonth` returns a NEW state and never mutates its arguments. It is
 * pure: no React, no randomness, no clock, no IO. `marketReturn` is injected
 * rather than generated here, which is precisely what lets the shadow agent
 * face a byte-identical market to the player.
 *
 * The step order is pedagogical, not arbitrary. Interest accrues in step 8,
 * *after* payments in step 6, so paying down debt this month actually helps
 * this month. Do not reorder without reading CLAUDE.md first.
 */

import {
  EngineError,
  type Allocation,
  type ContentPack,
  type EventCard,
  type MonthRecord,
  type SimState,
} from "./types";
import { clamp } from "./rng";
import { applyEffects, evaluateCondition } from "./effects";
import { scheduleFromChoice, takeDue } from "./pending";
import { badgeById, evaluateBadges, monthXp } from "./gamify";
import {
  availableDiscretionary,
  creditUtilisation,
  debtsByApr,
  healthScore,
  highestAprDebt,
  minPayment,
  netWorth,
  premiums,
  runwayMonths,
  savingsRate,
  subscriptionsCost,
} from "./metrics";

/** Fresh state for a run. The optimal run recomputes this from the same seed. */
export function createInitialState(pack: ContentPack, seed: number): SimState {
  return {
    ...structuredClone(pack.initialState),
    seed,
    packId: pack.id,
    totalMonths: pack.totalMonths,
    month: 1,
    pending: [],
    history: [],
    incomeBeforeBurnout: null,
  };
}

export function advanceMonth(
  state: SimState,
  allocation: Allocation,
  /** null when the month's gate is unmet — the deck decides, not the engine */
  event: EventCard | null,
  choiceId: string | null,
  /** injected, never generated here */
  marketReturn: number,
): { state: SimState; record: MonthRecord } {
  if (state.month > state.totalMonths) {
    throw new EngineError(
      "RUN_COMPLETE",
      `The run is over (month ${state.month} of ${state.totalMonths}). Route to the report.`,
    );
  }

  /* ── 1. VALIDATE ──────────────────────────────────────────────────
     A throw here means a CALLER bug: the UI let through an allocation it
     should have clamped, or a choice it should have rendered disabled. */

  const raw = [
    allocation.discretionarySpend,
    allocation.toEmergencyFund,
    allocation.toInvest,
    allocation.extraDebtPayment,
  ];
  if (raw.some((v) => !Number.isFinite(v) || v < 0)) {
    throw new EngineError(
      "NEGATIVE_ALLOCATION",
      `Allocation values must be finite and ≥ 0. Got ${JSON.stringify(allocation)}.`,
    );
  }

  // Round once, up front, and use these values everywhere — including in the
  // record — so what the player is told they did is what actually happened.
  const alloc: Allocation = {
    discretionarySpend: Math.round(allocation.discretionarySpend),
    toEmergencyFund: Math.round(allocation.toEmergencyFund),
    toInvest: Math.round(allocation.toInvest),
    extraDebtPayment: Math.round(allocation.extraDebtPayment),
    extraDebtTargetId: allocation.extraDebtTargetId,
  };

  const allocated =
    alloc.discretionarySpend + alloc.toEmergencyFund + alloc.toInvest + alloc.extraDebtPayment;
  const budget = availableDiscretionary(state);
  if (allocated > budget) {
    throw new EngineError(
      "OVER_BUDGET",
      `Allocated ₹${allocated} against a budget of ₹${budget}. The UI should have clamped this.`,
    );
  }

  const choice = resolveChoice(state, event, choiceId);

  /* The draft. Every mutation below lands here, never on `state`. */
  const s: SimState = structuredClone(state);
  const month = s.month;
  const notes: string[] = [];
  const pendingFired: string[] = [];
  const mr = Number.isFinite(marketReturn) ? marketReturn : 0;

  /* ── 2. INCOME ─────────────────────────────────────────────────── */
  const incomeReceived = s.monthlyIncome;
  s.cash = Math.round(s.cash + incomeReceived);

  /* ── 3. FIXED EXPENSES ─────────────────────────────────────────── */
  const fixedPaid = s.fixedExpenses;
  s.cash = Math.round(s.cash - fixedPaid);

  /* ── 4. PREMIUMS ───────────────────────────────────────────────── */
  const premiumsPaid = premiums(s);
  s.cash = Math.round(s.cash - premiumsPaid);

  /* ── 4.5 ★ RESOLVE PENDING — THE CRITICAL STEP ─────────────────── */
  const { due, remaining } = takeDue(s.pending, month);
  s.pending = remaining;
  for (const p of due) {
    applyEffects(s, p.effects);
    pendingFired.push(p.note);
  }

  /* ── 4.6 SUBSCRIPTIONS ─────────────────────────────────────────── */
  const subscriptionsPaid = subscriptionsCost(s);
  s.cash = Math.round(s.cash - subscriptionsPaid);

  /* ── 5. DEBT MINIMUMS — ascending APR, for determinism ─────────── */
  let missedPayment = false;
  let debtMinimumsPaid = 0;

  for (const d of debtsByApr(s.debts)) {
    const dueNow = minPayment(d);
    if (dueNow <= 0) continue;

    if (s.cash >= dueNow) {
      s.cash = Math.round(s.cash - dueNow);
      d.principal = Math.round(d.principal - dueNow);
      debtMinimumsPaid += dueNow;
    } else {
      missedPayment = true;
      s.creditScore = clamp(s.creditScore - 45, 300, 900);
      s.stress = clamp(s.stress + 8, 0, 100);
      // Pay what there is. Never more than is owed, never less than nothing.
      const paid = Math.max(0, Math.min(s.cash, d.principal));
      s.cash = Math.round(s.cash - paid);
      d.principal = Math.round(d.principal - paid);
      debtMinimumsPaid += paid;
    }
  }

  /* ── 6. ALLOCATION ─────────────────────────────────────────────── */
  s.cash = Math.round(s.cash - alloc.discretionarySpend);
  // Spending genuinely does relieve stress. That is why it is tempting.
  s.stress = clamp(s.stress - Math.min(12, Math.floor(alloc.discretionarySpend / 2000)), 0, 100);

  s.cash = Math.round(s.cash - alloc.toEmergencyFund);
  s.emergencyFund = Math.round(s.emergencyFund + alloc.toEmergencyFund);

  s.cash = Math.round(s.cash - alloc.toInvest);
  s.portfolio.value = Math.round(s.portfolio.value + alloc.toInvest);
  s.portfolio.invested = Math.round(s.portfolio.invested + alloc.toInvest);

  if (alloc.extraDebtPayment > 0) {
    s.cash = Math.round(s.cash - alloc.extraDebtPayment);
    const target = alloc.extraDebtTargetId
      ? (s.debts.find((d) => d.id === alloc.extraDebtTargetId && d.principal > 0) ?? null)
      : highestAprDebt(s.debts);
    const applied = Math.min(alloc.extraDebtPayment, target?.principal ?? 0);
    if (target) target.principal = Math.round(target.principal - applied);
    // Refund the remainder. Money is never destroyed. (Edge cases 4 and 5.)
    s.cash = Math.round(s.cash + (alloc.extraDebtPayment - applied));
  }

  /* ── 7. EVENT RESOLUTION ───────────────────────────────────────── */
  let wasOptimalChoice = false;
  if (event && choice) {
    applyEffects(s, choice.immediate);
    s.pending = scheduleFromChoice(s.pending, choice, event.id, month, s.totalMonths);
    wasOptimalChoice = event.correctChoiceId === choice.id;
  }

  /* ── 8. DEBT INTEREST — after payments, so paying down helps now ── */
  for (const d of debtsByApr(s.debts)) {
    if (d.principal > 0) {
      d.principal = Math.round(d.principal + (d.principal * d.apr) / 12);
    }
  }

  const cleared = s.debts.filter((d) => d.principal <= 0);
  if (cleared.length > 0) {
    s.debts = s.debts.filter((d) => d.principal > 0);
    for (const d of cleared) {
      notes.push(`Cleared: ${d.label}`);
      s.creditScore = clamp(s.creditScore + 15, 300, 900);
    }
  }

  /* ── 9. MARKET ─────────────────────────────────────────────────── */
  // portfolioMultiply effects from steps 4.5 and 7 have already landed, so
  // shocks and the month's return compose multiplicatively.
  s.portfolio.value = Math.max(0, Math.round(s.portfolio.value * (1 + mr)));

  /* ── 10. OVERDRAFT — never a game over ─────────────────────────── */
  if (s.cash < 0) {
    s.debts.push({
      id: `overdraft-m${month}`,
      label: "Overdraft",
      kind: "personal_loan",
      apr: 0.36,
      principal: Math.round(-s.cash),
      minPaymentPct: 0.1,
      minPaymentFloor: 1000,
    });
    notes.push("You went overdrawn. That shortfall is a 36% loan now.");
    s.cash = 0;
    s.creditScore = clamp(s.creditScore - 20, 300, 900);
    s.stress = clamp(s.stress + 10, 0, 100);
  }

  /* ── 11. DERIVED ───────────────────────────────────────────────── */
  s.stress = clamp(s.stress - 4, 0, 100); // baseline decay
  if (runwayMonths(s) < 1) s.stress = clamp(s.stress + 6, 0, 100);

  if (!missedPayment) s.creditScore = clamp(s.creditScore + 6, 300, 900);
  if (creditUtilisation(s) > 0.7) s.creditScore = clamp(s.creditScore - 25, 300, 900);
  s.creditScore = clamp(Math.round(s.creditScore), 300, 900);

  if (s.stress >= 85 && !s.flags.includes("burnt_out")) {
    s.flags.push("burnt_out");
    // Remember the exact figure so recovery restores it precisely rather than
    // through a lossy divide. (Edge case 20.)
    s.incomeBeforeBurnout = s.monthlyIncome;
    s.monthlyIncome = Math.round(s.monthlyIncome * 0.9);
    notes.push("You are burnt out. Your take-home has slipped.");
  } else if (s.stress <= 40 && s.flags.includes("burnt_out")) {
    s.flags = s.flags.filter((f) => f !== "burnt_out");
    if (s.incomeBeforeBurnout !== null) s.monthlyIncome = s.incomeBeforeBurnout;
    s.incomeBeforeBurnout = null;
    notes.push("You are through the worst of it. Your take-home is back.");
  }

  /* ── 12–13. RECORD, GAMIFICATION, COMMIT ───────────────────────── */
  const record: MonthRecord = {
    month,
    incomeReceived,
    fixedPaid,
    premiumsPaid,
    subscriptionsPaid,
    debtMinimumsPaid,
    pendingFired,
    allocation: alloc,
    eventId: event?.id ?? null,
    choiceId: choice?.id ?? null,
    wasOptimalChoice,
    marketReturn: mr,
    missedPayment,
    netWorthEnd: netWorth(s),
    healthScoreEnd: 0, // filled immediately below
    stressEnd: s.stress,
    notes,
  };

  // The score for month N needs month N's savings rate, so history has to
  // include this record before the score can be computed.
  const history = [...s.history, record];
  record.healthScoreEnd = healthScore(s, history);

  s.xp = Math.round(s.xp + monthXp(record, wasOptimalChoice));
  s.streak = savingsRate(record) > 0 ? s.streak + 1 : 0;

  const earned = evaluateBadges({ state: s, record, history });
  if (earned.length > 0) {
    s.badges = [...s.badges, ...earned];
    for (const id of earned) notes.push(`Badge: ${badgeById(id)?.label ?? id}`);
  }

  s.history = history;
  s.month = month + 1;

  return { state: s, record };
}

/**
 * Look up the chosen option and confirm it was actually takeable.
 *
 * REQUIREMENTS_UNMET is the one EngineError with a legitimate catch site:
 * `counterfactual.ts` replays alternate choices into timelines where a
 * requirement that held in the real run may not hold.
 */
function resolveChoice(state: SimState, event: EventCard | null, choiceId: string | null) {
  if (!event || !choiceId) return null;

  const choice = event.choices.find((c) => c.id === choiceId);
  if (!choice) {
    throw new EngineError(
      "UNKNOWN_CHOICE",
      `Event "${event.id}" has no choice "${choiceId}".`,
    );
  }
  if (choice.requires && !evaluateCondition(state, choice.requires)) {
    throw new EngineError(
      "REQUIREMENTS_UNMET",
      `Choice "${choiceId}" on event "${event.id}" is not available in this state.`,
    );
  }
  return choice;
}
