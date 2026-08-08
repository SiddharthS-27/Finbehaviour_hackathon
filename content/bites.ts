import type { Rupees } from "@/lib/sim/types";

/**
 * QUICK BITES — the daily deck.
 *
 * Five cards a day, swiped, before any of this has to be done for real inside
 * the simulation. This is the *pre*-teaching surface: Story Mode punishes you
 * for not knowing what an APR is, and this is where you find out first.
 *
 * ── Why the deck is ordered, not shuffled ─────────────────────────────────
 * Level Zero comes first, always, in the authored order below. Somebody who
 * has never been told what cash flow is should not meet credit utilisation on
 * day one. The store holds a cursor — how many cards this person has consumed
 * — and each day serves the next five, wrapping at the end. Deterministic, no
 * clock inside the selection, and the fundamentals genuinely land first.
 *
 * ── Authoring rules ───────────────────────────────────────────────────────
 *  · `hook` is the whole card front. It has to work as one large sentence with
 *    nothing around it — a scenario, never a definition.
 *  · `term` is the thing being named. One or two words. It is the only text on
 *    the front in an accent colour.
 *  · `mechanics` explains *why*, in the app's voice: blunt, warm, second
 *    person. Analogies are welcome; jargon is not.
 *  · `goldenRule` is one line and must be *doable tomorrow*. Not "understand
 *    risk" — "if anyone promises high returns with no risk, it is a scam".
 *  · `concept` is optional. When present it cross-links to `/explainer`, so it
 *    must be a real id from `content/concepts.ts`. The Level Zero four predate
 *    that library and two of them have no entry — that is fine, and better
 *    than inventing a concept to satisfy a foreign key.
 */

export interface BiteDemo {
  /** The choice put to them before the explanation. Show, don't tell. */
  prompt: string;
  stake: Rupees;
  options: {
    id: string;
    label: string;
    /** What the stake is worth twelve months later. Integer rupees. */
    afterOneYear: Rupees;
    /** One line, shown once the year has been fast-forwarded. */
    verdict: string;
  }[];
  /** Shown under both outcomes, once revealed. */
  closing: string;
}

export interface Bite {
  id: string;
  /** 0 = the absolute fundamentals. 1–3 track concept tiers. */
  level: 0 | 1 | 2 | 3;
  /** The pill: "Level 0: Cash flow". Two words at most. */
  category: string;
  /** The scenario. Large, bold, dead centre, nothing else near it. */
  hook: string;
  /** The named idea, in the accent colour under the hook. */
  term: string;
  /** Why it works. Two or three sentences. */
  mechanics: string;
  /** The actionable takeaway. One line, in its own box. */
  goldenRule: string;
  /** Optional cross-link into the explainer. Must be a real concept id. */
  concept?: string;
  /** ★ Optional interactive year — the assets card uses it. */
  demo?: BiteDemo;
}

/* ════════════════════ Level Zero — the fundamentals ════════════════════ */

const LEVEL_ZERO: Bite[] = [
  {
    id: "b00-bucket",
    level: 0,
    category: "Cash flow",
    concept: "budgeting",
    hook: "You get ₹10,000 for your birthday. By the end of the month it is gone, and you cannot really say where.",
    term: "Cash flow",
    mechanics:
      "Think of your bank account as a bucket of water. Income pours in from the top. Every expense — food, subscriptions, one more delivery — is a hole in the bottom. If the holes empty it faster than the tap fills it, the bucket runs dry no matter how much you earn. Financial stress almost never comes from earning too little. It comes from having too many holes.",
    goldenRule:
      "For one month, write down every single rupee that leaves your account. You cannot fix a leak you cannot see.",
  },
  {
    id: "b00-renting-money",
    level: 0,
    category: "Interest",
    concept: "apr",
    hook: "The ₹20,000 console can be yours for ₹2,000 a month for twelve months. It sounds like a great deal.",
    term: "Interest",
    mechanics:
      "Interest is just the financial word for rent. When you rent a flat you pay a fee to use someone else's space. When you borrow — a loan, a credit card, an installment plan — you are renting someone else's money, and they charge you for it. Twelve months of ₹2,000 is ₹24,000. That extra ₹4,000 is rent you paid for having the console today instead of waiting.",
    goldenRule:
      "Know which side you are on. When you borrow, you pay the rent. When you save or invest, the bank borrows from you and pays the rent to you.",
  },
  {
    id: "b00-assets-liabilities",
    level: 0,
    category: "Assets",
    hook: "Two friends, ₹1 lakh each. One buys a sports bike. One buys shares in the company that makes the bike.",
    term: "Assets vs liabilities",
    mechanics:
      "Wealth is not about how much you make. It is about what you buy with it. A liability takes money out of your pocket — the bike needs petrol, servicing and insurance, and it loses value the second it leaves the showroom. An asset puts money into your pocket — it can grow in value and pay you along the way.",
    goldenRule:
      "Before any big purchase, ask one question: is this going to feed me later, or am I going to have to feed it?",
    demo: {
      prompt: "You have ₹5,000. Pick one, then we skip forward twelve months.",
      stake: 5000,
      options: [
        {
          id: "sneakers",
          label: "Buy the sneakers",
          afterOneYear: 500,
          verdict: "Worn twice, resale value gone. You still own them. They do not own anything for you.",
        },
        {
          id: "bank",
          label: "Put it in the bank",
          afterOneYear: 5300,
          verdict: "It sat there and did nothing, and doing nothing paid you ₹300.",
        },
      ],
      closing:
        "Same ₹5,000, twelve months, a ₹4,800 difference. Nobody made a clever call here — one thing was an asset and one thing was not.",
    },
  },
  {
    id: "b00-risk-return",
    level: 0,
    category: "Risk",
    concept: "volatility",
    hook: "Someone messages you on Instagram: a guaranteed strategy, double your money in 30 days, zero risk.",
    term: "Risk and return",
    mechanics:
      "Risk and reward are tied together with an unbreakable rope. Something completely safe — a fixed deposit — will always pay you little. Something that could pay enormously — a penny stock, a new coin — carries an equally enormous chance of losing the lot. A high return with no risk does not exist. Not because it is rare, but because the arithmetic forbids it.",
    goldenRule:
      "If anyone promises you high returns with no risk, it is a scam. Every time, no exceptions.",
  },
];

