/**
 * CASE STUDIES — real events, researched and cited.
 *
 * Two shapes, one library:
 *
 *   `explanation` — you read it. Story, the mechanics underneath, the
 *      behavioural half, the lesson, the sources. GameStop is this: nobody
 *      can meaningfully "play" a gamma squeeze in ninety seconds, and
 *      pretending otherwise would teach the wrong thing.
 *
 *   `simulation` — it happens to you first, and *then* you read it. The
 *      Economist decoy is this: the whole finding is about what a menu does to
 *      a person looking at it, so putting the menu in front of you is the only
 *      honest way to present it.
 *
 * Both carry a `faq` — authored answers to the questions people actually ask.
 * That is the fallback layer for the follow-up box, and it ships first: with no
 * `GEMINI_API_KEY` the box still answers. (CLAUDE.md rule 4.)
 *
 * Figures in this file are quoted from the sources listed on each case. They
 * are content, not engine money — Rule 2's integer-rupee discipline governs
 * `lib/sim/`, and these are dollars and percentages in cited prose.
 */

export type CaseMode = "simulation" | "explanation";

export interface CaseConcept {
  term: string;
  body: string;
}

export interface CaseSource {
  citation: string;
  url?: string;
}

/**
 * An authored answer to a follow-up question.
 *
 * `keywords` are matched against whatever the reader types. Crude on purpose —
 * this is the no-key path, and a keyword hit that lands a real authored answer
 * beats a generated paragraph that might be wrong.
 */
export interface CaseFaq {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
}

/** A milestone on the illustrative price path. Value is in the case's currency. */
export interface CaseTimelinePoint {
  label: string;
  value: number;
  note?: string;
}

export interface CaseStudy {
  id: string;
  /** As numbered in the research set — "Case study 5". */
  number: number;
  title: string;
  category: string;
  mode: CaseMode;
  /** One line for the index card. Not a summary — a reason to open it. */
  hook: string;
  summary: string;
  coreConcepts: CaseConcept[];
  behaviouralConcepts: CaseConcept[];
  keyLesson: string;
  sources: CaseSource[];
  faq: CaseFaq[];
  /** Which interactive to mount. Simulation cases only. */
  sim?: "decoy";
  /** Optional illustrative path, drawn as bars. Explanation cases. */
  timeline?: { currency: string; points: CaseTimelinePoint[] };
}

/* ══════════════════════ 5 · GameStop — explanation ═════════════════════ */

