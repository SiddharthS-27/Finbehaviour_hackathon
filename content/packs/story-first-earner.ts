import type { ContentPack, EventCard } from "@/lib/sim/types";

/**
 * STORY MODE — First Earner, 12 months.
 *
 * You are 23, first job in Chennai, ₹42,000 a month. Twelve months of
 * decisions that compound.
 *
 * ── The seven interconnections ────────────────────────────────────────────
 *  1. M2  → M11  insured ₹9,000; uninsured ₹2,15,000
 *  2. M7  → M11  leave the envelopes sealed and the policy lapses — you paid
 *                for protection and did not have it
 *  3. M3  → M8   no card means the minimum-due event never fires (gate)
 *  4. M5  → M9   concentrated loses 68%; diversified loses 6% and recovers
 *  5. M6  → M11  lifestyle creep raises the fixed floor, cutting runway and
 *                worsening every option in month 11
 *  6. stress → M10  the scam only fires above stress 45 — fraud targets
 *                depleted bandwidth, not stupidity
 *  7. M4  → report  ₹2,140/month of invisible drain, surfaced only at the end
 *
 * ── Authoring conventions (KNOWN_ISSUES 2.3) ──────────────────────────────
 * Money accumulates in `emergencyFund`, not `cash` — the UI forces full
 * allocation, so `cash` stays near its ₹12,000 float all run. Therefore:
 *   · `cash`          — small fees only, under ~₹5,000
 *   · `emergencyFund` — anything funded from savings; a shortfall spills into
 *                       cash where the overdraft step catches it
 *   · emergencyFund → cash → debtPay  — the three-step composition for paying
 *                       down a debt out of savings, in that order
 *   · `debtAdd`       — costs larger than the player could ever hold
 *   · `requires`      — genuinely unaffordable options, with the reason shown
 */

/* ═══════════════════════════ the market ═══════════════════════════ */

/**
 * Authored rather than rolled.
 *
 * `rollMarket` scripts its correction into month 8 *or* 9, but the month-9
 * event **is** the correction and has to land on month 9 every time — a
 * one-month drift would show a crash card over a flat portfolio. See
 * KNOWN_ISSUES 2.6.
 *
 * Months 10–12 are the recovery EVENT 05 describes: +9%, +4%.
 */
export const STORY_MARKET: number[] = [
  0.012, // 1
  -0.008, // 2
  0.021, // 3
  0.009, // 4
  0.015, // 5
  -0.011, // 6
  0.018, // 7
  0.006, // 8
  -0.14, // 9  ★ the correction
  0.09, // 10 recovery
  0.04, // 11
  0.022, // 12
];

/**
 * Selling in month 9 means the recovery happens without you.
 *
 * No effect can move a dynamic portfolio value into cash, so "sold everything"
 * is modelled as what it actually costs: the position stays where the crash
 * left it and each recovery month is cancelled out. Applied in the same month
 * as the market return, `1 / (1 + r)` neutralises it exactly, so the line goes
 * flat from month 9 — which is what being in cash looks like.
 *
 * Derived from STORY_MARKET rather than hardcoded, so editing the market
 * cannot silently desynchronise them. (KNOWN_ISSUES 2.7.)
 */
const cancelAll = (monthIndex: number) => 1 / (1 + STORY_MARKET[monthIndex]);
const cancelHalf = (monthIndex: number) => {
  const r = STORY_MARKET[monthIndex];
  return (1 + r / 2) / (1 + r);
};

/* ═══════════════════════════ the events ═══════════════════════════ */

const M1_FIRST_SALARY: EventCard = {
  id: "m01-first-salary",
  month: 1,
  title: "The first salary",
  body: "₹42,000 has landed. It is the first money you have ever earned, and everybody already knows it arrived.",
  category: "social",
  concept: "budgeting",
  proofType: "ARITHMETIC",
  biases: ["present_bias", "social_obligation", "mental_accounting"],
  pressure: [
    {
      type: "notification",
      content: "Amma: “Has your salary come? Really happy to hear! Told Appa about it.”",
      delayMs: 400,
    },
    {
      type: "ticker",
      content: "The team is planning Saturday. Someone has already booked the table in your name.",
      delayMs: 1600,
    },
    {
      type: "testimonial",
      content: "“First salary calls for a treat, boss.” — everyone, forever",
      delayMs: 2800,
    },
  ],
  choices: [
    {
      id: "celebrate",
      label: "Treat the team, send ₹5,000 home",
      hint: "You have waited a long time for this.",
      visualWeight: "primary",
      immediate: [
        { kind: "cash", amount: -6000 },
        { kind: "stress", amount: -8 },
      ],
      delayed: [],
      fallbackNote:
        "That felt good, and the money is gone. Nothing is wrong with celebrating — the problem is that nothing was set aside first.",
    },
    {
      id: "sip_first",
      label: "Set the SIP to auto-debit on payday, live on the rest",
      hint: "The transfer happens before you can think about it.",
      visualWeight: "normal",
      immediate: [
        { kind: "flagAdd", flag: "pays_self_first" },
        { kind: "stress", amount: 2 },
        { kind: "xp", amount: 15 },
      ],
      delayed: [],
      fallbackNote:
        "You moved the money before you could spend it. That single piece of automation will do more for you than any investment you pick this year.",
    },
    {
      id: "save_later",
      label: "Enjoy this one. Start saving next month.",
      visualWeight: "normal",
      immediate: [
        { kind: "stress", amount: -5 },
        { kind: "flagAdd", flag: "saving_deferred" },
      ],
      delayed: [],
      fallbackNote:
        "Next month has its own reasons. The month you start is almost never the month you planned to start.",
    },
    {
      id: "all_in_savings",
      label: "Save every spare rupee. No spending at all.",
      visualWeight: "muted",
      immediate: [{ kind: "stress", amount: 12 }],
      delayed: [],
      fallbackNote:
        "Admirable, and it will not last. A plan you resent is a plan you abandon in month three.",
    },
  ],
  correctChoiceId: "sip_first",
  debrief: {
    opening:
      "Three different people told you what this money was for before you had decided anything. None of them was wrong to ask — but the order you handle them in is the whole game.",
    proof:
      "Saving ₹8,000 a month from month 1 puts ₹96,000 away this year. Starting in month 7 instead puts away ₹48,000. Same salary, same discipline, half the result — and the only difference was when the transfer was set up.",
    rule: "Pay yourself first, on payday, automatically. Spend what is left, not what remains after you meant to save.",
  },
};

