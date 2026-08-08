/**
 * LifeLedger — domain model.
 *
 * Everything in `lib/sim/` is pure: no React, no Math.random, no Date, no IO.
 * See CLAUDE.md rule 1. This file defines the shapes; `engine.ts` moves them.
 */

/** Integer rupees. Always. Never paise, never a float. See CLAUDE.md rule 2. */
export type Rupees = number;

/* ─────────────────────────── profile ─────────────────────────── */

export type LifeStage =
  | "student"
  | "first_earner"
  | "young_pro"
  | "family"
  | "pre_retirement";

export type IncomeTier = "low" | "mid" | "high";

/** 1 = plainest language, 3 = assumes fluency. Inferred by the diagnostic. */
export type LiteracyLevel = 1 | 2 | 3;

export interface Profile {
  name: string;
  /** selects which content pack */
  lifeStage: LifeStage;
  /** scales every ₹ in the pack */
  incomeTier: IncomeTier;
  /** controls explanation depth — never touches numbers */
  literacyLevel: LiteracyLevel;
  location: string;
  dependents: number;
  supportsParents: boolean;
}

/* ──────────────────────────── debt ───────────────────────────── */

export type DebtKind =
  | "credit_card"
  | "personal_loan"
  | "education_loan"
  | "emi"
  | "family";

export interface Debt {
  id: string;
  label: string;
  kind: DebtKind;
  principal: Rupees;
  /** annual rate as a fraction — 0.42 is 42% APR */
  apr: number;
  minPaymentPct: number;
  minPaymentFloor: Rupees;
  /** credit cards only — needed for the utilisation penalty */
  limit?: Rupees;
}

export interface Portfolio {
  /** current market value */
  value: Rupees;
  /** total ever contributed — the cost basis, for showing gains honestly */
  invested: Rupees;
}

export interface Subscription {
  id: string;
  label: string;
  monthlyCost: Rupees;
  startedMonth: number;
}

/* ───────────────────────── the world ─────────────────────────── */

export interface SimState {
  seed: number;
  packId: string;
  /** 1-indexed. Equals totalMonths + 1 once the run is over. */
  month: number;
  /** 12 story, 6 historical, 4 bites */
  totalMonths: number;
  age: number;

  monthlyIncome: Rupees;
  fixedExpenses: Rupees;

  cash: Rupees;
  emergencyFund: Rupees;
  portfolio: Portfolio;
  debts: Debt[];

  /** 0 means the policy is not active */
  insuranceHealthPremium: Rupees;
  insuranceTermPremium: Rupees;

  /** CIBIL, clamped 300..900 after every mutation */
  creditScore: number;
  /** 0..100. Above 70 the bandwidth tax bites. */
  stress: number;

  flags: string[];
  /** ★ scheduled consequences — the mechanism everything depends on */
  pending: PendingEffect[];
  subscriptions: Subscription[];

  /**
   * Take-home before the burnout penalty was applied, so recovery restores it
   * *exactly* rather than through a lossy divide. Null when not burnt out.
   */
  incomeBeforeBurnout: Rupees | null;

  xp: number;
  badges: string[];
  streak: number;

  history: MonthRecord[];
}

/**
 * ★ THE MECHANISM EVERYTHING DEPENDS ON.
 *
 * A choice in month 3 queues an effect for month 8. Step 4.5 of advanceMonth
 * fires it and removes it. Without this, no event can teach present bias —
 * the wrong choice has to feel good now and cost later.
 */
export interface PendingEffect {
  fireMonth: number;
  effects: Effect[];
  /** so the report can trace a consequence back to the decision */
  sourceEventId: string;
  /** "The phone EMI you took in month 3 is due." */
  note: string;
}

export interface Allocation {
  discretionarySpend: Rupees;
  toEmergencyFund: Rupees;
  toInvest: Rupees;
  extraDebtPayment: Rupees;
  /** null targets the highest-APR debt — the avalanche default */
  extraDebtTargetId: string | null;
}

export interface MonthRecord {
  month: number;
  incomeReceived: Rupees;
  fixedPaid: Rupees;
  premiumsPaid: Rupees;
  subscriptionsPaid: Rupees;
  debtMinimumsPaid: Rupees;
  /** notes from PendingEffects that fired this month */
  pendingFired: string[];
  allocation: Allocation;
  eventId: string | null;
  choiceId: string | null;
  wasOptimalChoice: boolean;
  marketReturn: number;
  missedPayment: boolean;
  netWorthEnd: Rupees;
  healthScoreEnd: number;
  stressEnd: number;
  notes: string[];
}

/* ─────────────────────────── events ──────────────────────────── */

export type ProofType = "ARITHMETIC" | "EVIDENCE" | "RULE";

export type EventCategory =
  | "emergency"
  | "opportunity"
  | "social"
  | "career"
  | "market"
  | "temptation"
  | "digital";

export type PressureType =
  | "headline"
  | "ticker"
  | "chart"
  | "timer"
  | "testimonial"
  | "notification"
  | "dim"
  | "prefill";

export interface PressureBeat {
  type: PressureType;
  content: string;
  /** beats arrive in sequence to build pressure */
  delayMs: number;
  /** timer seconds, chart series, prefill value, etc. */
  meta?: Record<string, unknown>;
}