const GAMESTOP: CaseStudy = {
  id: "gamestop-short-squeeze",
  number: 5,
  title: "Social Dynamics and Market Microstructure: The GameStop Short Squeeze",
  category: "Economics",
  mode: "explanation",
  hook: "A dying video game shop went from $20 to $483 in three weeks. Almost none of it was about the shop.",
  summary:
    "In January 2021, brick-and-mortar video game retailer GameStop became the centre of a historic market event driven by individual retail investors on Reddit's r/wallstreetbets forum. Institutional hedge funds had accumulated heavy short positions against GameStop, exceeding 140% of the stock's float. Recognising this vulnerability, retail traders orchestrated a buying campaign targeting GameStop shares and short-dated call options via commission-free brokerages like Robinhood. This massive call volume forced options market makers to buy underlying GameStop shares to remain delta-neutral, triggering a severe gamma squeeze. As the share price surged, institutional short sellers were forced to buy back shares to cover their losing positions, resulting in a short squeeze. GameStop's stock price spiked from under $20 in early January to an intraday peak of $483 on January 28, 2021. The extreme volatility prompted clearinghouses to demand billions in additional collateral from brokerages, leading to temporary trading restrictions on retail platforms. The event demonstrated how digital coordination can alter short-term market dynamics.",
  timeline: {
    currency: "$",
    points: [
      { label: "Jan 4", value: 17, note: "Where the year opened." },
      { label: "Jan 13", value: 31, note: "The forum campaign becomes visible." },
      { label: "Jan 22", value: 65, note: "Call option volume forces market makers to buy the stock." },
      { label: "Jan 27", value: 348, note: "Short sellers covering at any price." },
      { label: "Jan 28", value: 483, note: "Intraday peak. Brokerages restrict buying the same day." },
      { label: "Feb 4", value: 53, note: "The mechanism unwinds as fast as it wound up." },
    ],
  },
  coreConcepts: [
    {
      term: "Short selling mechanics",
      body: "Borrowing shares to sell on the open market, with an obligation to repurchase them later. The gain is capped — a share can only fall to zero — while the loss is not, because there is no ceiling on what you may have to pay to buy it back.",
    },
    {
      term: "Gamma and short squeezes",
      body: "Self-reinforcing price loops. Market makers who sell call options hedge by buying the underlying stock; the more the price rises, the more they must buy. Short sellers covering their positions are also buying. Both groups are forced buyers, and forced buying at any price is what a squeeze is made of.",
    },
    {
      term: "Clearinghouse margin requirements",
      body: "Settlement takes time, and the infrastructure in between demands collateral against that risk. When volatility spiked, clearinghouses called for billions more from brokerages — which is why retail platforms restricted buying, and why that restriction was a plumbing constraint rather than a market view.",
    },
  ],
  behaviouralConcepts: [
    {
      term: "Herd behaviour and social proof",
      body: "An online forum let thousands of people see each other act in real time. Capital mobilised on the strength of other people's conviction rather than on anything about the company's earnings.",
    },
    {
      term: "FOMO",
      body: "Explosive price increases pull in buyers who are responding to the increase itself. By definition the people who arrive on that signal are arriving late, and the highest volume prints near the top.",
    },
    {
      term: "Attention economy and gamification",
      body: "Commission-free apps with confetti animations and push notifications drove very high engagement in short-dated options — instruments whose risk profile is not obvious from a three-tap interface.",
    },
  ],
  keyLesson:
    "Market prices can decouple drastically from the value of the underlying business. Technical positioning, forced buyers and coordinated crowd behaviour move a price in the short run, and none of them are a statement about what the company is worth.",
  sources: [
    {
      citation:
        "U.S. Securities and Exchange Commission (2021), \"Staff Report on Equity and Options Market Structure Conditions in Early 2021\".",
      url: "https://www.sec.gov/files/staff-report-equity-options-market-struction-conditions-early-2021.pdf",
    },
    {
      citation:
        "van Loenhout, J. (2023), \"The GameStop Short Squeeze and Retail Investing Dynamics\", Erasmus University Thesis Repository.",
    },
  ],
  faq: [
    {
      id: "gme-short",
      question: "What does it mean to short a stock?",
      answer:
        "You borrow shares you do not own, sell them, and promise to buy them back later and return them. If the price falls you keep the difference. If it rises you still have to buy them back — and since there is no limit to how high a price can go, there is no limit to what that can cost you. That asymmetry is the whole story of January 2021.",
      keywords: ["short", "shorting", "borrow", "short sell", "shorted"],
    },
    {
      id: "gme-140",
      question: "How can more than 100% of a company be shorted?",
      answer:
        "The same share can be lent out more than once. A borrows a share and sells it to B; B's broker can lend that same share to C, who sells it to D. Each loan creates a separate obligation to return a share, so the total owed can exceed the number of shares that exist. Reported short interest passed 140% of GameStop's float on that basis.",
      keywords: ["140", "float", "more than 100", "percent", "short interest"],
    },
    {
      id: "gme-gamma",
      question: "What is a gamma squeeze, in plain words?",
      answer:
        "When you buy a call option, someone sells it to you — usually a market maker who does not want a bet on the direction. To stay neutral they buy some of the stock. If the price rises, the option becomes more likely to pay out, so they must buy more. Their hedging is mechanical, not opinionated, and in January 2021 it meant a wave of buying that was caused by the price rise and then caused more of it.",
      keywords: ["gamma", "squeeze", "options", "call", "market maker", "delta", "hedge"],
    },
    {
      id: "gme-restrict",
      question: "Why did Robinhood stop people buying?",
      answer:
        "Trades take two days to settle, and clearinghouses hold collateral against that window. When volatility spiked, the collateral demanded from brokerages ran into billions overnight. Restricting buying reduced the exposure they had to post against. The SEC staff report frames it as a capital and settlement constraint rather than a view on the stock.",
      keywords: ["robinhood", "restrict", "stopped", "buy button", "clearing", "collateral", "halt"],
    },
    {
      id: "gme-lesson",
      question: "Could this happen again?",
      answer:
        "The ingredients are structural, not one-off: heavy short interest, cheap short-dated options, forced hedging, and a place for a crowd to coordinate in real time. All four still exist. What GameStop showed is that a price can be driven by positioning rather than by the business — which cuts in both directions, because the same mechanism unwound it from $483 to $53 inside a week.",
      keywords: ["again", "repeat", "future", "happen", "lesson", "learn"],
    },
  ],
};

/* ═══════════════════ 4 · The Economist — simulation ════════════════════ */