const M2_HEALTH_COVER: EventCard = {
  id: "m02-health-cover",
  month: 2,
  title: "The policy that pays you back",
  body: "Your bank's relationship manager has a proposal, and a printed brochure, and very good coffee. HR has also emailed about a plain health top-up. One of these is insurance.",
  category: "opportunity",
  concept: "insurance",
  proofType: "ARITHMETIC",
  biases: ["authority", "framing", "optimism_bias", "complexity_aversion"],
  pressure: [
    {
      type: "testimonial",
      content:
        "“Sir, 15 years I have been doing this. Why buy insurance that gives you nothing back?”",
      delayMs: 500,
    },
    {
      type: "headline",
      content: "Protection AND returns — ₹10 lakh cover, projected maturity ₹18–22 lakh",
      delayMs: 1800,
    },
    {
      type: "dim",
      content: "The benefit illustration runs to four pages. The charges are on page three.",
      delayMs: 3000,
    },
  ],
  choices: [
    {
      id: "combo",
      label: "The ₹2,500/month plan — cover and a payout at the end",
      hint: "Why pay for something that gives you nothing back?",
      visualWeight: "primary",
      immediate: [
        // Life cover with an investment wrapper. It is not health cover, and
        // month 11 is a hospital.
        { kind: "insurance", policy: "term", premiumMonthly: 2500 },
        { kind: "flagAdd", flag: "bundled_product" },
        { kind: "stress", amount: -3 },
      ],
      delayed: [],
      fallbackNote:
        "You bought a life policy with a savings wrapper. It is not health cover — and you now believe you are covered, which is the expensive part.",
    },
    {
      id: "top_up",
      label: "The plain ₹950/month health top-up — ₹5 lakh cover, nothing back",
      hint: "It pays out only if you are hospitalised.",
      visualWeight: "normal",
      immediate: [
        { kind: "insurance", policy: "health", premiumMonthly: 950 },
        { kind: "flagAdd", flag: "health_insured" },
        { kind: "xp", amount: 15 },
      ],
      delayed: [],
      fallbackNote:
        "₹950 a month for something you hope never to use. It will feel like waste in every month it is not needed — which is nearly all of them.",
    },
    {
      id: "skip",
      label: "Skip it. You're 23 and you've never been to a hospital.",
      visualWeight: "normal",
      immediate: [
        { kind: "stress", amount: -2 },
        { kind: "flagAdd", flag: "declined_cover" },
      ],
      delayed: [],
      fallbackNote:
        "You are 23 and healthy, and that is genuinely the most likely outcome for this year. Insurance is not priced for the likely outcome.",
    },
    {
      id: "ask_hr",
      label: "Check whether the company policy is enough first",
      hint: "Sensible. It also means deciding nothing today.",
      visualWeight: "muted",
      immediate: [{ kind: "flagAdd", flag: "deferred_cover" }],
      delayed: [],
      fallbackNote:
        "The group policy covers ₹1 lakh and ends the day you leave. You went to find out and did not come back to the decision.",
    },
  ],
  correctChoiceId: "top_up",
  debrief: {
    opening:
      "The line that did the work was “why buy insurance that gives you nothing back?” That is framing, and it only sounds clever because you would never ask your health cover for a refund for staying healthy.",
    proof:
      "The ₹2,500 plan bundles life cover with an investment, and roughly 12% of your premium disappears into charges in the early years. The ₹950 top-up buys ₹5 lakh of hospital cover and nothing else. Twelve months of it costs ₹11,400.",
    rule: "Never bundle insurance with investment. Buy protection as protection, buy investment as investment. Bundling exists because it makes the cost of both harder to see.",
  },
};

const M3_PHONE: EventCard = {
  id: "m03-phone",
  month: 3,
  title: "The free upgrade",
  body: "Your phone screen finally gives up. You need a working phone for work. The store has a flagship at ₹49,999 and a very enthusiastic explanation of how it is basically free.",
  category: "temptation",
  concept: "apr",
  proofType: "ARITHMETIC",
  biases: ["framing", "anchoring", "mental_accounting", "present_bias"],
  pressure: [
    {
      type: "prefill",
      content: "₹4,167/month",
      delayMs: 300,
      meta: { subtext: "Total ₹49,999", emphasis: "huge" },
    },
    {
      type: "testimonial",
      content: "“Sir, why block your savings? Zero interest — it's free money.”",
      delayMs: 1500,
    },
    {
      type: "notification",
      content: "Arjun bought this one last week.",
      delayMs: 2600,
    },
    {
      type: "ticker",
      content: "Free tempered glass and case — already unwrapped and on the counter.",
      delayMs: 3600,
    },
  ],
  choices: [
    {
      id: "emi",
      label: "No-cost EMI — ₹4,167 × 12",
      hint: "Zero interest. Keep your savings where they are.",
      visualWeight: "primary",
      immediate: [
        {
          kind: "debtAdd",
          debt: {
            id: "card",
            label: "Credit card",
            kind: "credit_card",
            principal: 49999,
            apr: 0.42,
            minPaymentPct: 0.05,
            minPaymentFloor: 1500,
            limit: 150000,
          },
        },
        { kind: "flagAdd", flag: "has_credit_card" },
        { kind: "flagAdd", flag: "has_card_debt" },
        { kind: "stress", amount: -5 },
      ],
      delayed: [
        {
          monthsLater: 2,
          effects: [{ kind: "stress", amount: 8 }],
          note: "The card minimum is taking a bite out of every salary now.",
        },
      ],
      fallbackNote:
        "The phone is yours and you have paid nothing yet. You also now have a credit card with ₹49,999 on it, and twelve months of a fixed claim on your salary.",
    },
    {
      id: "flagship_cash",
      label: "Pay ₹44,999 in cash",
      visualWeight: "normal",
      requires: { op: "minLiquid", amount: 44999 },
      blockedReason:
        "You do not have ₹44,999. Worth noticing before you sign anything that assumes you do.",
      immediate: [{ kind: "emergencyFund", amount: -44999 }],
      delayed: [],
      fallbackNote:
        "No interest, and most of your buffer is now a phone. The next thing that goes wrong finds you with nothing behind you.",
    },
    {
      id: "budget_cash",
      label: "Buy the ₹9,999 model in cash",
      hint: "It makes calls. It does UPI. It has a camera.",
      visualWeight: "muted",
      immediate: [{ kind: "cash", amount: -9999 }],
      delayed: [],
      fallbackNote:
        "Boring, and correct. It does everything you actually needed a phone to do, and it is paid for.",
    },
    {
      id: "keep_cracked",
      label: "Keep using the cracked one",
      visualWeight: "muted",
      immediate: [
        { kind: "incomeMultiply", factor: 0.95 },
        { kind: "stress", amount: 6 },
      ],
      delayed: [],
      fallbackNote:
        "You missed two client calls this month. Refusing to spend is not the same as spending well.",
    },
  ],
  correctChoiceId: "budget_cash",
  debrief: {
    opening:
      "The ₹4,167 was set in enormous type and the ₹49,999 was set in grey. You were shown the number that felt small and asked to decide on it.",
    proof:
      "Cash price ₹44,999. EMI total ₹49,999. You paid ₹5,000 for the privilege of paying later — an effective rate near 20% a year, with the interest moved into the sticker instead of itemised. And a balance sitting on a credit card carries at 42% from the day it is not cleared.",
    rule: "Before any EMI, ask for the cash price. If the cash price is lower than the total of the instalments, the difference is interest. Work out what it costs and then decide.",
  },
};

