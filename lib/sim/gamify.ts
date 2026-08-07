/**
 * XP and badges — engine step 12.
 *
 * Predicates only, evaluated against state that already exists. Nothing here
 * awards anything the player did not actually do, and nothing is random.
 */

import type { MonthRecord, SimState } from "./types";
import { runwayMonths, savingsRate } from "./metrics";

export interface BadgeContext {
  /** state after every mutation for the month */
  state: SimState;
  /** the month just played, not yet pushed to history */
  record: MonthRecord;
  /** history INCLUDING `record` */
  history: MonthRecord[];
}

export interface BadgeDef {
  id: string;
  label: string;
  description: string;
  test: (ctx: BadgeContext) => boolean;
}

/** A month bad enough that climbing out of it is a story worth badging. */
function wasCritical(r: MonthRecord): boolean {
  return r.stressEnd >= 70 || r.healthScoreEnd < 25;
}

export const BADGES: BadgeDef[] = [
  {
    id: "first_salary",
    label: "First Salary",
    description: "You made it through your first month.",
    test: ({ record }) => record.month === 1,
  },
  {
    id: "covered",
    label: "Covered",
    description: "Health and term cover, both active.",
    test: ({ state }) => state.insuranceHealthPremium > 0 && state.insuranceTermPremium > 0,
  },
  {
    id: "three_months_deep",
    label: "Three Months Deep",
    description: "Three months of runway in liquid money.",
    test: ({ state }) => runwayMonths(state) >= 3,
  },
  {
    id: "clean_slate",
    label: "Clean Slate",
    description: "Every rupee of debt, cleared.",
    test: ({ state, history }) =>
      state.debts.length === 0 && history.some((r) => r.debtMinimumsPaid > 0),
  },
  {
    id: "six_in_a_row",
    label: "Six in a Row",
    description: "Six consecutive months where you saved something.",
    test: ({ state }) => state.streak >= 6,
  },
  {
    id: "comeback",
    label: "Comeback",
    description: "You were in trouble and you climbed out.",
    test: ({ record, history }) =>
      history.slice(0, -1).some(wasCritical) &&
      record.stressEnd < 50 &&
      record.healthScoreEnd >= 50,
  },
];

/** Badge ids newly earned this month — never ones already held. */
export function evaluateBadges(ctx: BadgeContext): string[] {
  return BADGES.filter(
    (b) => !ctx.state.badges.includes(b.id) && b.test(ctx),
  ).map((b) => b.id);
}

/**
 * Showing up is worth something; being right is worth more; saving hard is
 * worth a little on top.
 */
export function monthXp(record: MonthRecord, wasOptimal: boolean): number {
  return 10 + (wasOptimal ? 15 : 0) + (savingsRate(record) > 0.2 ? 5 : 0);
}

export function badgeById(id: string): BadgeDef | undefined {
  return BADGES.find((b) => b.id === id);
}
