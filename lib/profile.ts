import type {
  Choice,
  Condition,
  ContentPack,
  Effect,
  EventCard,
  IncomeTier,
  LifeStage,
  PressureBeat,
  Rupees,
  SimState,
} from "@/lib/sim/types";

/**
 * Profile scaling.
 *
 * Income tier multiplies every rupee in a pack. We do **not** author separate
 * content per tier — one deck, three scales. Literacy level never touches a
 * number; it only selects `concept.explanations[level]` and sets a tone
 * parameter in the AI prompt.
 *
 * This runs outside `lib/sim/`, so it is free to be a plain transform over
 * content. The engine only ever sees the scaled result.
 */

export const TIER_MULTIPLIER: Record<IncomeTier, number> = {
  low: 0.55,
  mid: 1.0,
  high: 2.2,
};

/* ─────────────────────────── the buckets ─────────────────────────── */

export interface LifeStageOption {
  id: LifeStage;
  label: string;
  blurb: string;
  available: boolean;
}

/**
 * The buckets a player can be in.
 *
 * Only `available` ones are ever rendered — see `AVAILABLE_LIFE_STAGES`. A card
 * for a deck that does not exist is a promise the app cannot keep, so the whole
 * step disappears while there is only one answer and reappears on its own when
 * a second pack lands.
 */
export const LIFE_STAGES: LifeStageOption[] = [
  {
    id: "first_earner",
    label: "First earner",
    blurb: "First job, first salary, nobody has explained any of this yet.",
    available: true,
  },
  {
    id: "student",
    label: "Student",
    blurb: "Pocket money, hostel costs, the first credit card offer.",
    available: false,
  },
  {
    id: "young_pro",
    label: "Young professional",
    blurb: "Three years in, a raise, and the first real decisions.",
    available: false,
  },
  {
    id: "family",
    label: "Supporting a family",
    blurb: "School fees, a home loan, and people depending on you.",
    available: false,
  },
  {
    id: "pre_retirement",
    label: "Approaching retirement",
    blurb: "The last decade of earning, and what has to last.",
    available: false,
  },
];

export interface IncomeBandOption {
  id: IncomeTier;
  label: string;
  blurb: string;
}

/** Plain language. Never "income bracket", never a number the player must know. */
export const INCOME_BANDS: IncomeBandOption[] = [
  { id: "low", label: "Under ₹25,000", blurb: "a month, take-home" },
  { id: "mid", label: "₹25,000 – ₹60,000", blurb: "a month, take-home" },
  { id: "high", label: "Over ₹60,000", blurb: "a month, take-home" },
];

/* ────────────────────────── scaling core ─────────────────────────── */

/**
 * Scale one rupee amount, rounded to the nearest ₹100 so scaled content still
 * reads like money a person would quote.
 *
 * A non-zero amount never rounds away to nothing — ₹149 at the low tier is
 * ₹100, not ₹0. A cost that silently vanishes is worse than one that is
 * slightly off.
 */
export function scaleRupees(amount: Rupees, multiplier: number): Rupees {
  if (multiplier === 1) return amount;
  const rounded = Math.round((amount * multiplier) / 100) * 100;
  if (rounded === 0 && amount !== 0) return amount > 0 ? 100 : -100;
  return rounded;
}

/**
 * Rewrite rupee figures inside authored copy.
 *
 * The alternative was a token syntax through all twelve events, which is a lot
 * of ceremony for the same result. Every `₹…` in the pack refers to an amount
 * that is itself being scaled, including derived ones — a "₹37,320 gap" scales
 * linearly with its components, so the debriefs stay arithmetically true.
 *
 * Handles bare figures ("₹49,999") and lakh/crore forms ("₹5 lakh"). Anything
 * without a ₹ in front of it — percentages, the 1930 helpline, "45-day" — is
 * left alone. See KNOWN_ISSUES 3.1 for the caveat.
 */