const M4_FREE_TRIALS: EventCard = {
  id: "m04-free-trials",
  month: 4,
  title: "Seven free trials",
  body: "A fitness app, two streaming services, a music upgrade, a productivity tool, a news subscription, cloud storage. All free for 30 days. All want a card on file.",
  category: "digital",
  concept: "recurring_cost",
  proofType: "ARITHMETIC",
  biases: ["present_bias", "status_quo", "mental_accounting"],
  pressure: [
    { type: "notification", content: "Start your free trial — one tap", delayMs: 300 },
    { type: "notification", content: "30 days free. Cancel anytime.", delayMs: 1100 },
    {
      type: "ticker",
      content: "₹149 · ₹199 · ₹299 · ₹349 · ₹499 · ₹499 · ₹146 — each one is nothing",
      delayMs: 2200,
    },
    {
      type: "prefill",
      content: "Card ending 4417 — saved",
      delayMs: 3200,
      meta: { subtext: "Cancelling takes four screens and a retention offer." },
    },
  ],
  choices: [
    {
      id: "all_seven",
      label: "Take all seven — they're free",
      visualWeight: "primary",
      immediate: [
        { kind: "subscriptionAdd", sub: { id: "sub-fitness", label: "Fitness app", monthlyCost: 499 } },
        { kind: "subscriptionAdd", sub: { id: "sub-stream-a", label: "Streaming", monthlyCost: 299 } },
        { kind: "subscriptionAdd", sub: { id: "sub-stream-b", label: "Streaming (the other one)", monthlyCost: 499 } },
        { kind: "subscriptionAdd", sub: { id: "sub-music", label: "Music premium", monthlyCost: 149 } },
        { kind: "subscriptionAdd", sub: { id: "sub-productivity", label: "Productivity suite", monthlyCost: 349 } },
        { kind: "subscriptionAdd", sub: { id: "sub-news", label: "News", monthlyCost: 199 } },
        { kind: "subscriptionAdd", sub: { id: "sub-cloud", label: "Cloud storage", monthlyCost: 146 } },
        { kind: "stress", amount: -4 },
      ],
      delayed: [],
      fallbackNote:
        "Seven decisions of about ₹300 each, and every one of them felt like nothing. They are now a standing order against your salary.",
    },
    {
      id: "cancel_later",
      label: "Take them all, cancel the ones you don't use",
      hint: "You'll set a reminder.",
      visualWeight: "normal",
      immediate: [
        { kind: "subscriptionAdd", sub: { id: "sub-fitness", label: "Fitness app", monthlyCost: 499 } },
        { kind: "subscriptionAdd", sub: { id: "sub-stream-a", label: "Streaming", monthlyCost: 299 } },
        { kind: "subscriptionAdd", sub: { id: "sub-stream-b", label: "Streaming (the other one)", monthlyCost: 499 } },
        { kind: "subscriptionAdd", sub: { id: "sub-music", label: "Music premium", monthlyCost: 149 } },
        { kind: "subscriptionAdd", sub: { id: "sub-productivity", label: "Productivity suite", monthlyCost: 349 } },
        { kind: "subscriptionAdd", sub: { id: "sub-news", label: "News", monthlyCost: 199 } },
      ],
      delayed: [],
      fallbackNote:
        "You cancelled one of the six. Signing up took a tap; cancelling took four screens and a 50%-off offer, and they built it that way on purpose.",
    },
    {
      id: "two_only",
      label: "Take the two you'll use this week, calendar both trial ends",
      visualWeight: "normal",
      immediate: [
        { kind: "subscriptionAdd", sub: { id: "sub-stream-a", label: "Streaming", monthlyCost: 299 } },
        { kind: "subscriptionAdd", sub: { id: "sub-music", label: "Music premium", monthlyCost: 149 } },
        { kind: "xp", amount: 15 },
      ],
      delayed: [],
      fallbackNote:
        "₹448 a month for two things you actually open. The calendar reminder is the whole trick.",
    },
    {
      id: "none",
      label: "Skip all of them",
      visualWeight: "muted",
      immediate: [{ kind: "stress", amount: 2 }],
      delayed: [],
      fallbackNote:
        "Safe, and slightly too safe — one of those tools would have paid for itself. Refusing every recurring cost is a blunter rule than you need.",
    },
  ],
  correctChoiceId: "two_only",
  debrief: {
    opening:
      "Each one was evaluated on its own and never evaluated again. That is mental accounting meeting status quo bias, and the friction was designed around it: one tap in, four screens out.",
    proof:
      "All seven come to ₹2,140 a month. That is ₹25,680 a year — more than half a month of your salary — for services you would have opened twice. The two you kept cost ₹5,376 a year.",
    rule: "Multiply any recurring charge by twelve before you agree to it. “₹499 a month” is “₹5,988 a year”. Decide on the annual number.",
  },
};

