import type { Concept } from "@/lib/sim/types";

/**
 * The concept library — 16 concepts, each authored at three depths.
 *
 * Literacy level selects a depth. It never rewrites, summarises or translates
 * anything at runtime, and it never touches a number. Depth 1 is plain words
 * for someone who has never been taught this; depth 3 assumes fluency and uses
 * the standard vocabulary precisely.
 *
 * Plan §8.4 lists 14. Two more are here because the deck genuinely teaches
 * them: `recurring_cost` (month 4) and `avoidance` (month 7). See KNOWN_ISSUES
 * 2.2.
 *
 * A prerequisite must never sit at a higher tier than the concept that needs
 * it — the content lint asserts this, so a tier-3 idea can never be gated
 * behind something even harder.
 */

export const CONCEPTS: Concept[] = [
  /* ─────────────────────────── tier 1 ─────────────────────────── */
  {
    id: "budgeting",
    name: "Budgeting",
    tier: 1,
    prerequisites: [],
    oneLiner: "Deciding where your money goes before it goes somewhere on its own.",
    explanations: {
      1: "Money you do not plan for gets spent. Decide what each part of your salary is for on the day it arrives — bills, saving, and what is left to enjoy. Writing it down is most of the work.",
      2: "A budget is a plan you make for your income before the month spends it for you. The order matters: fixed costs, then savings, then discretionary spending. Deciding on payday rather than at the end of the month is what makes it hold, because you cannot spend what has already moved.",
      3: "Budgeting is the allocation of a cash flow across committed, deferred and discretionary uses, executed at the point of receipt rather than the point of temptation. Its value comes less from the arithmetic than from the precommitment: automating the transfer on payday removes the decision from the moment when depletion and present bias are strongest.",
    },
  },
  {
    id: "savings_rate",
    name: "Savings rate",
    tier: 1,
    prerequisites: ["budgeting"],
    oneLiner: "The share of what you earn that you keep — the one number that decides everything.",
    explanations: {
      1: "Out of every ₹100 you earn, how many do you keep? That is your savings rate. Keeping ₹20 out of ₹100 matters far more than picking clever investments.",
      2: "Your savings rate is what you save divided by what you earn. It matters more than your returns, especially early on: a person saving 30% on a small salary builds wealth faster than one saving 5% on a large one. It is also the only lever you fully control — nobody controls the market.",
      3: "Savings rate is the dominant term in wealth accumulation over short and medium horizons, because contributions outweigh compounding until the corpus is large relative to income. It also cuts twice: raising it increases the numerator of what you accumulate and lowers the denominator of what you need to sustain, shortening the horizon from both directions.",
    },
  },
  {
    id: "emergency_fund",
    name: "Emergency fund",
    tier: 1,
    prerequisites: ["budgeting"],
    oneLiner: "Money set aside so that a bad month does not become a bad decade.",
    explanations: {
      1: "Keep some money that you do not touch, in a place you can reach in a day. When something goes wrong — a hospital bill, losing your job — this is what you use instead of borrowing at a terrible rate.",
      2: "An emergency fund is three to six months of your essential costs, held in cash or a liquid account. Its job is not to earn a return; its job is to stop a shock turning into high-interest debt. Every rupee it holds is a rupee you do not borrow at 42% on the worst day of your year.",
      3: "An emergency fund is self-insurance against income interruption and unbudgeted expenditure, sized against essential outflow rather than income. Its return is not the interest it earns but the borrowing it avoids — the spread between a liquid account and the marginal rate you would otherwise pay under duress, which for an unsecured borrower in distress is punitive.",
    },
  },
  {
    id: "apr",
    name: "Interest rate (APR)",
    tier: 1,
    prerequisites: [],
    oneLiner: "The real yearly price of borrowing, once every charge is counted.",
    explanations: {
      1: "When you borrow, you pay extra. The rate tells you how much extra per year. A credit card charging 42% means ₹100 borrowed becomes ₹142 in a year if you never pay it back. Always ask for the cash price before agreeing to pay monthly.",
      2: "APR is the annual cost of borrowing including fees, not just the headline interest. It is the only figure that lets you compare two loans honestly. 'No-cost EMI' usually means the interest was moved into the price rather than removed: if the cash price is lower than the total of the instalments, the difference is interest, whatever the salesperson calls it.",
      3: "APR annualises the total cost of credit — interest plus mandatory fees — allowing comparison across products with different tenures and compounding conventions. Zero-interest instalment offers typically embed the financing cost in the sticker price as a forgone discount; the effective rate is recoverable by solving for the discount rate that equates the instalment stream to the cash price.",
    },
  },
  {
    id: "insurance",
    name: "Insurance",
    tier: 1,
    prerequisites: ["emergency_fund"],
    oneLiner: "Paying a small, certain amount to avoid a large, ruinous one.",
    explanations: {
      1: "You pay a little every month. If something serious happens — you are hospitalised, or you die and your family depends on you — the insurer pays the big bill. It feels like wasted money in every month nothing goes wrong. That is what it is supposed to feel like.",
      2: "Insurance transfers a risk you cannot survive to someone who can absorb it. Buy it for outcomes that would ruin you, not for ones you could pay out of pocket. Keep protection and investment separate: bundled products give you less cover at a higher cost, because bundling makes the price of each part harder to see.",
      3: "Insurance converts a low-probability, high-severity loss into a certain premium. Its purpose is protection against ruin, not expected return — the expected value is negative by construction, and that is the point. Bundling protection with investment obscures both the mortality cost and the expense ratio; separating them dominates on cover-per-rupee and on liquidity.",
    },
  },
  {
    id: "recurring_cost",
    name: "Recurring costs",
    tier: 1,
    prerequisites: ["budgeting"],
    oneLiner: "Small monthly charges that are invisible one at a time and enormous together.",
    explanations: {
      1: "A ₹499 subscription is not ₹499. It is ₹5,988 a year, every year, until you cancel. Before you agree to any monthly charge, multiply it by twelve and decide on that number instead.",
      2: "Recurring charges escape scrutiny because each one is evaluated alone and never re-evaluated. Signing up takes one tap; cancelling takes four screens and a retention offer, and that asymmetry is deliberate. The fix is mechanical: multiply by twelve before agreeing, and review every recurring charge on a fixed date.",
      3: "Subscription pricing exploits the interaction of mental accounting with status quo bias: each charge is booked to a separate low-salience account and never resurfaces for review, while cancellation friction is engineered to exceed the perceived cost of continuing. Annualising at the point of decision restores comparability with discretionary purchases of equivalent size.",
    },
  },

  /* ─────────────────────────── tier 2 ─────────────────────────── */
  {
    id: "opportunity_cost",
    name: "Opportunity cost",
    tier: 2,
    prerequisites: ["budgeting"],
    oneLiner: "The best thing you gave up to do this thing.",
    explanations: {
      1: "Every rupee you spend is a rupee you cannot use for something else. The real cost of a purchase is not the price — it is whatever you would have done with that money instead.",
      2: "Opportunity cost is the value of the next-best use of a resource. A ₹60,000 phone does not cost ₹60,000; it costs ₹60,000 plus whatever that money would have grown into. It is also the right way to think about time and attention, not just money.",
      3: "Opportunity cost is the forgone return on the next-best alternative and is the correct basis for any allocation decision, in place of accounting cost. It is what makes carrying high-interest debt while holding low-yield savings irrational: the relevant comparison is the spread between the two, not the nominal return of either in isolation.",
    },
  },
  {
    id: "anchoring",
    name: "Anchoring",
    tier: 2,
    prerequisites: [],
    oneLiner: "The first number you see quietly decides what the right number feels like.",
    explanations: {
      1: "If someone shows you a big number first, everything after it looks small. If a bill shows 'minimum due ₹2,100' in large type, ₹2,100 starts to feel like the right amount to pay. It is not advice. It is the smallest payment that keeps you paying interest.",
      2: "Anchoring is the tendency to judge a number by its distance from the first one you were shown, rather than on its merits. Struck-through prices, minimum-payment figures and pre-filled fields all work this way. Research finds that merely displaying a minimum payment reduces the amount people pay — including people who could comfortably pay more.",
      3: "Anchoring is an insufficient-adjustment effect: an initially presented value serves as the starting point for an estimate and adjustment away from it is systematically inadequate, even when the anchor is known to be uninformative. In credit disclosure it is measurable and costly — minimum-payment salience depresses repayment across the distribution, including among liquidity-unconstrained borrowers.",
    },
  },
  {
    id: "avoidance",
    name: "Avoidance",
    tier: 2,
    prerequisites: [],
    oneLiner: "Not opening the envelope feels better, and costs more, every single time.",
    explanations: {
      1: "When money makes you anxious, you stop looking at it — the unopened bill, the statement you do not check. Not looking really does feel better for a while. The problem never waits, and it grows.",
      2: "Avoidance is not laziness. Your brain associates the task with anxiety, and avoiding it gives genuine, immediate relief — which is exactly what makes it repeat. The discomfort of opening is brief and bounded; the cost of not opening compounds. Noticing that you are avoiding something financial is the strongest available signal that it is the most valuable thing you could do next.",
      3: "The ostrich effect describes selective attention to financial information as a function of its expected valence: people monitor portfolios more often in rising markets and less in falling ones. It is negatively reinforced — avoidance reliably terminates an aversive state — which makes it self-sustaining and largely independent of numeracy. Interventions that work operate on the trigger and the friction, not on the arithmetic.",
    },
  },
  {
    id: "lifestyle_creep",
    name: "Lifestyle creep",
    tier: 2,
    prerequisites: ["savings_rate"],
    oneLiner: "Spending rises to meet income, and the raise disappears without ever being enjoyed.",
    explanations: {
      1: "When you start earning more, it is natural to spend more. The problem is that the new spending usually becomes permanent — a bigger flat, a car payment — while the good feeling wears off in a few weeks. Raise your saving first, then let spending rise from what is left.",
      2: "Lifestyle creep is the tendency for consumption to expand with income, so the savings rate stays flat or falls despite earning more. It is hard to reverse because the new costs are commitments while the satisfaction is not. A raise is the single easiest moment in your life to increase your savings rate, precisely because you have not adjusted to the money yet.",
      3: "Lifestyle inflation is hedonic adaptation applied to a consumption baseline: satisfaction from a step change in consumption decays toward the prior level within months, while the associated fixed commitments persist and are costly to unwind. Committing the marginal income at the moment of the increase — before the reference point resets — is the intervention with the highest success rate.",
    },
  },
  {
    id: "credit_utilisation",
    name: "Credit utilisation",
    tier: 2,
    prerequisites: ["apr"],
    oneLiner: "How much of your credit limit you are using, and why the score cares.",
    explanations: {
      1: "If your card allows ₹1,00,000 and you owe ₹80,000, you are using 80% of it. Lenders read a high number as a sign you are stretched, and your score falls — even if you always pay on time. Try to stay under about a third.",
      2: "Credit utilisation is the balance on your revolving credit divided by the total limit available. It is one of the largest inputs to a CIBIL score and, unlike payment history, it is recalculated every cycle — so it can be fixed quickly. Utilisation above roughly 30% starts to cost you; above 70% it costs you sharply.",
      3: "Utilisation is the ratio of revolving balances to aggregate limits, weighted both per-account and in aggregate by most scoring models. It is treated as a proxy for repayment pressure rather than default history, which is why it is memoryless in a way delinquency is not: reducing the reported balance restores the score within one or two reporting cycles.",
    },
  },
  {
    id: "diversification",
    name: "Diversification",
    tier: 2,
    prerequisites: ["opportunity_cost"],
    oneLiner: "Spreading money across different things so one bad outcome cannot ruin you.",
    explanations: {
      1: "Do not put all your money in one place. If that one place fails, you lose everything. Split it up. You cannot know which one wins, but you can make sure no single one can destroy you.",
      2: "Diversification means holding several different investments so a loss in one is cushioned by the others. It reduces risk without reducing your expected return — the only free lunch in finance. Concentration is how people occasionally get rich and routinely get ruined, and you do not get to know in advance which one you are.",
      3: "Because asset returns are imperfectly correlated, a diversified portfolio has lower variance than the weighted average variance of its components. This eliminates idiosyncratic risk at no cost to expected return, leaving only systematic risk — which is the only risk you are compensated for bearing. Concentrated positions therefore carry uncompensated variance by construction.",
    },
  },

  /* ─────────────────────────── tier 3 ─────────────────────────── */
  {
    id: "compounding",
    name: "Compounding",
    tier: 3,
    prerequisites: ["savings_rate"],
    oneLiner: "Returns that earn returns — slow for a long time, then not slow at all.",
    explanations: {
      1: "Money you invest earns a little. Next year, that extra earns too. Over many years this snowballs. It looks like nothing is happening for a long time, and then it is happening very fast. The one thing it needs is time, which is the one thing you have at 23.",
      2: "Compounding is growth applied to previous growth. The curve is flat early and steep late, which is why starting at 23 rather than 33 matters far more than the rate you earn. It also runs in reverse: debt compounds against you, and a 42% credit card compounds monthly.",
      3: "Compound growth is exponential in time and linear in the log of the rate, so horizon dominates rate over realistic ranges. The corollary most people miss is symmetry — unpaid revolving debt compounds at the same mathematics with the sign reversed, and at rates that no investment reliably matches, which is what makes debt repayment the highest-certainty return available to most households.",
    },
  },
  {
    id: "volatility",
    name: "Volatility",
    tier: 3,
    prerequisites: ["diversification"],
    oneLiner: "Prices move, a lot, and that movement is not the same thing as loss.",
    explanations: {
      1: "Investment prices go up and down, sometimes sharply. A fall on the screen is not a loss until you sell. If you sell when it drops, you turn a temporary fall into a permanent one — and you are usually not there when it comes back.",
      2: "Volatility is how much and how quickly prices move. It is the price of admission for higher long-run returns, not a defect. The danger is behavioural: the market's best days cluster immediately after its worst ones, so selling into a fall reliably costs you the recovery. A regular investment plan works best precisely when it feels worst, because a fixed amount buys more units at lower prices.",
      3: "Volatility is the dispersion of returns and, unlike drawdown, is direction-agnostic. The behavioural cost is myopic loss aversion: more frequent evaluation raises the probability of observing a loss, which raises the probability of a liquidation that converts mark-to-market variance into realised loss. Since the distribution of returns is heavily concentrated in a small number of sessions clustered around high-volatility episodes, exit and re-entry are strongly negative in expectation.",
    },
  },
  {
    id: "debt_priority",
    name: "Debt priority",
    tier: 3,
    prerequisites: ["apr", "opportunity_cost"],
    oneLiner: "Clear the most expensive debt first — it is the highest guaranteed return you will ever get.",
    explanations: {
      1: "If your savings earn 3% and your card charges 42%, keeping the savings while carrying the card loses you money every month. Pay off the expensive debt first. Money does not care which pile it is sitting in.",
      2: "Attack debt in order of interest rate, highest first. Paying off a 42% card is a guaranteed, tax-free 42% return — no investment reliably offers that. Treating savings as sacred while a card compounds against you is mental accounting: the same rupee treated as two different rupees because of the label on the account.",
      3: "Repaying debt yields a certain, tax-free return equal to its interest rate, so the optimal ordering is by descending rate — the avalanche — which minimises total interest paid. Preference for the snowball ordering trades measurable cost for adherence, which can be rational for a borrower whose true constraint is persistence. Holding low-yield liquid assets against high-rate revolving debt beyond a prudent buffer is dominated in every case.",
    },
  },
  {
    id: "digital_safety",
    name: "Digital safety",
    tier: 3,
    prerequisites: [],
    oneLiner: "No real bank will ever ask you for an OTP. There is no exception to this.",
    explanations: {
      1: "If someone calls saying money is about to leave your account and they need a code to stop it, it is a scam. Hang up. Call the number printed on your own card. Never read out an OTP, CVV or PIN, and never install an app someone asks you to install over the phone.",
      2: "Fraud works on urgency, not greed — the caller offers to protect you, and the countdown does the rest. Knowing your name and the last four digits of your card proves nothing; that data leaks constantly. The rule has no exceptions: no bank, no RBI official and no police officer will ever ask for an OTP, a CVV, a PIN, or ask you to install software. Report within three days on 1930 or at cybercrime.gov.in.",
      3: "Social engineering targets cognitive load rather than credulity, which is why fraud calls are timed to late hours and framed as loss prevention rather than gain. An OTP is a second authentication factor — disclosing it is functionally a signature on a transaction you cannot see. India's regulatory position limits customer liability for unauthorised electronic transactions where the customer is not negligent and reports within the prescribed window, which makes prompt reporting materially valuable rather than merely procedural.",
    },
  },
];

export const CONCEPTS_BY_ID: Record<string, Concept> = Object.fromEntries(
  CONCEPTS.map((c) => [c.id, c]),
);

export function conceptById(id: string): Concept | undefined {
  return CONCEPTS_BY_ID[id];
}
