/**
 * Derived numbers. Pure functions of state — nothing here mutates.
 *
 * Every ratio guards its denominator: a month with zero income must produce a
 * number, never NaN.
 */

import type { Debt, MonthRecord, Rupees, SimState } from "./types";
import { clamp } from "./rng";

/* ───────────────────────── components ────────────────────────── */

export function premiums(s: SimState): Rupees {
  return s.insuranceHealthPremium + s.insuranceTermPremium;
}

export function subscriptionsCost(s: SimState): Rupees {
  return s.subscriptions.reduce((sum, sub) => sum + sub.monthlyCost, 0);
}

/**
 * What this debt demands this month. Never more than the principal — a debt
 * cannot ask for more than it is owed.
 */
export function minPayment(d: Debt): Rupees {
  if (d.principal <= 0) return 0;
  const pct = Math.round(d.principal * d.minPaymentPct);
  return Math.min(d.principal, Math.max(pct, d.minPaymentFloor));
}

export function totalMinPayments(s: SimState): Rupees {
  return s.debts.reduce((sum, d) => sum + minPayment(d), 0);
}

/**
 * Ascending APR, id as tiebreak. Payment order must be deterministic or the
 * shadow-agent comparison stops being honest.
 */
export function debtsByApr(debts: Debt[]): Debt[] {
  return [...debts].sort((a, b) => a.apr - b.apr || a.id.localeCompare(b.id));
}

/** The avalanche target: highest APR with something still owed. */
export function highestAprDebt(debts: Debt[]): Debt | null {
  const live = debts.filter((d) => d.principal > 0);
  if (live.length === 0) return null;
  return live.reduce((best, d) =>
    d.apr > best.apr || (d.apr === best.apr && d.id < best.id) ? d : best,
  );
}

/* ─────────────────────────── headline ────────────────────────── */

export function netWorth(s: SimState): Rupees {
  const debt = s.debts.reduce((sum, d) => sum + d.principal, 0);
  return s.cash + s.emergencyFund + s.portfolio.value - debt;
}

export function monthlyOutflow(s: SimState): Rupees {
  return s.fixedExpenses + premiums(s) + subscriptionsCost(s) + totalMinPayments(s);
}

/** Months of survival on liquid money alone. 99 stands in for "indefinitely". */
export function runwayMonths(s: SimState): number {
  const out = monthlyOutflow(s);
  if (out <= 0) return 99;
  return (s.cash + s.emergencyFund) / out;
}

/**
 * What the player may allocate this month — income minus everything that is
 * already spoken for. The UI clamps sliders to this; the engine throws if it
 * is exceeded, because being over budget means the UI failed.
 */
export function availableDiscretionary(s: SimState): Rupees {
  return Math.max(
    0,
    s.monthlyIncome - s.fixedExpenses - premiums(s) - subscriptionsCost(s) - totalMinPayments(s),
  );
}

export function savingsRate(rec: MonthRecord): number {
  if (rec.incomeReceived <= 0) return 0;
  const saved =
    rec.allocation.toEmergencyFund + rec.allocation.toInvest + rec.allocation.extraDebtPayment;
  return saved / rec.incomeReceived;
}

/** Anything above 12% APR. This is what the avalanche policy attacks first. */
export function highInterestDebt(s: SimState): Rupees {
  return s.debts.filter((d) => d.apr > 0.12).reduce((sum, d) => sum + d.principal, 0);
}

/** Card balance over card limit. 0 when there are no cards. */
export function creditUtilisation(s: SimState): number {
  const cards = s.debts.filter((d) => d.kind === "credit_card");
  const limit = cards.reduce((sum, d) => sum + (d.limit ?? 0), 0);
  if (limit <= 0) return 0;
  const used = cards.reduce((sum, d) => sum + d.principal, 0);
  return used / limit;
}

/* ──────────────────────── health score ───────────────────────── */

/** Mean savings rate over the last three recorded months. 0 with no history. */
export function trailingSavingsRate(records: MonthRecord[], lookback = 3): number {
  const recent = records.slice(-lookback);
  if (recent.length === 0) return 0;
  return recent.reduce((sum, r) => sum + savingsRate(r), 0) / recent.length;
}

/**
 * Financial health, 0–100 — the headline number, so it is weighted to move
 * meaningfully rather than hover.
 *
 * `records` is passed separately because the score for month N is computed
 * with month N's record already in hand, before it has been pushed to history.
 */
export function healthScore(s: SimState, records: MonthRecord[] = s.history): number {
  const runwayPts = Math.min(25, (runwayMonths(s) / 6) * 25);
  const debtPts =
    25 * (1 - Math.min(1, highInterestDebt(s) / Math.max(1, s.monthlyIncome * 3)));
  const savingsPts = Math.min(20, (trailingSavingsRate(records) / 0.3) * 20);
  const growthPts = Math.min(
    15,
    (s.portfolio.value / Math.max(1, s.monthlyIncome * 6)) * 15,
  );
  const coverPts =
    (s.insuranceHealthPremium > 0 ? 8 : 0) + (s.insuranceTermPremium > 0 ? 7 : 0);

  const total = runwayPts + debtPts + savingsPts + growthPts + coverPts;
  return Math.round(clamp(Number.isFinite(total) ? total : 0, 0, 100));
}

export type HealthBand = "Fragile" | "Shaky" | "Steady" | "Solid" | "Compounding";

export function healthBand(score: number): HealthBand {
  if (score < 25) return "Fragile";
  if (score < 50) return "Shaky";
  if (score < 70) return "Steady";
  if (score < 85) return "Solid";
  return "Compounding";
}