const M5_SURE_THING: EventCard = {
  id: "m05-sure-thing",
  month: 5,
  title: "The sure thing",
  body: "Your annual bonus lands: ₹60,000. It is the first real money you have ever had to invest, and everyone has an opinion about Suryavanshi Renewables.",
  category: "opportunity",
  concept: "diversification",
  proofType: "EVIDENCE",
  biases: ["overconfidence", "herd_behaviour", "recency", "fomo"],
  pressure: [
    {
      type: "chart",
      content: "Suryavanshi Renewables — 6 months",
      delayMs: 300,
      meta: { series: [100, 118, 131, 149, 172, 194], change: "+94%", window: "6 months" },
    },
    {
      type: "headline",
      content: "Green Energy Stocks Mint New Millionaires — Retail Investors Cash In",
      delayMs: 1600,
    },
    {
      type: "ticker",
      content: "Ravi from accounts put ₹2L in. Bought a bike last month.",
      delayMs: 2700,
    },
    {
      type: "testimonial",
      content:
        "“I'll say it plainly — this is the easiest money in the market right now.” — 1.2M subscribers ✓",
      delayMs: 3800,
    },
    {
      type: "timer",
      content: "Market closes in",
      delayMs: 4800,
      meta: { seconds: 45 },
    },
  ],
  choices: [
    {
      id: "all_in",
      label: "All ₹60,000 into Suryavanshi",
      hint: "The chart has not been wrong in six months.",
      visualWeight: "primary",
      immediate: [
        { kind: "portfolioAdd", amount: 60000 },
        { kind: "flagAdd", flag: "concentrated" },
        { kind: "stress", amount: -6 },
        { kind: "xp", amount: 5 },
      ],
      // Four months out — month 9, the same month the wider market corrects.
      // The stress is not decoration: it is what opens the month-10 gate.
      // Overconfidence → concentration → crash → depleted bandwidth → the
      // scam call finds you. That is interconnection 4 feeding interconnection 6.
      delayed: [
        {
          monthsLater: 4,
          effects: [
            { kind: "portfolioAdd", amount: -40800 },
            { kind: "stress", amount: 16 },
          ],
          note: "Suryavanshi Renewables: the sector subsidy was withdrawn. The stock is down 68%.",
        },
      ],
      fallbackNote:
        "Up 19% in the first month. It will keep feeling correct for a while — that is exactly how this works.",
    },
    {
      id: "gold",
      label: "All ₹60,000 into gold",
      hint: "Safe.",
      visualWeight: "normal",
      immediate: [
        { kind: "portfolioAdd", amount: 60000 },
        { kind: "flagAdd", flag: "gold_only" },
        { kind: "stress", amount: -2 },
      ],
      delayed: [
        {
          monthsLater: 4,
          effects: [{ kind: "portfolioAdd", amount: 3600 }],
          note: "Gold is up 6% since you bought it.",
        },
      ],
      fallbackNote:
        "Up 6%. Safe, and roughly flat once you take inflation out. You have forty working years and you spent this money on avoiding a bad month.",
    },
    {
      id: "fd",
      label: "All ₹60,000 into a fixed deposit",
      visualWeight: "normal",
      immediate: [
        { kind: "emergencyFund", amount: 60000 },
        { kind: "flagAdd", flag: "fd_only" },
      ],
      delayed: [
        {
          monthsLater: 4,
          effects: [{ kind: "emergencyFund", amount: 2100 }],
          note: "The fixed deposit paid out its interest.",
        },
      ],
      fallbackNote:
        "About 7% a year, which beats inflation by roughly one point. Nothing has gone wrong here — it is just a forty-year horizon spent on a one-year product.",
    },
    {
      id: "split",
      label: "Split it — 60% index fund, 20% gold, 20% Suryavanshi",
      hint: "No single one of these can ruin you.",
      visualWeight: "muted",
      immediate: [
        { kind: "portfolioAdd", amount: 60000 },
        { kind: "flagAdd", flag: "diversified" },
        { kind: "xp", amount: 20 },
      ],
      delayed: [
        {
          monthsLater: 4,
          effects: [{ kind: "portfolioAdd", amount: -3480 }],
          note: "Suryavanshi fell 68%, but it was only a fifth of the bonus. The index and gold absorbed most of it.",
        },
      ],
      fallbackNote:
        "No confetti, no story to tell Ravi. You bought the thing that cannot be destroyed by one piece of news.",
    },
  ],
  correctChoiceId: "split",
  debrief: {
    opening:
      "A chart, a headline, a colleague and a countdown all pointed the same way, and you read that as confirmation. Every one of them was a pressure, not a reason — and the chart showed six months because six months was the flattering window.",
    proof:
      "All ₹60,000 in one stock came out at ₹19,200. The split came out at ₹56,520 — the index rose 11% on ₹36,000, gold rose 6% on ₹12,000, and Suryavanshi fell 68% on the ₹12,000 that was in it. The gap is ₹37,320, and none of it was a stock-picking failure. It was a structure failure.",
    rule: "Diversification is the only free lunch in finance: it lowers risk without lowering expected return. You cannot know which one wins. You can guarantee that no single one can ruin you.",
  },
};

const M6_THE_RAISE: EventCard = {
  id: "m06-the-raise",
  month: 6,
  title: "The raise",
  body: "Appraisal day. Twenty-two percent. Your take-home goes from ₹42,000 to ₹51,240 — an extra ₹9,240 every month, starting now.",
  category: "career",
  concept: "lifestyle_creep",
  proofType: "ARITHMETIC",
  biases: ["hedonic_adaptation", "mental_accounting", "social_comparison"],
  pressure: [
    { type: "headline", content: "YOU EARNED THIS", delayMs: 300 },
    {
      type: "notification",
      content: "3 flats near the office, ₹28,000/month — saved to your list",
      delayMs: 1500,
    },
    {
      type: "notification",
      content: "Pre-approved: car loan, ₹9,000/month. No documentation needed.",
      delayMs: 2400,
    },
    {
      type: "testimonial",
      content: "“Bro, you got 22% and you're still in that place?”",
      delayMs: 3400,
    },
  ],
  choices: [
    {
      id: "flat_and_car",
      label: "Better flat and the car — you've earned it",
      visualWeight: "primary",
      immediate: [
        { kind: "incomeMultiply", factor: 1.22 },
        { kind: "expenseDelta", amount: 10000 },
        {
          // A small hatchback after a down payment, not a ₹9.8L showroom car.
          // Net worth here counts debts but not durable assets, so a larger
          // loan would drop the line by its full value in one month and read
          // as a bug rather than a lesson. See KNOWN_ISSUES 2.8.
          kind: "debtAdd",
          debt: {
            id: "car-loan",
            label: "Car loan",
            kind: "emi",
            principal: 300000,
            apr: 0.1,
            minPaymentPct: 0.02,
            minPaymentFloor: 9000,
          },
        },
        { kind: "flagAdd", flag: "lifestyle_creep" },
        { kind: "stress", amount: -10 },
      ],
      delayed: [
        {
          monthsLater: 3,
          effects: [{ kind: "stress", amount: 14 }],
          note: "The new flat stopped feeling new. The rent did not stop.",
        },
      ],
      fallbackNote:
        "You gained ₹9,240 a month and committed ₹19,000 of it. In cash-flow terms you are now poorer than you were before the raise.",
    },
    {
      id: "flat_only",
      label: "Just the better flat",
      visualWeight: "normal",
      immediate: [
        { kind: "incomeMultiply", factor: 1.22 },
        { kind: "expenseDelta", amount: 10000 },
        { kind: "flagAdd", flag: "lifestyle_creep" },
        { kind: "stress", amount: -6 },
      ],
      delayed: [
        {
          monthsLater: 3,
          effects: [{ kind: "stress", amount: 8 }],
          note: "The flat is just where you live now.",
        },
      ],
      fallbackNote:
        "₹10,000 a month, permanently, out of a ₹9,240 raise. Most of the increase is spoken for and the floor under your costs is now higher.",
    },
    {
      id: "bank_it",
      label: "Bank the whole raise. Nothing else changes.",
      hint: "You have not adjusted to this money yet.",
      visualWeight: "muted",
      immediate: [
        { kind: "incomeMultiply", factor: 1.22 },
        { kind: "flagAdd", flag: "banked_raise" },
        { kind: "stress", amount: 2 },
        { kind: "xp", amount: 20 },
      ],
      delayed: [],
      fallbackNote:
        "Your savings rate just jumped without you feeling poorer, because you never lived on the extra money in the first place.",
    },
    {
      id: "half_half",
      label: "Half saved, half to lifestyle",
      visualWeight: "normal",
      immediate: [
        { kind: "incomeMultiply", factor: 1.22 },
        { kind: "expenseDelta", amount: 5000 },
        { kind: "stress", amount: -3 },
      ],
      delayed: [],
      fallbackNote:
        "Defensible in real life, and better than most people manage. It is only second best here because the raise was large enough that you would not have noticed banking all of it.",
    },
  ],
  correctChoiceId: "bank_it",
  debrief: {
    opening:
      "The offers arrived within a minute of the number, and they were sized to it. That is not a coincidence — the moment your income is confirmed is the moment you are easiest to sell a commitment to.",
    proof:
      "A raise of ₹9,240 against ₹19,000 of new fixed cost leaves you ₹9,760 a month worse off, every month, with a floor that is very hard to lower again. The satisfaction from a better flat fades in about eleven weeks. The rent does not fade at all.",
    rule: "When income rises, raise savings first and let lifestyle rise from what is left. A raise is the easiest moment in your life to increase your savings rate, precisely because you have not adjusted to the money yet.",
  },
};

