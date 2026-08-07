/**
 * Effect application and Condition evaluation.
 *
 * These functions mutate the state they are given. That is safe because the
 * engine only ever hands them a freshly cloned draft — `advanceMonth` itself
 * never mutates its argument.
 *
 * Every money-producing line ends in Math.round (CLAUDE.md rule 2).
 */

import type { Condition, Effect, EventGate, SimState } from "./types";
import { clamp } from "./rng";
import { highestAprDebt } from "./metrics";

export function applyEffects(s: SimState, effects: Effect[]): void {
  for (const e of effects) applyEffect(s, e);
}

export function applyEffect(s: SimState, e: Effect): void {
  switch (e.kind) {
    case "cash": {
      s.cash = Math.round(s.cash + e.amount);
      return;
    }

    case "emergencyFund": {
      // A withdrawal deeper than the fund spills into cash, where the
      // overdraft step catches it. Money is never destroyed or invented.
      const next = s.emergencyFund + Math.round(e.amount);
      if (next < 0) {
        s.cash = Math.round(s.cash + next);
        s.emergencyFund = 0;
      } else {
        s.emergencyFund = Math.round(next);
      }
      return;
    }

    case "portfolioAdd": {
      const amount = Math.round(e.amount);
      if (amount >= 0) {
        s.portfolio.value = Math.round(s.portfolio.value + amount);
        s.portfolio.invested = Math.round(s.portfolio.invested + amount);
      } else {
        // Selling: scale the cost basis down in proportion so `invested`
        // keeps meaning "what I put in for what I still hold".
        const before = s.portfolio.value;
        const sold = Math.min(-amount, before);
        const after = before - sold;
        s.portfolio.invested =
          before > 0 ? Math.round(s.portfolio.invested * (after / before)) : 0;
        s.portfolio.value = after;
      }
      return;
    }

    case "portfolioMultiply": {
      // A market shock. The cost basis is untouched — what you paid does not
      // change because the price did.
      s.portfolio.value = Math.max(0, Math.round(s.portfolio.value * e.factor));
      return;
    }

    case "debtAdd": {
      const id = e.debt.id ?? `${e.debt.kind}-m${s.month}-${s.debts.length}`;
      const existing = s.debts.find((d) => d.id === id);
      if (existing) {
        // Charging more to a card you already carry, rather than a second card.
        existing.principal = Math.round(existing.principal + e.debt.principal);
        return;
      }
      s.debts.push({
        ...e.debt,
        id,
        principal: Math.round(e.debt.principal),
        minPaymentFloor: Math.round(e.debt.minPaymentFloor),
        ...(e.debt.limit === undefined ? {} : { limit: Math.round(e.debt.limit) }),
      });
      return;
    }

    case "debtPay": {
      const target = e.debtId
        ? s.debts.find((d) => d.id === e.debtId)
        : highestAprDebt(s.debts);
      // A pending effect can outlive the debt it referenced. No-op, not a
      // crash. (Edge case 12.)
      if (!target) return;
      const applied = Math.min(Math.round(e.amount), target.principal);
      if (applied <= 0) return;
      target.principal = Math.round(target.principal - applied);
      s.cash = Math.round(s.cash - applied);
      return;
    }

    case "incomeMultiply": {
      s.monthlyIncome = Math.max(0, Math.round(s.monthlyIncome * e.factor));
      return;
    }

    case "expenseDelta": {
      s.fixedExpenses = Math.max(0, Math.round(s.fixedExpenses + e.amount));
      return;
    }

    case "stress": {
      s.stress = clamp(s.stress + e.amount, 0, 100);
      return;
    }

    case "creditScore": {
      s.creditScore = clamp(s.creditScore + e.amount, 300, 900);
      return;
    }

    case "flagAdd": {
      if (!s.flags.includes(e.flag)) s.flags.push(e.flag);
      return;
    }

    case "flagRemove": {
      s.flags = s.flags.filter((f) => f !== e.flag);
      return;
    }

    case "insurance": {
      // premiumMonthly 0 cancels the policy. This is exactly how the month-7
      // lapse works: you paid for protection and then did not have it.
      const premium = Math.max(0, Math.round(e.premiumMonthly));
      if (e.policy === "health") s.insuranceHealthPremium = premium;
      else s.insuranceTermPremium = premium;
      return;
    }

    case "subscriptionAdd": {
      if (s.subscriptions.some((x) => x.id === e.sub.id)) return;
      s.subscriptions.push({
        ...e.sub,
        monthlyCost: Math.round(e.sub.monthlyCost),
        startedMonth: s.month,
      });
      return;
    }

    case "xp": {
      s.xp = Math.max(0, Math.round(s.xp + e.amount));
      return;
    }
  }
}

/* ───────────────────────── conditions ────────────────────────── */

export function evaluateCondition(s: SimState, c: Condition): boolean {
  switch (c.op) {
    case "hasFlag":
      return s.flags.includes(c.flag);
    case "lacksFlag":
      return !s.flags.includes(c.flag);
    case "minCash":
      return s.cash >= c.amount;
    case "minLiquid":
      return s.cash + s.emergencyFund >= c.amount;
    case "and":
      return c.all.every((x) => evaluateCondition(s, x));
    case "or":
      return c.any.some((x) => evaluateCondition(s, x));
    case "not":
      return !evaluateCondition(s, c.cond);
  }
}

/**
 * Whether an event may fire this month. An unmet gate is not an error — the
 * month simply runs with no event, and the UI shows a quiet-month card.
 *
 * This is how month 8 disappears when you never took the phone EMI in month 3.
 */
export function evaluateGate(s: SimState, gate?: EventGate): boolean {
  if (!gate) return true;

  if (gate.requiresFlags && !gate.requiresFlags.every((f) => s.flags.includes(f))) {
    return false;
  }
  if (gate.forbidsFlags && gate.forbidsFlags.some((f) => s.flags.includes(f))) {
    return false;
  }
  if (gate.minStress !== undefined && s.stress < gate.minStress) {
    return false;
  }
  if (
    gate.requiresDebtKind &&
    !s.debts.some((d) => d.kind === gate.requiresDebtKind && d.principal > 0)
  ) {
    return false;
  }
  return true;
}