export function scaleCopy(text: string, multiplier: number): string {
  if (multiplier === 1) return text;

  return text.replace(
    /₹\s?([\d,]+(?:\.\d+)?)(\s*(?:lakh|crore))?/gi,
    (whole, digits: string, unit: string | undefined) => {
      const base = Number(digits.replace(/,/g, ""));
      if (!Number.isFinite(base)) return whole;

      // "₹5 lakh" — scale the mantissa and keep the unit readable.
      if (unit) {
        const scaled = base * multiplier;
        const trimmed = Number(scaled.toFixed(2));
        return `₹${trimmed}${unit}`;
      }

      return `₹${scaleRupees(base, multiplier).toLocaleString("en-IN")}`;
    },
  );
}

function scaleEffect(effect: Effect, m: number): Effect {
  switch (effect.kind) {
    case "cash":
    case "emergencyFund":
    case "portfolioAdd":
    case "expenseDelta":
      return { ...effect, amount: scaleRupees(effect.amount, m) };

    case "debtPay":
      return { ...effect, amount: scaleRupees(effect.amount, m) };

    case "debtAdd":
      return {
        ...effect,
        debt: {
          ...effect.debt,
          principal: scaleRupees(effect.debt.principal, m),
          minPaymentFloor: scaleRupees(effect.debt.minPaymentFloor, m),
          ...(effect.debt.limit === undefined
            ? {}
            : { limit: scaleRupees(effect.debt.limit, m) }),
        },
      };

    case "insurance":
      return { ...effect, premiumMonthly: scaleRupees(effect.premiumMonthly, m) };

    case "subscriptionAdd":
      return {
        ...effect,
        sub: { ...effect.sub, monthlyCost: scaleRupees(effect.sub.monthlyCost, m) },
      };

    // Rates, factors, stress, CIBIL points, XP and flags are scale-free.
    default:
      return effect;
  }
}

/**
 * Conditions carry rupee thresholds too. Missing these would be the subtle bug:
 * a low-tier player facing a `minLiquid` written for the mid tier would find the
 * correct choice permanently blocked.
 */
function scaleCondition(cond: Condition, m: number): Condition {
  switch (cond.op) {
    case "minCash":
    case "minLiquid":
      return { ...cond, amount: scaleRupees(cond.amount, m) };
    case "and":
      return { op: "and", all: cond.all.map((c) => scaleCondition(c, m)) };
    case "or":
      return { op: "or", any: cond.any.map((c) => scaleCondition(c, m)) };
    case "not":
      return { op: "not", cond: scaleCondition(cond.cond, m) };
    default:
      return cond;
  }
}

/** Money hiding in pressure-beat metadata — the M11 deposit figure lives here. */
const MONEY_META_KEY = /amount|rupees|cost|price|premium|balance|due/i;

function scalePressure(beat: PressureBeat, m: number): PressureBeat {
  const meta = beat.meta
    ? Object.fromEntries(
        Object.entries(beat.meta).map(([k, v]) =>
          MONEY_META_KEY.test(k) && typeof v === "number" ? [k, scaleRupees(v, m)] : [k, v],
        ),
      )
    : undefined;

  return {
    ...beat,
    content: scaleCopy(beat.content, m),
    ...(meta ? { meta } : {}),
  };
}

function scaleChoice(choice: Choice, m: number): Choice {
  return {
    ...choice,
    label: scaleCopy(choice.label, m),
    ...(choice.hint ? { hint: scaleCopy(choice.hint, m) } : {}),
    ...(choice.blockedReason ? { blockedReason: scaleCopy(choice.blockedReason, m) } : {}),
    ...(choice.requires ? { requires: scaleCondition(choice.requires, m) } : {}),
    immediate: choice.immediate.map((e) => scaleEffect(e, m)),
    delayed: choice.delayed.map((d) => ({
      ...d,
      effects: d.effects.map((e) => scaleEffect(e, m)),
      note: scaleCopy(d.note, m),
    })),
    fallbackNote: scaleCopy(choice.fallbackNote, m),
  };
}