const M7_ENVELOPES: EventCard = {
  id: "m07-envelopes",
  month: 7,
  title: "Not now",
  body: "Three things need you this month: an unopened credit card statement, a health insurance renewal notice, and an income tax deadline in nine days. All three are still sealed.",
  category: "emergency",
  concept: "avoidance",
  proofType: "ARITHMETIC",
  biases: ["avoidance", "ostrich_effect", "anxiety"],
  pressure: [
    { type: "notification", content: "You have 3 pending items", delayMs: 400 },
    { type: "dim", content: "Opening any of them is a deliberate tap.", delayMs: 1200 },
    { type: "notification", content: "You have 3 pending items", delayMs: 2600 },
    {
      type: "ticker",
      content: "“Deal with this later” is right there, and it always works.",
      delayMs: 3400,
    },
  ],
  choices: [
    {
      id: "all_sealed",
      label: "Leave all three sealed",
      hint: "Not this week. It has been a lot.",
      visualWeight: "primary",
      immediate: [
        { kind: "stress", amount: -8 },
        { kind: "cash", amount: -600 },
        // ★ M7 → M11. The renewal was in one of those envelopes.
        { kind: "insurance", policy: "health", premiumMonthly: 0 },
        { kind: "flagRemove", flag: "health_insured" },
        { kind: "flagAdd", flag: "policy_lapsed" },
        { kind: "flagAdd", flag: "ostrich" },
        { kind: "creditScore", amount: -20 },
      ],
      delayed: [
        {
          monthsLater: 1,
          effects: [{ kind: "cash", amount: -5000 }],
          note: "The income tax filing deadline passed. Late fee: ₹5,000.",
        },
      ],
      fallbackNote:
        "Your stress genuinely dropped eight points. The relief is real — and one of those envelopes was your insurance renewal.",
    },
    {
      id: "open_one",
      label: "Open the card statement, deal with the rest later",
      visualWeight: "normal",
      immediate: [
        { kind: "stress", amount: -4 },
        { kind: "insurance", policy: "health", premiumMonthly: 0 },
        { kind: "flagRemove", flag: "health_insured" },
        { kind: "flagAdd", flag: "policy_lapsed" },
        { kind: "flagAdd", flag: "ostrich" },
      ],
      delayed: [
        {
          monthsLater: 1,
          effects: [{ kind: "cash", amount: -5000 }],
          note: "The income tax filing deadline passed. Late fee: ₹5,000.",
        },
      ],
      fallbackNote:
        "One down, two deferred — and the two you deferred were the ones with deadlines attached.",
    },
    {
      id: "open_all",
      label: "Open all three. Handle them tonight.",
      hint: "It will be unpleasant for about an hour.",
      visualWeight: "muted",
      immediate: [
        { kind: "stress", amount: 15 },
        { kind: "xp", amount: 20 },
      ],
      delayed: [
        {
          monthsLater: 1,
          effects: [{ kind: "stress", amount: -25 }],
          note: "Nothing is pending. You had forgotten what that feels like.",
        },
      ],
      fallbackNote:
        "That was genuinely horrible and it cost you nothing. Your renewal is paid and your filing is done.",
    },
    {
      id: "looked_away",
      label: "Open them, read the first line, put them down",
      visualWeight: "normal",
      immediate: [
        { kind: "stress", amount: -6 },
        { kind: "cash", amount: -600 },
        { kind: "insurance", policy: "health", premiumMonthly: 0 },
        { kind: "flagRemove", flag: "health_insured" },
        { kind: "flagAdd", flag: "policy_lapsed" },
        { kind: "flagAdd", flag: "ostrich" },
        { kind: "flagAdd", flag: "looked_and_deferred" },
      ],
      delayed: [
        {
          monthsLater: 1,
          effects: [{ kind: "cash", amount: -5000 }],
          note: "The income tax filing deadline passed. Late fee: ₹5,000.",
        },
      ],
      fallbackNote:
        "You looked, which is harder than not looking, and then deferred anyway. The game noticed. So did the deadlines.",
    },
  ],
  correctChoiceId: "open_all",
  debrief: {
    opening:
      "Leaving them sealed made you feel better immediately and measurably — your stress dropped eight points the moment you decided not to look. That relief is the mechanism, not a side effect.",
    proof:
      "The sealed envelopes cost ₹600 in late fees, ₹5,000 in a filing penalty, and a lapsed health policy you had been paying for. The renewal notice was the thinnest envelope of the three.",
    rule: "The discomfort of opening is bounded and brief. The cost of not opening compounds. When you notice yourself avoiding something financial, that is the signal it is the most valuable thing you could do in the next ten minutes.",
  },
};

const M8_MINIMUM_DUE: EventCard = {
  id: "m08-minimum-due",
  month: 8,
  title: "Minimum amount due",
  body: "Your credit card statement. The phone is on it, and so is everything you have tapped it for since.",
  category: "temptation",
  concept: "anchoring",
  proofType: "ARITHMETIC",
  // ★ M3 → M8. No card, no statement, no event. The month runs quiet instead.
  gate: { requiresFlags: ["has_credit_card"], requiresDebtKind: "credit_card" },
  biases: ["anchoring", "present_bias", "avoidance"],
  pressure: [
    {
      type: "prefill",
      content: "Minimum Amount Due  ₹2,300",
      delayMs: 300,
      meta: { subtext: "Total Amount Due ₹46,000", emphasis: "huge" },
    },
    {
      type: "ticker",
      content: "Pay minimum to keep your account in good standing.",
      delayMs: 1600,
    },
    {
      type: "prefill",
      content: "₹2,300",
      delayMs: 2400,
      meta: { field: "payment", prefilled: true },
    },
  ],
  choices: [
    {
      id: "minimum_only",
      label: "Pay the minimum — you're all set",
      hint: "The field is already filled in.",
      visualWeight: "primary",
      immediate: [{ kind: "stress", amount: -3 }],
      delayed: [],
      fallbackNote:
        "Green tick, “payment successful”, account in good standing. The balance behind it is still growing at 42% a year.",
    },
    {
      id: "partial",
      label: "Pay ₹15,000",
      visualWeight: "normal",
      immediate: [
        { kind: "emergencyFund", amount: -15000 },
        { kind: "cash", amount: 15000 },
        { kind: "debtPay", debtId: "card", amount: 15000 },
      ],
      delayed: [],
      fallbackNote:
        "Better, and genuinely better — but what is left still compounds monthly at a rate no investment will match.",
    },
    {
      id: "in_full",
      label: "Clear the whole balance",
      hint: "It will hurt. It is also the highest return available to you.",
      visualWeight: "normal",
      requires: { op: "minLiquid", amount: 46000 },
      blockedReason:
        "You do not have the balance in liquid money. The EMI took the savings that would have cleared it.",
      immediate: [
        { kind: "emergencyFund", amount: -46000 },
        { kind: "cash", amount: 46000 },
        { kind: "debtPay", debtId: "card", amount: 46000 },
        { kind: "creditScore", amount: 25 },
        { kind: "xp", amount: 25 },
      ],
      delayed: [],
      fallbackNote:
        "That emptied your buffer and stopped a 42% bleed. Rebuilding the buffer is now much faster, because nothing is eating it.",
    },
    {
      id: "skip",
      label: "Skip it this month",
      visualWeight: "muted",
      immediate: [
        { kind: "creditScore", amount: -45 },
        { kind: "cash", amount: -600 },
        { kind: "stress", amount: -2 },
      ],
      delayed: [],
      fallbackNote:
        "A late fee, a penalty rate, and 45 points off your CIBIL for one skipped cycle. This is the most expensive of the four.",
    },
  ],
  correctChoiceId: "in_full",
  debrief: {
    opening:
      "The field was pre-filled with ₹2,300 and you were invited to accept it. That figure is engineered to be accepted — it is the smallest payment that keeps you profitable to the lender.",
    proof:
      "Paying only the minimum on ₹46,000 at 42% takes over eight years and costs roughly ₹58,000 in interest — more than the phone. The words “good standing” are doing a great deal of work.",
    rule: "A credit card is a 45-day interest-free loan or a 42% loan. There is no third mode. Pay it in full or do not use it.",
  },
};