/* ═════════════════ Level One and up — the concept library ═══════════════ */

const LATER_LEVELS: Bite[] = [
  {
    id: "b01-emergency-fund",
    level: 1,
    category: "Buffer",
    concept: "emergency_fund",
    hook: "Your bike dies on a Tuesday. Payday is the 30th. It is the 9th.",
    term: "Emergency fund",
    mechanics:
      "Without a buffer, a ₹12,000 repair becomes a card balance at 42% a year, and it is still there in March. The buffer's job is not to earn anything. Its job is to stop one bad week becoming a bad year.",
    goldenRule:
      "Three months of essential costs, in a plain savings account you can reach in a day. Boring on purpose.",
  },
  {
    id: "b01-savings-rate",
    level: 1,
    category: "Saving",
    concept: "savings_rate",
    hook: "Someone on ₹30,000 a month can end up richer than someone on ₹90,000.",
    term: "Savings rate",
    mechanics:
      "The share you keep matters more than the amount you make, and it is the only part of this you fully control. Nobody controls the market. Everybody controls the transfer they set up on payday.",
    goldenRule: "Track one number: what percent of your income you keep. Push it up one point at a time.",
  },
  {
    id: "b01-debt-priority",
    level: 1,
    category: "Debt",
    concept: "debt_priority",
    hook: "You have ₹10,000 spare and four different people to pay.",
    term: "Avalanche",
    mechanics:
      "Clearing a 42% card is a guaranteed 42% return. Nothing you can buy offers that, and no fund manager will ever promise it. Pay the minimum on everything, then throw every spare rupee at the highest rate.",
    goldenRule: "Highest interest rate first. Not the smallest balance, not the loudest lender.",
  },
  {
    id: "b01-recurring-cost",
    level: 1,
    category: "Spending",
    concept: "recurring_cost",
    hook: "₹149. ₹299. ₹199. ₹499. None of them felt like a decision.",
    term: "Recurring cost",
    mechanics:
      "That is ₹1,146 a month and ₹13,752 a year, leaving quietly on four different dates. Subscriptions are priced to sit just under the level at which you would notice them.",
    goldenRule: "Multiply every subscription by 12 before you decide it is cheap.",
  },
  {
    id: "b02-compounding",
    level: 2,
    category: "Growth",
    concept: "compounding",
    hook: "Two people invest the same amount. One starts at 25 and stops at 35. One starts at 35 and never stops.",
    term: "Compounding",
    mechanics:
      "The one who stopped at 35 usually ends up ahead. Ten years of contributions with thirty years to grow beats thirty years of contributions with ten. The money is not doing the work — the time is.",
    goldenRule: "Start with whatever you have now. The amount matters far less than the date.",
  },
  {
    id: "b02-volatility",
    level: 2,
    category: "Markets",
    concept: "volatility",
    hook: "Everything you own is down 18% and your feed is telling you this is 2008 again.",
    term: "Paper loss",
    mechanics:
      "A fall is a price change, not a bill. It becomes a real loss at the moment you sell, and not one second before. The people who did worst in every crash on record are the ones who sold into it and re-entered late.",
    goldenRule: "A crash is not a demand for a decision. Do nothing, deliberately.",
  },
  {
    id: "b02-lifestyle-creep",
    level: 2,
    category: "Spending",
    concept: "lifestyle_creep",
    hook: "The raise landed four months ago and somehow the month still ends at zero.",
    term: "Lifestyle creep",
    mechanics:
      "Every upgrade becomes the new floor. Rent, the car, the plan you moved up to — none of them come back down when things get tight. A raise that arrives before the transfer is raised is a raise you never see.",
    goldenRule: "When income goes up, raise the automatic transfer first. Lifestyle gets what is left.",
  },
  {
    id: "b02-digital-safety",
    level: 2,
    category: "Scams",
    concept: "digital_safety",
    hook: "The bank is on the line about suspicious activity. They need the OTP to stop it.",
    term: "OTP fraud",
    mechanics:
      "No bank, ever, in any situation, asks for an OTP. The urgency is not a side effect of the emergency — the urgency is the attack. It exists to stop you doing the one thing that would end the call.",
    goldenRule: "Hang up. Call the number printed on your own card. Nobody legitimate will mind.",
  },
];

/** The deck, in teaching order. Level Zero first, always. */
export const BITES: Bite[] = [...LEVEL_ZERO, ...LATER_LEVELS];

export const BITES_BY_ID: Record<string, Bite> = Object.fromEntries(
  BITES.map((b) => [b.id, b]),
);

export function biteById(id: string): Bite | undefined {
  return BITES_BY_ID[id];
}