export interface EventCard {
  id: string;
  /** fixed slot in the pack — decks are authored, not rolled */
  month: number;
  title: string;
  body: string;
  category: EventCategory;
  /** concept id, for mastery tracking */
  concept: string;
  proofType: ProofType;
  /** for bias-profile diagnosis in the report */
  biases: string[];

  /** if unmet, the month runs with no event */
  gate?: EventGate;
  pressure: PressureBeat[];
  choices: Choice[];
  /** exactly one — asserted by the content lint test */
  correctChoiceId: string;

  debrief: {
    /** names the manipulation used on them */
    opening: string;
    /** the arithmetic, the evidence, or the rule */
    proof: string;
    /** the portable takeaway */
    rule: string;
  };
}

export interface EventGate {
  requiresFlags?: string[];
  forbidsFlags?: string[];
  minStress?: number;
  requiresDebtKind?: DebtKind;
}

export interface Choice {
  id: string;
  label: string;
  hint?: string;
  /** ★ the wrong choice is often 'primary'. This is the manipulation, encoded. */
  visualWeight: "primary" | "normal" | "muted";
  requires?: Condition;
  /** shown on the disabled button — *why you can't* is the lesson */
  blockedReason?: string;
  immediate: Effect[];
  delayed: { monthsLater: number; effects: Effect[]; note: string }[];
  /** deterministic coach line when the AI is unavailable. Authored on every choice. */
  fallbackNote: string;
}

/* ─────────────────────────── effects ─────────────────────────── */

export type Effect =
  /** free cash, positive or negative */
  | { kind: "cash"; amount: Rupees }
  /** a shortfall below zero spills into cash, where overdraft catches it */
  | { kind: "emergencyFund"; amount: Rupees }
  /**
   * Adjusts holdings only — it moves no cash. To model a sale, pair it with an
   * explicit `cash` effect. Negative amounts scale the cost basis down
   * proportionally so `invested` stays meaningful.
   */
  | { kind: "portfolioAdd"; amount: Rupees }
  /** market shocks — composes multiplicatively with the month's return */
  | { kind: "portfolioMultiply"; factor: number }
  | { kind: "debtAdd"; debt: Omit<Debt, "id"> & { id?: string } }
  /** null debtId targets the highest APR. A missing id is a no-op, not a crash. */
  | { kind: "debtPay"; debtId: string | null; amount: Rupees }
  | { kind: "incomeMultiply"; factor: number }
  | { kind: "expenseDelta"; amount: Rupees }
  | { kind: "stress"; amount: number }
  | { kind: "creditScore"; amount: number }
  | { kind: "flagAdd"; flag: string }
  | { kind: "flagRemove"; flag: string }
  /** premiumMonthly 0 cancels the policy — this is how the M7 lapse works */
  | { kind: "insurance"; policy: "health" | "term"; premiumMonthly: Rupees }
  | { kind: "subscriptionAdd"; sub: Omit<Subscription, "startedMonth"> }
  | { kind: "xp"; amount: number };

export type Condition =
  | { op: "hasFlag"; flag: string }
  | { op: "lacksFlag"; flag: string }
  | { op: "minCash"; amount: Rupees }
  | { op: "minLiquid"; amount: Rupees }
  | { op: "and"; all: Condition[] }
  | { op: "or"; any: Condition[] }
  | { op: "not"; cond: Condition };

/* ──────────────────────── content pack ───────────────────────── */

export interface ContentPack {
  id: string;
  mode: "story" | "historical" | "bites";
  title: string;
  subtitle: string;
  lifeStages: LifeStage[];
  totalMonths: number;
  initialState: Omit<
    SimState,
    "seed" | "history" | "pending" | "month" | "incomeBeforeBurnout"
  >;
  /** authored per month slot */
  events: EventCard[];
  /** historical mode uses REAL returns and never calls rollMarket */
  marketReturns?: number[];
  /** bites mode */
  goal?: { label: string; targetRupees: Rupees };
  /** historical mode: what actually happened, shown before the report */
  epilogue?: string;
}

export interface Concept {
  id: string;
  name: string;
  oneLiner: string;
  /** ★ three authored depths — literacy level selects, never rewrites */
  explanations: Record<LiteracyLevel, string>;
  prerequisites: string[];
  tier: 1 | 2 | 3;
}

/* ──────────────────────────── errors ─────────────────────────── */

export type EngineErrorCode =
  | "NEGATIVE_ALLOCATION"
  | "OVER_BUDGET"
  | "UNKNOWN_CHOICE"
  | "REQUIREMENTS_UNMET"
  | "RUN_COMPLETE";

/**
 * A thrown EngineError means a *caller* bug — the UI let through an allocation
 * it should have clamped, or a choice it should have disabled. Surface it
 * loudly in dev.
 *
 * One legitimate catch site: `counterfactual.ts` substitutes alternate choices
 * into a replayed timeline, where a `requires` that held in the real run may
 * not hold. It catches REQUIREMENTS_UNMET and reports that what-if as
 * unavailable rather than crashing the report.
 */
export class EngineError extends Error {
  readonly code: EngineErrorCode;
  constructor(code: EngineErrorCode, message: string) {
    super(message);
    this.name = "EngineError";
    this.code = code;
  }
}