function scaleEvent(event: EventCard, m: number): EventCard {
  return {
    ...event,
    body: scaleCopy(event.body, m),
    pressure: event.pressure.map((b) => scalePressure(b, m)),
    choices: event.choices.map((c) => scaleChoice(c, m)),
    debrief: {
      opening: scaleCopy(event.debrief.opening, m),
      proof: scaleCopy(event.debrief.proof, m),
      rule: scaleCopy(event.debrief.rule, m),
    },
  };
}

function scaleInitialState(
  s: ContentPack["initialState"],
  m: number,
): ContentPack["initialState"] {
  return {
    ...s,
    monthlyIncome: scaleRupees(s.monthlyIncome, m),
    fixedExpenses: scaleRupees(s.fixedExpenses, m),
    cash: scaleRupees(s.cash, m),
    emergencyFund: scaleRupees(s.emergencyFund, m),
    portfolio: {
      value: scaleRupees(s.portfolio.value, m),
      invested: scaleRupees(s.portfolio.invested, m),
    },
    debts: s.debts.map((d) => ({
      ...d,
      principal: scaleRupees(d.principal, m),
      minPaymentFloor: scaleRupees(d.minPaymentFloor, m),
      ...(d.limit === undefined ? {} : { limit: scaleRupees(d.limit, m) }),
    })),
    insuranceHealthPremium: scaleRupees(s.insuranceHealthPremium, m),
    insuranceTermPremium: scaleRupees(s.insuranceTermPremium, m),
  };
}

/**
 * The whole pack at one income tier.
 *
 * Pure — the input pack is never mutated, so the module-level pack stays the
 * canonical mid-tier version and can be scaled again for a different profile.
 */
export function scalePack(pack: ContentPack, tier: IncomeTier): ContentPack {
  const m = TIER_MULTIPLIER[tier];
  if (m === 1) return pack;

  return {
    ...pack,
    subtitle: scaleCopy(pack.subtitle, m),
    initialState: scaleInitialState(pack.initialState, m),
    events: pack.events.map((e) => scaleEvent(e, m)),
    ...(pack.goal
      ? { goal: { ...pack.goal, targetRupees: scaleRupees(pack.goal.targetRupees, m) } }
      : {}),
  };
}

/* ─────────────────────────── conveniences ────────────────────────── */

export function tierForIncome(tier: IncomeTier): number {
  return TIER_MULTIPLIER[tier];
}

/** Only the stages with a deck behind them. The onboarding step reads this. */
export const AVAILABLE_LIFE_STAGES: LifeStageOption[] = LIFE_STAGES.filter((s) => s.available);

export function lifeStageLabel(id: LifeStage): string {
  return LIFE_STAGES.find((s) => s.id === id)?.label ?? id;
}

/** Starting take-home at a tier — used by the onboarding preview. */
export function previewIncome(pack: ContentPack, tier: IncomeTier): Rupees {
  return scaleRupees(pack.initialState.monthlyIncome, TIER_MULTIPLIER[tier]);
}

/** Every money field on a state, for the integer-rupee assertion in tests. */
export function moneyFields(s: SimState | ContentPack["initialState"]): [string, number][] {
  return [
    ["monthlyIncome", s.monthlyIncome],
    ["fixedExpenses", s.fixedExpenses],
    ["cash", s.cash],
    ["emergencyFund", s.emergencyFund],
    ["portfolio.value", s.portfolio.value],
    ["portfolio.invested", s.portfolio.invested],
    ["insuranceHealthPremium", s.insuranceHealthPremium],
    ["insuranceTermPremium", s.insuranceTermPremium],
    ...s.debts.flatMap((d): [string, number][] => [
      [`debt(${d.id}).principal`, d.principal],
      [`debt(${d.id}).minPaymentFloor`, d.minPaymentFloor],
    ]),
    ...s.subscriptions.map((x): [string, number] => [`sub(${x.id}).monthlyCost`, x.monthlyCost]),
  ];
}