const M9_CORRECTION: EventCard = {
  id: "m09-correction",
  month: 9,
  title: "The correction",
  body: "Markets fell 14% in three weeks. Everything you own is red, and it has been red for eleven days.",
  category: "market",
  concept: "volatility",
  proofType: "EVIDENCE",
  biases: ["loss_aversion", "myopic_loss_aversion", "herd_behaviour", "recency"],
  pressure: [
    { type: "notification", content: "Sensex sheds 900 points", delayMs: 300 },
    { type: "headline", content: "IS THIS 2008 AGAIN?", delayMs: 1200 },
    { type: "notification", content: "Analysts warn of a deeper correction", delayMs: 2000 },
    {
      type: "ticker",
      content: "Ravi pulled everything out yesterday. Says he'll re-enter at the bottom.",
      delayMs: 2900,
    },
    { type: "notification", content: "Your portfolio is down 14%", delayMs: 3700 },
    {
      type: "chart",
      content: "Three weeks",
      delayMs: 4400,
      meta: { series: [100, 97, 92, 88, 86], change: "−14%", tone: "loss" },
    },
  ],
  choices: [
    {
      id: "sell_all",
      label: "Sell everything",
      hint: "Stop the bleeding. Re-enter when it settles.",
      visualWeight: "primary",
      immediate: [
        { kind: "stress", amount: -20 },
        { kind: "flagAdd", flag: "panic_sold" },
      ],
      // You are in cash from here. The recovery happens without you.
      delayed: [
        {
          monthsLater: 1,
          effects: [{ kind: "portfolioMultiply", factor: cancelAll(9) }],
          note: "Markets rose 9%. You were in cash.",
        },
        {
          monthsLater: 2,
          effects: [{ kind: "portfolioMultiply", factor: cancelAll(10) }],
          note: "Markets rose another 4%. You were still in cash.",
        },
        {
          monthsLater: 3,
          effects: [{ kind: "portfolioMultiply", factor: cancelAll(11) }],
          note: "Still in cash, still waiting for the bottom that already happened.",
        },
      ],
      fallbackNote:
        "The red stopped instantly and your stress dropped twenty points. That relief is real, and it is the trap — you have just converted a paper loss into a permanent one.",
    },
    {
      id: "sell_half",
      label: "Sell half — take some off the table",
      visualWeight: "normal",
      immediate: [
        { kind: "stress", amount: -10 },
        { kind: "flagAdd", flag: "panic_sold_half" },
      ],
      delayed: [
        {
          monthsLater: 1,
          effects: [{ kind: "portfolioMultiply", factor: cancelHalf(9) }],
          note: "Markets rose 9%. Half of you was there for it.",
        },
        {
          monthsLater: 2,
          effects: [{ kind: "portfolioMultiply", factor: cancelHalf(10) }],
          note: "Markets rose another 4%, on half a position.",
        },
      ],
      fallbackNote:
        "Half the relief, half the damage, and you still locked in a real loss on the half you sold.",
    },
    {
      id: "pause_sip",
      label: "Keep what you have, pause the SIP",
      hint: "Stop putting good money after bad.",
      visualWeight: "normal",
      immediate: [
        { kind: "stress", amount: -4 },
        { kind: "flagAdd", flag: "paused_sip" },
      ],
      delayed: [
        {
          monthsLater: 2,
          effects: [{ kind: "portfolioAdd", amount: -6000 }],
          note: "The units you did not buy at the bottom would have been worth ₹6,000 more by now.",
        },
      ],
      fallbackNote:
        "You avoided selling, which matters. You also skipped buying at the cheapest prices of the entire year.",
    },
    {
      id: "hold",
      label: "Hold. Let the SIP go through as normal.",
      hint: "A fixed amount buys 14% more units this month.",
      visualWeight: "muted",
      immediate: [
        { kind: "stress", amount: 12 },
        { kind: "flagAdd", flag: "held_through" },
        { kind: "xp", amount: 25 },
      ],
      delayed: [],
      fallbackNote:
        "This hurts, and it should. Your SIP just bought 14% more units than it did last month, which is the mechanism doing exactly what it is for.",
    },
  ],
  correctChoiceId: "hold",
  debrief: {
    opening:
      "You were shown the red number every few minutes for eleven days. That is loss aversion amplified by frequency — the same fall, checked ten times a day, feels ten times worse.",
    proof:
      "A paper loss becomes a real loss only when you sell. Markets rose 9% and then 4% in the two months after this one, and the market's best days cluster immediately after its worst — which is why nobody, including Ravi, reliably re-enters at the bottom.",
    rule: "Your SIP is the strongest tool you have and it works best precisely when it feels worst. A 14% fall means the same ₹5,000 bought 14% more units. Look at it less often.",
  },
};