const DECOY: CaseStudy = {
  id: "economist-decoy-pricing",
  number: 4,
  title: "Decoy Pricing and Choice Architecture: The Economist Subscription Experiment",
  category: "Consumer Psychology",
  mode: "simulation",
  sim: "decoy",
  hook: "Three prices. One of them nobody ever picks. Remove it and most people change their mind.",
  summary:
    "Behavioural economist Dan Ariely analysed a subscription pricing menu used by The Economist to evaluate how option structure influences consumer choice. The publication presented potential subscribers with three options: digital-only for $59, print-only for $125, and print-plus-digital for $125. In an initial trial with 100 business students, 84% selected the combined print-plus-digital option, 16% chose digital-only, and 0% chose print-only. Although the print-only option received zero selections, its inclusion was strategic. When Ariely removed it from a second trial — leaving only the $59 digital and the $125 combined offer — behaviour reversed completely. 68% of respondents chose the $59 digital subscription, while only 32% chose the $125 combined offer. By introducing an asymmetrically dominated decoy, The Economist drastically altered value perception and drove customers toward the higher-margin tier.",
  coreConcepts: [
    {
      term: "Price discrimination",
      body: "Designing tiers so that people willing to pay more are given a reason to. The menu is not a list of what exists — it is an instrument for sorting customers by what they will part with.",
    },
    {
      term: "Average revenue per user",
      body: "The number the menu is optimised for. Moving a large share of buyers from $59 to $125 raises revenue per customer without changing the product, the cost base, or a single word of the magazine.",
    },
    {
      term: "Product bundling",
      body: "Combining print and digital into one package raises perceived utility and makes direct price comparison harder, because there is no longer a like-for-like alternative to check it against.",
    },
  ],
  behaviouralConcepts: [
    {
      term: "Decoy effect (asymmetric dominance)",
      body: "Print-only at $125 is worse than print-plus-digital at $125 in every respect and better in none. Nobody picks it. Its job is to sit next to the combined offer and make it look like something for nothing.",
    },
    {
      term: "Price anchoring",
      body: "$125 arrives first as the price of print alone. Once that number is in your head, $125 for print and digital together reads as a discount rather than as more than twice $59.",
    },
    {
      term: "Frame dependence",
      body: "The same two options, priced identically, attract 32% or 84% of buyers depending only on what sits beside them. Preference is not being revealed by the menu. It is being produced by it.",
    },
  ],
  keyLesson:
    "What you are willing to pay is far more elastic than it feels. A menu is not a neutral list of what is available — it is an argument, and the option nobody chooses is often the one doing the arguing.",
  sources: [
    {
      citation:
        "Ariely, D. (2008), Predictably Irrational: The Hidden Forces That Shape Our Decisions, HarperCollins — chapter 1, \"The Truth About Relativity\".",
    },
    {
      citation:
        "Huber, J., Payne, J. W. & Puto, C. (1982), \"Adding Asymmetrically Dominated Alternatives: Violations of Regularity and the Similarity Hypothesis\", Journal of Consumer Research 9(1).",
    },
  ],
  faq: [
    {
      id: "decoy-why",
      question: "Why does the decoy work if nobody picks it?",
      answer:
        "Because comparing things is easy and valuing them is hard. Print-only at $125 gives you one comparison you can make instantly: same price, less stuff. Print-plus-digital wins that comparison outright, and winning a comparison feels like being worth it. The digital option at $59 is never compared to anything, because there is nothing on the menu that makes it look like a win.",
      keywords: ["why", "work", "nobody", "zero", "picks", "chose", "decoy"],
    },
    {
      id: "decoy-spot",
      question: "How do I spot a decoy in the wild?",
      answer:
        "Look for the option that is worse than another option in every way and better in none — the medium popcorn priced a rupee below the large, the middle phone storage tier, the annual plan that exists to make the two-year plan look sensible. If an option has no reason to exist for a buyer, it exists for the seller.",
      keywords: ["spot", "identify", "wild", "real", "example", "notice", "recognise"],
    },
    {
      id: "decoy-defence",
      question: "What actually protects me from this?",
      answer:
        "Decide what the thing is worth to you before you look at the menu. Write down what you would pay for digital alone, in a vacuum, and then look. That one step turns a comparison problem back into a valuation problem, which is the problem you actually wanted to solve.",
      keywords: ["protect", "defend", "avoid", "resist", "stop", "against", "immune"],
    },
    {
      id: "decoy-sample",
      question: "Is 100 students a real result?",
      answer:
        "It is a small sample from one population, and Ariely presents it as an illustration rather than a definitive measurement. The underlying effect is not resting on it though — asymmetric dominance was documented by Huber, Payne and Puto in 1982 and has been replicated many times since across products and price points. Treat the exact percentages as illustrative and the direction as solid.",
      keywords: ["100", "sample", "students", "real", "valid", "replicate", "science", "study"],
    },
  ],
};

export const CASE_STUDIES: CaseStudy[] = [DECOY, GAMESTOP];

export const CASES_BY_ID: Record<string, CaseStudy> = Object.fromEntries(
  CASE_STUDIES.map((c) => [c.id, c]),
);

export function caseById(id: string): CaseStudy | undefined {
  return CASES_BY_ID[id];
}