const M10_SCAM_CALL: EventCard = {
  id: "m10-scam-call",
  month: 10,
  title: "2:14 a.m.",
  body: "Your phone rings. The caller ID says SBI Customer Care. A calm, professional voice tells you there is a fraudulent transaction of ₹47,000 from Delhi, and that he can block it — but he needs to verify your identity in the next ninety seconds.",
  category: "digital",
  concept: "digital_safety",
  proofType: "RULE",
  // ★ stress → M10. Fraud targets depleted bandwidth, not stupidity.
  //
  // The plan says 45. Nothing reaches 45 by month 10 — the engine decays stress
  // 4 points a month and discretionary spending relieves up to 12 more, so a
  // gate of 45 never opens and the content is dead.
  //
  // Measured stress at this gate, across real playthroughs:
  //     all correct                    8      quiet
  //     diversified, envelopes sealed  13     quiet
  //     all in, held through           23     fires
  //     all in, envelopes sealed       29     fires
  //     every tempting choice          35     fires
  //
  // 20 is the line that separates them. Note the one path that stays quiet
  // despite going all in: selling everything in month 9 relieves 20 points, so
  // the panic-seller is not targeted. That is not a bug — the relief is real,
  // which is exactly what makes month 9 a trap. See KNOWN_ISSUES 2.9.
  gate: { minStress: 20 },
  biases: ["authority", "urgency", "fear", "bandwidth_tax"],
  pressure: [
    { type: "dim", content: "2:14 a.m.", delayMs: 200 },
    {
      type: "timer",
      content: "Transaction clears in",
      delayMs: 900,
      meta: { seconds: 90, pausable: false },
    },
    {
      type: "testimonial",
      content:
        "“Sir, I have your account here — ending 4417, registered to your name. I just need to confirm it's you.”",
      delayMs: 2000,
    },
    { type: "notification", content: "Call centre ambience. Hold music if you hesitate.", delayMs: 3200 },
  ],
  choices: [
    {
      id: "otp",
      label: "Read out the OTP",
      hint: "He already knows your name and your card digits.",
      visualWeight: "primary",
      immediate: [
        { kind: "emergencyFund", amount: -47000 },
        { kind: "stress", amount: 25 },
        { kind: "flagAdd", flag: "fraud_victim" },
      ],
      delayed: [],
      fallbackNote:
        "₹47,000, gone in under a minute. There was never a fraudulent transaction — the one you just authorised is the only one.",
    },
    {
      id: "cvv",
      label: "Give the CVV so he can verify the card",
      visualWeight: "normal",
      immediate: [
        { kind: "emergencyFund", amount: -112000 },
        { kind: "stress", amount: 30 },
        { kind: "flagAdd", flag: "fraud_victim" },
      ],
      delayed: [],
      fallbackNote:
        "Four transactions over twenty minutes, ₹1,12,000 in total. A CVV is the last thing standing between someone and your card.",
    },
    {
      id: "install_app",
      label: "Install the “SBI Secure” app he's sending",
      visualWeight: "normal",
      immediate: [
        { kind: "stress", amount: 12 },
        { kind: "flagAdd", flag: "fraud_victim" },
      ],
      delayed: [
        {
          monthsLater: 1,
          effects: [{ kind: "emergencyFund", amount: -80000 }],
          note: "The app he sent was screen-sharing software. The account was emptied over three days.",
        },
      ],
      fallbackNote:
        "Nothing happened tonight, which is the point — it was screen-sharing software and it watched you log in.",
    },
    {
      id: "hang_up",
      label: "Hang up. Call the number printed on your card.",
      visualWeight: "muted",
      immediate: [
        { kind: "stress", amount: 5 },
        { kind: "xp", amount: 25 },
      ],
      delayed: [],
      fallbackNote:
        "Nothing happens. There was no transaction. The anticlimax is what being safe feels like.",
    },
  ],
  correctChoiceId: "hang_up",
  debrief: {
    opening:
      "He never asked you for money. He offered to protect you, and he set a clock. Fear works better than greed, and 2 a.m. was not an accident — this call came when your judgement was cheapest.",
    proof:
      "He knew your name and the last four digits of your card because that data leaks constantly. Knowing your details proves nothing about who he is. An OTP is a signature: reading it aloud is signing a blank cheque.",
    rule: "No bank, no RBI official and no police officer will ever ask for an OTP, a CVV, a PIN, or ask you to install an app. Not ever. Hang up, call the number printed on your own card, and if money has moved, report it within three days — 1930, or cybercrime.gov.in.",
  },
};

const M11_THE_DEPOSIT: EventCard = {
  id: "m11-the-deposit",
  month: 11,
  title: "The deposit",
  body: "2:40 a.m. Appendicitis. The surgery is straightforward and it needs to happen tonight. The hospital wants the admission deposit before they will start.",
  category: "emergency",
  concept: "emergency_fund",
  proofType: "ARITHMETIC",
  biases: ["optimism_bias", "present_bias", "availability"],
  pressure: [
    { type: "dim", content: "2:40 a.m.", delayMs: 200 },
    {
      type: "headline",
      content: "Admission deposit required before surgery",
      delayMs: 1000,
      meta: { amount: 215000, insuredAmount: 9000 },
    },
    { type: "timer", content: "The surgeon is waiting", delayMs: 2200, meta: { seconds: 60 } },
  ],
  choices: [
    {
      id: "cashless",
      label: "Cashless claim — pay the ₹9,000 co-pay",
      hint: "Approved in forty minutes.",
      visualWeight: "normal",
      // ★ M2 → M11, and ★ M7 → M11. This is the only door the policy opens.
      requires: { op: "hasFlag", flag: "health_insured" },
      blockedReason:
        "You have no active health cover. This is the month that fact costs you.",
      immediate: [
        { kind: "emergencyFund", amount: -9000 },
        { kind: "stress", amount: 8 },
        { kind: "xp", amount: 25 },
      ],
      delayed: [],
      fallbackNote:
        "₹9,000 and forty minutes of paperwork. The policy you nearly did not buy just did the only thing it was ever meant to do.",
    },
    {
      id: "credit_card",
      label: "Put ₹2,15,000 on the credit card",
      hint: "It will go through tonight.",
      visualWeight: "primary",
      immediate: [
        {
          kind: "debtAdd",
          debt: {
            id: "hospital-card",
            label: "Hospital bill (credit card)",
            kind: "credit_card",
            principal: 215000,
            apr: 0.42,
            minPaymentPct: 0.05,
            minPaymentFloor: 2000,
            limit: 250000,
          },
        },
        { kind: "stress", amount: 20 },
      ],
      delayed: [],
      fallbackNote:
        "It went through in seconds. At 42% it takes about three years to clear and costs roughly ₹1,40,000 in interest on top of the bill.",
    },
    {
      id: "family",
      label: "Call your parents and ask",
      visualWeight: "normal",
      immediate: [
        {
          kind: "debtAdd",
          debt: {
            id: "family-loan",
            label: "Borrowed from family",
            kind: "family",
            principal: 215000,
            apr: 0,
            minPaymentPct: 0.02,
            minPaymentFloor: 2000,
          },
        },
        { kind: "flagAdd", flag: "family_debt" },
        { kind: "stress", amount: 25 },
      ],
      delayed: [],
      fallbackNote:
        "They said yes before you finished the sentence, and they moved money they were saving for something else. There is no interest on this one and it is not free.",
    },
    {
      id: "drain",
      label: "Empty everything you have and cover the rest however you can",
      visualWeight: "normal",
      immediate: [
        { kind: "emergencyFund", amount: -215000 },
        { kind: "stress", amount: 22 },
      ],
      delayed: [],
      fallbackNote:
        "Every rupee of buffer is gone and the shortfall went overdrawn at 36%. You are now carrying the most expensive debt available to you.",
    },
    {
      id: "personal_loan",
      label: "Personal loan at 16%",
      visualWeight: "normal",
      immediate: [
        {
          kind: "debtAdd",
          debt: {
            id: "hospital-loan",
            label: "Hospital bill (personal loan)",
            kind: "personal_loan",
            principal: 215000,
            apr: 0.16,
            minPaymentPct: 0.03,
            minPaymentFloor: 5000,
          },
        },
        { kind: "stress", amount: 18 },
      ],
      delayed: [],
      fallbackNote:
        "The least bad of four bad options, which is not the same as a good one. Sixteen percent on ₹2,15,000 is still ₹34,400 a year.",
    },
  ],
  correctChoiceId: "cashless",
  debrief: {
    opening:
      "If you are reading this uninsured, there was no correct choice on that screen. The correct choice was made in month 2, when cover cost ₹950 and felt like money for nothing.",
    proof:
      "Ten months of premiums come to ₹9,500. The bill they would have absorbed was ₹2,15,000, leaving you a ₹9,000 co-pay. That is a return of more than twenty times, on the one product that pays out exactly when you can least afford the alternative.",
    rule: "Insurance feels like waste in every month it is not needed, which is nearly all of them. You knew the base rate for medical emergencies and quietly assumed it applied to other people. Catastrophic health spending is the single most common route from stability to ruin in Indian households.",
  },
};

const M12_SACRED_SAVINGS: EventCard = {
  id: "m12-sacred-savings",
  month: 12,
  title: "Sacred savings",
  body: "Twelve months in. You have money set aside that you have been building carefully, and you are also carrying debt that costs far more than your savings earn. They have never been on the same screen before.",
  category: "opportunity",
  concept: "debt_priority",
  proofType: "ARITHMETIC",
  biases: ["mental_accounting", "loss_aversion", "avoidance"],
  pressure: [
    {
      type: "headline",
      content: "Your Savings — 12 months of discipline 🏆",
      delayMs: 400,
      meta: { tone: "trophy" },
    },
    {
      type: "ticker",
      content: "Your outstanding balances  ▸  tap to expand",
      delayMs: 1500,
      meta: { collapsed: true },
    },
    {
      type: "testimonial",
      content: "Amma: “Never touch your savings. That money is for emergencies.”",
      delayMs: 2600,
    },
  ],
  choices: [
    {
      id: "keep_saving",
      label: "Keep saving. Pay the minimums.",
      hint: "That money is for emergencies.",
      visualWeight: "primary",
      immediate: [
        { kind: "stress", amount: -3 },
        { kind: "flagAdd", flag: "mental_accounting" },
      ],
      delayed: [],
      fallbackNote:
        "Your savings earn about 3.5% a year. Your most expensive debt charges 42%. Every month you hold both, the gap is a real cost.",
    },
    {
      id: "clear_it",
      label: "Use ₹50,000 of savings to kill the most expensive debt",
      hint: "It is a guaranteed, tax-free return equal to the rate.",
      visualWeight: "normal",
      requires: { op: "minLiquid", amount: 50000 },
      blockedReason: "You do not have ₹50,000 in liquid money to move.",
      immediate: [
        { kind: "emergencyFund", amount: -50000 },
        { kind: "cash", amount: 50000 },
        { kind: "debtPay", debtId: null, amount: 50000 },
        { kind: "creditScore", amount: 20 },
        { kind: "xp", amount: 25 },
      ],
      delayed: [],
      fallbackNote:
        "The balance feels terrible and the bleeding stopped. That buffer now rebuilds far faster, because nothing is eating it every month.",
    },
    {
      id: "refinance",
      label: "Take a personal loan at 14% and clear the card with it",
      visualWeight: "normal",
      requires: { op: "hasFlag", flag: "has_card_debt" },
      blockedReason: "You have no high-interest card debt to move.",
      immediate: [
        {
          kind: "debtAdd",
          debt: {
            id: "consolidation-loan",
            label: "Consolidation loan",
            kind: "personal_loan",
            principal: 50000,
            apr: 0.14,
            minPaymentPct: 0.03,
            minPaymentFloor: 2500,
          },
        },
        { kind: "cash", amount: 50000 },
        { kind: "debtPay", debtId: null, amount: 50000 },
      ],
      delayed: [],
      fallbackNote:
        "Fourteen percent beats forty-two, so this is genuinely progress. You also still have idle savings and now two products instead of one.",
    },
    {
      id: "remind_me",
      label: "Remind me next month",
      visualWeight: "muted",
      immediate: [
        { kind: "stress", amount: -2 },
        { kind: "flagAdd", flag: "deferred_again" },
      ],
      delayed: [],
      fallbackNote:
        "Nothing happened, and it felt fine. That is what makes this one repeatable — and it costs the same every time.",
    },
  ],
  correctChoiceId: "clear_it",
  debrief: {
    opening:
      "Your savings were on screen with a trophy on them. Your balances were in a collapsed row you had to tap to open. You were being asked to compare two things that were not presented as comparable.",
    proof:
      "₹50,000 in savings earns about ₹146 a month. ₹50,000 on a card at 42% costs about ₹1,750 a month. Holding both means paying roughly ₹1,600 every month for the feeling of having savings.",
    rule: "Clear any debt whose rate exceeds what your savings earn. Paying off a 42% card is a guaranteed, tax-free 42% return, and no investment on earth offers that. Rebuild the buffer afterwards — it rebuilds much faster once nothing is draining it.",
  },
};

/* ═════════════════════════════ the pack ═══════════════════════════ */

export const STORY_EVENTS: EventCard[] = [
  M1_FIRST_SALARY,
  M2_HEALTH_COVER,
  M3_PHONE,
  M4_FREE_TRIALS,
  M5_SURE_THING,
  M6_THE_RAISE,
  M7_ENVELOPES,
  M8_MINIMUM_DUE,
  M9_CORRECTION,
  M10_SCAM_CALL,
  M11_THE_DEPOSIT,
  M12_SACRED_SAVINGS,
];

export const storyFirstEarner: ContentPack = {
  id: "story-first-earner",
  mode: "story",
  title: "First Earner",
  subtitle: "You are 23, first job in Chennai, ₹42,000 a month. Twelve months.",
  lifeStages: ["first_earner"],
  totalMonths: 12,
  events: STORY_EVENTS,
  marketReturns: STORY_MARKET,
  initialState: {
    packId: "story-first-earner",
    totalMonths: 12,
    age: 23,
    monthlyIncome: 42000,
    fixedExpenses: 26000,
    cash: 12000,
    emergencyFund: 0,
    portfolio: { value: 0, invested: 0 },
    debts: [
      {
        id: "education-loan",
        label: "Education loan",
        kind: "education_loan",
        principal: 180000,
        apr: 0.09,
        minPaymentPct: 0.02,
        minPaymentFloor: 2500,
      },
    ],
    insuranceHealthPremium: 0,
    insuranceTermPremium: 0,
    creditScore: 720,
    stress: 20,
    flags: [],
    subscriptions: [],
    xp: 0,
    badges: [],
    streak: 0,
  },
};

export default storyFirstEarner;
