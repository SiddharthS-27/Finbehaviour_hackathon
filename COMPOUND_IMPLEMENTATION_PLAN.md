# COMPOUND — Implementation Plan

> **Two years of your money, in twenty minutes.**
> FinBehaviour Hackathon · Problem Statement #4 (absorbing #3, #5, #6, #7)
> Solo build · 12 hours · PWA · Phase-gated

---

## 0. How to use this document — read first, Claude Code

You are building this solo with a human who will manually test at every phase gate.

### Working rules

1. **Stop at every phase gate.** At the end of each phase in §15, print that phase's test checklist and **stop**. Do not begin the next phase until the human says continue.
2. **Never refactor a completed phase** without asking. If a later phase exposes a design flaw, say so explicitly and propose the fix. Do not silently rewrite.
3. **The engine is pure.** Everything under `lib/sim/` must contain no React, no `Math.random()`, no `Date.now()`, no `fetch`, no `window`. Same inputs → same outputs, always. This guarantees the shadow-agent comparison is honest and the demo is reproducible.
4. **All money is integer rupees.** No floats, no paise. Every money-producing expression ends in `Math.round()`. Formatting happens only at render time.
5. **The LLM never computes.** All numbers are calculated in TypeScript and handed to the model as facts. The model writes prose about them. Any prompt containing "calculate", "estimate", or "work out" is a bug.
6. **Every AI surface has an authored fallback**, and the fallback ships *first*. The app must be fully playable with no API key.
7. **Commit at each phase gate** with the message `phase-N: <summary>`.
8. **Write `CLAUDE.md` at repo root in Phase 0** containing rules 3–6, so they survive context compaction.

### The one architectural decision everything depends on

**One engine, four content packs.** Story Mode, Historical Case Study, and Short Bites are *not* separate features. They are three different decks fed to the same `advanceMonth()` function with different configs. Build the engine mode-agnostic in Phase 1 and the extra modes cost 45 minutes each instead of two hours each.

If you find yourself writing a second game loop, stop and ask.

---

## 1. Product overview

### The premise

You are 23, first job in Chennai, ₹42,000 a month. You have 12 months. Every month you decide what to do with your salary, life throws something at you, and the consequences of month 2 arrive in month 11. At the end you see the path you *could* have taken and what the gap cost in rupees.

### The core loop

```
Salary lands → fixed costs auto-deduct → scheduled consequences fire
        ↓
You allocate what's left (spend / emergency / invest / kill debt)
        ↓
LIFE EVENT — a card with 2–4 choices, exactly one provably correct
        ↓
Engine resolves. Coach reacts in two sentences.
        ↓
Your net-worth line moves. The shadow line moves too.
        ↓                        ×12
Final report · Archetype · Costliest decisions · What-if replay
```

### What makes it different (and what to say to judges)

- **Decisions persist and compound.** Skip health insurance in month 2 and the appendicitis in month 11 costs ₹2,15,000 instead of ₹9,000. Buy it but avoid your post in month 7 and the policy lapses — you paid for protection you didn't have.
- **The shadow agent.** A textbook policy plays the *identical* world — same events, same market returns. Two lines, one chart, and the gap is a real number.
- **The bandwidth tax is mechanical, not narrated.** When stress crosses 70, an allocation slider is disabled. The literature calls this an open research gap; you implement it in fifteen minutes.
- **Only provable answers.** Every Story Mode event has one correct choice provable by arithmetic, evidence, or rule. Preference-dependent questions (rent vs. buy) are handled as trade-offs elsewhere, never as right/wrong.

### Problem statement coverage

| PS | Requirement | Where met |
|---|---|---|
| #4 | Simulate real financial situations, AI feedback | Core engine + coach + report |
| #3 | Identify knowledge gaps, recommend content | 3-question diagnostic + behavioural mastery |
| #5 | Personalised learning paths | Concept mastery derived from decisions |
| #6 | 24/7 chatbot assistance | Explainer mode |
| #7 | Gamification, progression | XP, badges, near-death states |

---

## 2. Scope — what ships in 12 hours

### Shipping

| Mode | Content | Engine reuse |
|---|---|---|
| **Onboarding** | Profile + 3-question diagnostic | — |
| **Story Mode** | 12 months, 12 events, First Earner | Full engine |
| **Report + What-if** | Archetype, costliest decisions, replay | Counterfactual re-run |
| **Historical Case Study** | March 2020 COVID crash, 6 months | Same engine, fixed deck |
| **Short Bites** | "Buy a car in 4 months", goal-driven | Same engine, 4-month deck |
| **Explainer** | 14 concepts, tailored to bucket | No engine |

### Not shipping (present as roadmap)

Auth/JWT · other four buckets · multi-lingual · Current Market mode · Quiz mode · leaderboards · database.

**Fake convincingly:** show all five buckets on the start screen with four greyed and labelled "coming soon". Judges read roadmap, not absence.

### Time budget, honestly

Core (Phases 0–8) is ~9.5h and is a complete, demoable product on its own. Phases 9–13 are ~3h and are strictly additive. **If you are behind at hour 9, stop adding modes and polish what exists.** A tight one-mode demo beats three broken ones.

---

## 3. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15**, App Router, TypeScript strict | One repo, API routes co-located, Vercel deploy |
| Styling | **Tailwind v4** + **shadcn/ui** | Fast, non-generic when tokens are set properly |
| State | **Zustand** + `persist` | Survives refresh, no provider tree, offline for free |
| Charts | **Recharts** | LineChart is all you need |
| Motion | **Framer Motion** | Number roll-ups, card deals, badge pops |
| Icons | **lucide-react** | Ships with shadcn |
| LLM | **Google Gemini 2.5 Flash** via free AI Studio key | Free, no card, 1500 req/day. Provider-agnostic adapter. |
| Validation | **Zod** | Validates LLM JSON before it touches state |
| Tests | **Vitest** | Engine only. No component tests. |
| Confetti | **canvas-confetti** | 10 min work, disproportionate payoff |
| Storage | **localStorage** via Zustand persist | No database. Do not add one. |
| PWA | Manifest + hand-rolled service worker | ~15 lines. Do not use next-pwa. |
| Deploy | **Vercel** | HTTPS by default, required for PWA |

### Install

```bash
npx create-next-app@latest compound --typescript --tailwind --app --eslint --no-src-dir --import-alias "@/*"
cd compound
npx shadcn@latest init
npx shadcn@latest add button card dialog progress slider tabs tooltip badge separator scroll-area sonner
npm i zustand recharts framer-motion zod canvas-confetti clsx tailwind-merge
npm i -D vitest @vitest/ui @types/canvas-confetti
```

`.env.local`:
```
GEMINI_API_KEY=            # optional — app works fully without it
```

`package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.

---

## 4. Repository structure

```
compound/
├── CLAUDE.md                     # working rules (Phase 0)
├── app/
│   ├── layout.tsx                # fonts, PWA meta, Toaster, hydration guard
│   ├── manifest.ts               # PWA manifest (Next convention)
│   ├── page.tsx                  # start / mode select
│   ├── onboarding/page.tsx       # profile + diagnostic
│   ├── play/[mode]/page.tsx      # ★ ONE game screen, all three modes
│   ├── report/[mode]/page.tsx    # ★ ONE report screen
│   ├── explainer/page.tsx        # concept library
│   └── api/
│       ├── coach/route.ts
│       ├── report/route.ts
│       └── explain/route.ts
├── lib/
│   ├── sim/                      # ★ PURE — no React, no IO, no randomness
│   │   ├── types.ts
│   │   ├── rng.ts                # mulberry32 + gaussian
│   │   ├── engine.ts             # advanceMonth() — the heart
│   │   ├── pending.ts            # ★ scheduled-effect queue (CRITICAL)
│   │   ├── effects.ts            # Effect + Condition evaluation
│   │   ├── metrics.ts            # netWorth, health, runway, CIBIL
│   │   ├── deck.ts               # deck assembly + gating
│   │   ├── agent.ts              # shadow optimal policy
│   │   ├── counterfactual.ts     # what-if replay
│   │   ├── mastery.ts            # concept mastery from decisions
│   │   ├── gamify.ts             # XP, badges
│   │   └── __tests__/
│   ├── ai/
│   │   ├── provider.ts           # ★ provider-agnostic generate()
│   │   ├── prompts.ts
│   │   ├── schemas.ts            # Zod
│   │   └── fallbacks.ts          # authored deterministic text
│   ├── store.ts                  # Zustand — the only stateful thing
│   ├── profile.ts                # buckets, scaling, diagnostic
│   └── format.ts                 # ₹ formatting, lakh/crore, deltas
├── content/
│   ├── packs/
│   │   ├── story-first-earner.ts   # 12 events
│   │   ├── historical-covid.ts     # 6 events
│   │   └── bites-car.ts            # 4 events
│   ├── concepts.ts               # 14 concepts
│   └── diagnostic.ts             # 3 questions
├── components/
│   ├── game/
│   │   ├── TimelineRibbon.tsx    # ★ signature element
│   │   ├── StatBars.tsx
│   │   ├── AllocationPanel.tsx
│   │   ├── EventCard.tsx
│   │   ├── PressureLayer.tsx     # ★ timers, tickers, headlines
│   │   ├── MonthResult.tsx
│   │   └── CoachBubble.tsx
│   ├── charts/NetWorthChart.tsx
│   └── report/…
└── public/
    ├── sw.js                     # service worker
    └── icon-192.png, icon-512.png
```

**Dependency rule:** `lib/sim/` may import only from `lib/sim/` and `content/`. If it ever imports React, something has gone wrong.

---

## 5. Design system

The subject is **a bank passbook that's alive** — rows of months, each one stamped, accruing. Not a neobank dashboard. Lean into the ledger.

### Tokens — put these in `globals.css` in Phase 0

```css
:root {
  --ink:      #0F1D1B;   /* page background — deep teal-black */
  --surface:  #162926;   /* raised panels */
  --surface2: #1E3833;   /* hover, inset rows */
  --line:     #2C4A44;   /* hairlines, always 1px */
  --chalk:    #E8E2D4;   /* primary text, warm off-white */
  --muted:    #8AA39D;   /* secondary text */
  --marigold: #E9A63C;   /* YOU — your money, your line, primary CTA */
  --mint:     #6FC79A;   /* OPTIMAL — the shadow agent's line */
  --rust:     #C4573A;   /* DEBT — what you owe, losses, danger */
  --violet:   #8B7CC8;   /* the AI coach's voice — never used for data */
}
```

**The colour rule, absolute:** marigold is you, mint is the optimal path, rust is debt. These three never mean anything else anywhere in the app. Colour carries data, not decoration.

### Type

- **Display** — `Fraunces` (variable, wght 700, SOFT 40, WONK 1). Headings, month numbers, archetype name. Large sizes only, tight tracking.
- **Body** — `Instrument Sans`. All prose, labels, buttons.
- **Numerals** — `IBM Plex Mono`, tabular figures, for **every rupee amount without exception**. Money that jitters while animating is money you can't read. Functional, not decorative.

Load all three via `next/font/google`.

### The signature element — Timeline Ribbon

A full-width strip below the header, 12 cells (one per month). Past months filled marigold-tinted, current month glowing, future months hairline outlines. Event category drops a coloured pip on its cell. **The net-worth chart sits directly beneath and shares the same x-coordinate space**, so the ribbon *is* the chart's axis. On the report page, tapping a ribbon cell triggers the what-if replay for that month.

Spend all your boldness here. Everything else stays quiet: flat panels, 1px hairlines, no gradients, no glass, no drop shadows, `border-radius: 4px` maximum.

### Motion — exactly four moments

1. Money numbers roll up when they change (Framer Motion counter).
2. Event card deals in from the right with slight rotation, settles.
3. Badge unlock: scale pop + confetti.
4. **The near-death transition** — screen desaturating into critical, and recolouring on recovery. This one is the emotional peak; give it 600ms and an ease-out.

Nothing else animates. Honour `prefers-reduced-motion` by swapping all of it for opacity fades and disabling confetti.

### Copy voice

Blunt, warm, second person, present tense. "You skipped the SIP this month." Not "The user has elected to forgo." Sentence case everywhere. Errors state what happened and what to do next.

### Mobile-first — this is a PWA

Design the 380px layout first, then widen. Single column: ribbon pinned top → stat bars as a 2×2 grid → event card → allocation sliders → advance button. Sliders need ≥44px touch targets. Use `env(safe-area-inset-bottom)` so the advance button clears the home indicator.

---

## 6. Domain model

All in `lib/sim/types.ts`.

```ts
export type Rupees = number;   // integer, always

// ─────────── profile ───────────
export type LifeStage = 'student' | 'first_earner' | 'young_pro' | 'family' | 'pre_retirement';
export type IncomeTier = 'low' | 'mid' | 'high';
export type LiteracyLevel = 1 | 2 | 3;   // 1 = plainest language, 3 = assumes fluency

export interface Profile {
  name: string;
  lifeStage: LifeStage;        // → selects which content pack
  incomeTier: IncomeTier;      // → scales every ₹ in the pack
  literacyLevel: LiteracyLevel;// → controls explanation depth
  location: string;
  dependents: number;
  supportsParents: boolean;
}

// ─────────── debt ───────────
export type DebtKind = 'credit_card' | 'personal_loan' | 'education_loan' | 'emi' | 'family';

export interface Debt {
  id: string;
  label: string;
  kind: DebtKind;
  principal: Rupees;
  apr: number;               // 0.42 = 42% annual
  minPaymentPct: number;
  minPaymentFloor: Rupees;
  limit?: Rupees;            // credit cards — for utilisation
}

export interface Portfolio {
  value: Rupees;             // current market value
  invested: Rupees;          // total ever contributed
}

// ─────────── the world ───────────
export interface SimState {
  seed: number;
  packId: string;
  month: number;             // 1-indexed
  totalMonths: number;       // 12 story, 6 historical, 4 bites
  age: number;

  monthlyIncome: Rupees;
  fixedExpenses: Rupees;

  cash: Rupees;
  emergencyFund: Rupees;
  portfolio: Portfolio;
  debts: Debt[];

  insuranceHealthPremium: Rupees;   // 0 = not active
  insuranceTermPremium: Rupees;
  creditScore: number;       // 300..900
  stress: number;            // 0..100

  flags: string[];
  pending: PendingEffect[];  // ★ scheduled consequences
  subscriptions: Subscription[];

  xp: number;
  badges: string[];
  streak: number;

  history: MonthRecord[];
}

// ★ THE MECHANISM EVERYTHING DEPENDS ON
export interface PendingEffect {
  fireMonth: number;
  effects: Effect[];
  sourceEventId: string;     // so the report can trace it back
  note: string;              // "The phone EMI you took in month 3 is due."
}

export interface Subscription {
  id: string; label: string; monthlyCost: Rupees; startedMonth: number;
}

export interface Allocation {
  discretionarySpend: Rupees;
  toEmergencyFund: Rupees;
  toInvest: Rupees;
  extraDebtPayment: Rupees;
  extraDebtTargetId: string | null;   // null = highest APR
}

export interface MonthRecord {
  month: number;
  incomeReceived: Rupees;
  fixedPaid: Rupees;
  premiumsPaid: Rupees;
  subscriptionsPaid: Rupees;
  debtMinimumsPaid: Rupees;
  pendingFired: string[];          // notes from resolved PendingEffects
  allocation: Allocation;
  eventId: string;
  choiceId: string;
  wasOptimalChoice: boolean;
  marketReturn: number;
  missedPayment: boolean;
  netWorthEnd: Rupees;
  healthScoreEnd: number;
  stressEnd: number;
  notes: string[];
}

// ─────────── events ───────────
export type ProofType = 'ARITHMETIC' | 'EVIDENCE' | 'RULE';
export type EventCategory = 'emergency' | 'opportunity' | 'social' | 'career'
                          | 'market' | 'temptation' | 'digital';

export type PressureType = 'headline' | 'ticker' | 'chart' | 'timer'
                         | 'testimonial' | 'notification' | 'dim' | 'prefill';

export interface PressureBeat {
  type: PressureType;
  content: string;
  delayMs: number;          // beats arrive in sequence to build pressure
  meta?: Record<string, unknown>;   // timer seconds, chart data, etc.
}

export interface EventCard {
  id: string;
  month: number;            // fixed slot in the pack — decks are authored, not rolled
  title: string;
  body: string;
  category: EventCategory;
  concept: string;          // concept id, for mastery
  proofType: ProofType;
  biases: string[];         // for bias-profile diagnosis in the report

  gate?: EventGate;         // if unmet, month runs with no event
  pressure: PressureBeat[];
  choices: Choice[];
  correctChoiceId: string;  // exactly one

  debrief: {
    opening: string;        // names the manipulation used on them
    proof: string;          // the arithmetic / evidence / rule
    rule: string;           // the portable takeaway
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
  visualWeight: 'primary' | 'normal' | 'muted';  // ★ wrong choice is often 'primary'
  requires?: Condition;
  blockedReason?: string;
  immediate: Effect[];
  delayed: { monthsLater: number; effects: Effect[]; note: string }[];
  fallbackNote: string;      // deterministic coach line if AI unavailable
}

// ─────────── effects ───────────
export type Effect =
  | { kind: 'cash';              amount: Rupees }
  | { kind: 'emergencyFund';     amount: Rupees }
  | { kind: 'portfolioAdd';      amount: Rupees }
  | { kind: 'portfolioMultiply'; factor: number }
  | { kind: 'debtAdd';           debt: Omit<Debt, 'id'> & { id?: string } }
  | { kind: 'debtPay';           debtId: string | null; amount: Rupees }
  | { kind: 'incomeMultiply';    factor: number }
  | { kind: 'expenseDelta';      amount: Rupees }
  | { kind: 'stress';            amount: number }
  | { kind: 'creditScore';       amount: number }
  | { kind: 'flagAdd';           flag: string }
  | { kind: 'flagRemove';        flag: string }
  | { kind: 'insurance';         policy: 'health' | 'term'; premiumMonthly: Rupees }
  | { kind: 'subscriptionAdd';   sub: Omit<Subscription, 'startedMonth'> }
  | { kind: 'xp';                amount: number };

export type Condition =
  | { op: 'hasFlag';   flag: string }
  | { op: 'lacksFlag'; flag: string }
  | { op: 'minCash';   amount: Rupees }
  | { op: 'minLiquid'; amount: Rupees }
  | { op: 'and'; all: Condition[] }
  | { op: 'or';  any: Condition[] }
  | { op: 'not'; cond: Condition };

// ─────────── content pack ───────────
export interface ContentPack {
  id: string;
  mode: 'story' | 'historical' | 'bites';
  title: string;
  subtitle: string;
  lifeStages: LifeStage[];
  totalMonths: number;
  initialState: Omit<SimState, 'seed' | 'history' | 'pending' | 'month'>;
  events: EventCard[];              // indexed by month
  marketReturns?: number[];         // historical mode uses REAL returns
  goal?: { label: string; targetRupees: Rupees };   // bites mode
  epilogue?: string;                // historical mode: what actually happened
}

export interface Concept {
  id: string;
  name: string;
  oneLiner: string;
  explanations: Record<LiteracyLevel, string>;   // ★ three depths, authored
  prerequisites: string[];
  tier: 1 | 2 | 3;
}
```

---

## 7. The engine

`lib/sim/engine.ts` — the most important file in the project. Build and test it before any UI exists.

### Signature

```ts
export function advanceMonth(
  state: SimState,
  allocation: Allocation,
  event: EventCard | null,      // null = no event this month (gate unmet)
  choiceId: string | null,
  marketReturn: number,         // passed in, never generated here
): { state: SimState; record: MonthRecord };
```

Returns a **new** state. Never mutates. `marketReturn` is injected so the shadow agent faces an identical market.

### Order of operations — implement exactly this

Order is pedagogical. Interest accrues *after* payments, so paying down debt this month actually helps this month.

```
 1. VALIDATE
      allocation values ≥ 0; sum ≤ availableDiscretionary(state)
      → violation throws. A throw means a UI bug; surface it loudly in dev.

 2. INCOME            cash += monthlyIncome

 3. FIXED EXPENSES    cash -= fixedExpenses

 4. PREMIUMS          cash -= insuranceHealthPremium + insuranceTermPremium

 4.5 ★ RESOLVE PENDING   ← THE CRITICAL STEP
      for p of pending where p.fireMonth === month:
        applyEffects(p.effects)
        record.pendingFired.push(p.note)
      pending = pending.filter(p => p.fireMonth !== month)

 4.6 SUBSCRIPTIONS    cash -= sum(subscriptions.monthlyCost)

 5. DEBT MINIMUMS   (ascending APR order, for determinism)
      due = clamp(principal * minPaymentPct, minPaymentFloor, principal)
      if cash >= due:  cash -= due; principal -= due
      else:            missedPayment = true
                       creditScore -= 45; stress += 8
                       paid = max(0, cash); cash -= paid; principal -= paid

 6. ALLOCATION
      cash -= discretionarySpend;  stress -= min(12, floor(spend / 2000))
      cash -= toEmergencyFund;     emergencyFund += toEmergencyFund
      cash -= toInvest;            portfolio.value += toInvest
                                   portfolio.invested += toInvest
      cash -= extraDebtPayment
        target = extraDebtTargetId ?? highest-APR debt with principal > 0
        applied = min(extraDebtPayment, target?.principal ?? 0)
        target.principal -= applied
        cash += (extraDebtPayment - applied)     // refund, never destroy money

 7. EVENT RESOLUTION
      if event && choiceId:
        applyEffects(choice.immediate)
        for d of choice.delayed:
          pending.push({ fireMonth: month + d.monthsLater,
                         effects: d.effects, sourceEventId: event.id, note: d.note })

 8. DEBT INTEREST
      for debt with principal > 0: principal += round(principal * apr / 12)
      remove debts where principal <= 0 → note "Cleared: {label}", creditScore += 15

 9. MARKET
      portfolio.value = max(0, round(portfolio.value * (1 + marketReturn)))
      (portfolioMultiply effects from step 7 apply here, multiplicatively)

10. OVERDRAFT
      if cash < 0:
        push Debt { label:'Overdraft', kind:'personal_loan', apr:0.36,
                    principal:-cash, minPaymentPct:0.10, minPaymentFloor:1000 }
        cash = 0; creditScore -= 20; stress += 10
      // NOT a game over. Recovery arcs demo better than fail states.

11. DERIVED
      stress = clamp(stress - 4, 0, 100)              // baseline decay
      if runwayMonths < 1: stress += 6
      if allDebtsPaidOnTime: creditScore += 6
      if ccUtilisation > 0.70: creditScore -= 25
      creditScore = clamp(creditScore, 300, 900)
      if stress >= 85 && !hasFlag('burnt_out'):
        flagAdd('burnt_out'); monthlyIncome = round(monthlyIncome * 0.90)
      if stress <= 40 && hasFlag('burnt_out'):
        flagRemove('burnt_out'); monthlyIncome = round(monthlyIncome / 0.90)

12. GAMIFICATION
      xp += 10 + (wasOptimal ? 15 : 0) + (savingsRate > 0.2 ? 5 : 0)
      streak = savingsRate > 0 ? streak + 1 : 0
      evaluate badge predicates

13. COMMIT
      build MonthRecord, push to history, month += 1
```

### Metrics — `lib/sim/metrics.ts`

```ts
netWorth(s)       = s.cash + s.emergencyFund + s.portfolio.value - sum(debts.principal)
monthlyOutflow(s) = s.fixedExpenses + premiums(s) + subscriptions(s) + sum(minPayments(s))
runwayMonths(s)   = monthlyOutflow(s) === 0 ? 99 : (s.cash + s.emergencyFund) / monthlyOutflow(s)
availableDiscretionary(s) = max(0, s.monthlyIncome - s.fixedExpenses - premiums(s)
                                   - subscriptions(s) - sum(minPayments(s)))
savingsRate(rec)  = rec.incomeReceived === 0 ? 0
                  : (toEmergencyFund + toInvest + extraDebtPayment) / incomeReceived
highInterestDebt(s) = sum(principal where apr > 0.12)
```

**Financial health score, 0–100** — the headline number, so make it move meaningfully:

```
runwayPts  = min(25, (runwayMonths / 6) * 25)
debtPts    = 25 * (1 - min(1, highInterestDebt / max(1, monthlyIncome * 3)))
savingsPts = min(20, (trailing3MonthSavingsRate / 0.30) * 20)
growthPts  = min(15, (portfolio.value / max(1, monthlyIncome * 6)) * 15)
coverPts   = (healthInsured ? 8 : 0) + (termInsured ? 7 : 0)
score      = round(clamp(sum, 0, 100))
```

Bands: 0–24 *Fragile* · 25–49 *Shaky* · 50–69 *Steady* · 70–84 *Solid* · 85–100 *Compounding*.

### Randomness — `lib/sim/rng.ts`

```ts
export function mulberry32(seed: number): () => number
export function gaussian(rand: () => number, mean: number, sd: number): number

export function rollMarket(seed: number, months: number): number[] {
  const r = mulberry32(seed ^ 0x9E3779B9);
  const out = Array.from({length: months}, () => clamp(gaussian(r, 0.009, 0.040), -0.18, 0.18));
  const crash = 8 + Math.floor(r() * 2);        // month 8 or 9 in a 12-month run
  if (crash < months)     out[crash - 1] = -0.14 - r() * 0.04;
  if (crash < months - 1) out[crash]     =  0.03 + r() * 0.04;
  return out;
}
```

The scripted correction guarantees every run — including the one on stage — contains a moment where the player panics. **Historical mode overrides this entirely with real returns from the pack.**

---

## 8. Content packs

### 8.1 Story pack — First Earner, 12 months

Initial state: age 23, Chennai, ₹42,000/month take-home, ₹26,000 fixed, ₹12,000 cash, education loan ₹1,80,000 @ 9%, no insurance, no portfolio, CIBIL 720, stress 20.

| M | Event | Concept | Sets | Gate | Links to |
|---|---|---|---|---|---|
| 1 | First salary | budgeting | — | — | tutorial |
| 2 | **Health insurance ₹950/mo** | insurance | `health_insured` | — | **→ M11** |
| 3 | **Phone dies / no-cost EMI** | apr | `has_card_debt` | — | **→ M8** |
| 4 | **Seven free trials** | recurring_cost | subscriptions | — | → ambient |
| 5 | **The Sure Thing** | diversification | `concentrated`/`diversified` | — | **→ M9** |
| 6 | **The raise, +22%** | lifestyle_creep | `lifestyle_creep` | — | → M9, M11 |
| 7 | **Three sealed envelopes** | avoidance | ⚠️ **removes `health_insured`** | — | **→ M11** |
| 8 | **Minimum due** | anchoring | — | needs `has_card_debt` | ← M3 |
| 9 | **Market correction −14%** | volatility | — | — | ← M5 |
| 10 | **2 a.m. scam call** | digital_safety | — | `minStress: 45` | ← stress |
| 11 | **Appendicitis** | emergency_fund | — | — | **← M2, M7** |
| 12 | **Debt vs. invest** | debt_priority | — | — | wrap |

**The seven interconnections:**
1. M2 → M11 — insured ₹9,000, uninsured ₹2,15,000
2. M7 → M11 — avoid the envelopes, the policy lapses, you paid and weren't covered
3. M3 → M8 — no phone EMI means the minimum-due event never fires (gate)
4. M5 → M9 — concentrated loses 68%, diversified loses 11% and recovers
5. M6 → M11 — lifestyle creep raises the fixed floor, cutting runway, worsening M11 options
6. stress → M10 — the scam only fires above stress 45; scammers target depleted bandwidth
7. M4 → report — ₹2,140/month invisible drain, surfaced only at the end

Full event copy, pressure beats, choices and debriefs: see the companion `STORY_MODE_EVENTS.md`. Author events 01–14 from it, keeping exactly one `correctChoiceId` each.

### 8.2 Historical pack — March 2020, 6 months

**Same engine. Real market returns. A fixed, non-random deck.** Nifty fell roughly 38% peak-to-trough in Feb–March 2020, then recovered to pre-crash levels within about eleven months.

```ts
marketReturns: [-0.23, -0.06, +0.14, +0.08, +0.03, +0.05]   // Mar–Aug 2020, approximate
```

Six events: salary-cut announcement · SIP continue-or-pause · panic headlines · sell-everything temptation at the bottom · emergency-fund test · the recovery.

**The epilogue is the whole point.** After month 6, before the report: *"Here's what actually happened."* Show the real Nifty chart through 2021 alongside the player's decisions. Anyone who sold in month 2 sees exactly what it cost. Label the epilogue clearly as a historical record, not a prediction.

Choose one alternative if you prefer more distinctiveness: 2016 demonetisation. COVID is recommended — more people remember it, and it reuses Event 05's lesson.

### 8.3 Short Bites pack — "Buy a car", 4 months

`goal: { label: 'Buy a car', targetRupees: 350000 }`

Four events, each surfacing a hidden cost: sticker vs. on-road (registration, insurance, accessories) · the EMI-versus-total-cost framing · running costs (fuel, parking, service) · depreciation. Success = reaching the goal *without* wrecking runway or taking high-APR debt.

Progress bar toward the goal replaces the shadow line. Five minutes to play. This is the mode for low-attention-span users, and it's the easiest to demo on a phone.

### 8.4 Concepts — `content/concepts.ts`

14 concepts, each with **three authored explanation depths**:

```ts
{
  id: 'diversification',
  name: 'Diversification',
  tier: 2,
  prerequisites: ['risk'],
  oneLiner: 'Spreading money across different things so one bad outcome cannot ruin you.',
  explanations: {
    1: "Do not put all your money in one place. If that one place fails, you lose everything. Split it up.",
    2: "Diversification means holding several different investments so that a loss in one is cushioned by others. It reduces risk without reducing your expected return — the only free lunch in finance.",
    3: "Because asset returns are imperfectly correlated, a diversified portfolio has lower variance than the weighted average variance of its components. This reduces idiosyncratic risk at no cost to expected return; only systematic risk remains, which is what you are compensated for bearing."
  }
}
```

Tier 1: `budgeting`, `emergency_fund`, `savings_rate`, `apr`, `insurance`
Tier 2: `diversification`, `credit_utilisation`, `opportunity_cost`, `lifestyle_creep`, `anchoring`
Tier 3: `compounding`, `volatility`, `debt_priority`, `digital_safety`

### 8.5 Diagnostic — `content/diagnostic.ts`

Three questions at onboarding, framed as *"Quick check — no wrong answers, this just helps us pitch things right."* Adapted from Lusardi & Mitchell's Big Three, localised to rupees.

1. **Compound interest** — ₹100 in an account at 2%/year. After 5 years, with nothing withdrawn: more than ₹110 / exactly ₹110 / less than ₹110 / not sure
2. **Inflation** — account pays 1%/year, inflation is 2%/year. After a year you can buy: more / the same / less / not sure
3. **Diversification** — "Buying one company's stock is usually safer than buying a mutual fund." True / False / Not sure

Scoring → `literacyLevel`: 0–1 correct → 1 · 2 correct → 2 · 3 correct → 3.

**Then let it adapt.** If the player answers diagnostic questions correctly but makes suboptimal choices in-game, the report says so explicitly — that gap *is* the theory–practice gap, and naming it is a differentiator: *"You knew diversification. You still went all in. That's the gap this whole app exists to close."*

---

## 9. Onboarding and profile scaling

### Flow

1. Name (single field)
2. Life stage — five cards, **First Earner active, four greyed "coming soon"**
3. Income band — three ranges, plain language ("under ₹25k", "₹25k–₹60k", "over ₹60k")
4. Location (text, prefilled from a simple guess, no API)
5. Dependents / supports parents (two toggles)
6. Diagnostic (3 questions, ~20 seconds)
7. → mode select

### Scaling — `lib/profile.ts`

Income tier multiplies every rupee in the pack. Do **not** author separate content.

```ts
const TIER_MULTIPLIER: Record<IncomeTier, number> = { low: 0.55, mid: 1.0, high: 2.2 };

export function scalePack(pack: ContentPack, tier: IncomeTier): ContentPack
// walks initialState + every Effect with a rupee amount, multiplies, rounds to nearest 100
```

Literacy level does **not** touch numbers. It selects `concept.explanations[level]` and sets a tone parameter in the AI prompt.

**Never ask "are you educated?"** — the diagnostic infers it. This is both more accurate and not insulting.

---

## 10. AI layer — provider-agnostic, fallback-first

### The adapter — `lib/ai/provider.ts`

```ts
import 'server-only';

export async function generate(opts: {
  system: string; user: string; maxTokens: number; temperature: number;
  signal?: AbortSignal;
}): Promise<string | null>            // null = unavailable, caller uses fallback
```

Implementation: if `process.env.GEMINI_API_KEY` is absent, **return null immediately** — no network call. Otherwise POST to the Gemini `generateContent` endpoint with `gemini-2.5-flash`, a 6-second `AbortController` timeout, and a try/catch returning null on any failure.

Swapping providers later means editing this one file. Groq, OpenRouter and Anthropic all fit the same shape.

### Three call sites

**1. `POST /api/coach`** — fires after each month resolves. Non-blocking; the month advances immediately and the bubble fills in when it lands.

Request carries only computed facts: `month, eventTitle, choiceLabel, wasOptimal, optimalChoiceLabel, netWorthDelta, runwayMonths, healthBand, highInterestDebt, stress, literacyLevel, recentPattern`.

System prompt:
```
You are a blunt, warm personal finance coach in India, speaking to a 23-year-old
in their first job.

Absolute rules:
- Two sentences. Maximum 45 words. No greeting, no sign-off.
- Use ONLY the numbers given. Never compute, estimate, or invent a figure.
- If the choice was suboptimal, name the better option and the mechanism.
- Never say "great job" without naming the specific thing that was good.
- Indian context: rupees, SIP, EMI, CIBIL. No dollars, no 401k.
- Second person, present tense, sentence case.
- literacyLevel 1 means short words and no jargon; 3 may use standard terms.
```

Fallback: `choice.fallbackNote`, authored on every choice. Ship this first.

**2. `POST /api/report`** — one call, returns strict JSON validated by Zod.

```ts
z.object({
  archetype: z.object({ name: z.string().max(28), tagline: z.string().max(80),
                        description: z.string().max(400) }),
  costliestDecisions: z.array(z.object({
    month: z.number(), what: z.string().max(160),
    costRupees: z.number(), lesson: z.string().max(200) })).length(3),
  strengths: z.array(z.string().max(120)).min(1).max(3),
  nextConcepts: z.array(z.object({ id: z.string(), why: z.string().max(140) })).length(3),
  closingLine: z.string().max(160),
})
```

Rules in prompt: raw JSON only, no markdown fences, no preamble; `costRupees` copied verbatim from input; `nextConcepts[].id` chosen from the supplied concept list.

Parsing: strip ```` ``` ```` fences defensively → `JSON.parse` in try/catch → `safeParse` → on any failure, deterministic template.

Fallback archetype rules (`lib/ai/fallbacks.ts`):
```
gap < 5%                           → "The Textbook"
health ≥ 70 && optimal ≥ 8/12      → "The Cautious Compounder"
ended with high-interest debt       → "The Interest Payer"
high savings, low portfolio        → "The Hoarder"
runway < 1 at any point            → "The Tightrope Walker"
top-quartile discretionary spend   → "The Present-Tense Spender"
avoided ≥ 2 envelopes in M7        → "The Ostrich"
```

**3. `POST /api/explain`** — Explainer mode. Show `concept.explanations[literacyLevel]` **instantly** from local content, then optionally expand with AI below it. Cache by concept id in a session `Map`. Works fully offline.

### Non-negotiable

**Test the whole app with `GEMINI_API_KEY` deliberately removed at the end of Phase 8.** If it plays start to finish and produces a report, you cannot be embarrassed on stage.

---

## 11. Near-death states and the bandwidth tax

Four bars, always visible: **cash runway · debt · stress · CIBIL**.
(Deliberately dropped: "surrounding people happiness" — a second economy to balance, and you don't have the hours.)

No game over. Critical states make the UI hostile and recovery is the story.

| Trigger | Effect | Why |
|---|---|---|
| runway < 1 month | Screen desaturates ~40%. Persistent rust banner. | Dread without ending the run |
| stress > 70 | ⚡ **One allocation slider disabled** — engine picks which, deterministically | Bandwidth tax made mechanical. This is your research-gap claim. |
| stress > 85 | ⚡ 20-second countdown appears on all choices | Forces System 1, which is the point |
| debt > 3× monthly income | ⚡ Toast notification every ~8s: *"₹X outstanding"* | The real psychological pressure of debt |
| CIBIL < 600 | Credit choices render disabled with reason shown | Consequence visible before it's needed |

**Recovery transition:** climbing out of critical restores colour over 600ms, stops notifications, re-enables the slider. Award the `Comeback` badge. This is the emotional peak of a good run — give it the animation budget.

Disable all of the above under `prefers-reduced-motion` except the functional slider lock.

---

## 12. Shadow agent, counterfactuals, what-if

### Shadow agent — `lib/sim/agent.ts`

Runs the identical pack and market at game start; store `netWorthByMonth` and **reveal only up to the current month** (revealing the future spoils the game).

Allocation ladder, evaluated top-down:
```
avail = availableDiscretionary(state) - 3000   // agent spends ₹3k; a monk isn't a fair benchmark
1. runway < 1        → 100% emergency fund
2. any debt apr > 12% → 100% extra payment to highest APR
3. runway < 6        → 70% emergency, 30% invest
4. else              → 20% emergency, 80% invest
```
Event policy: pick `correctChoiceId`; if its `requires` is unmet, take the first satisfiable choice.

Do not build a search or an LLM agent. Authored correct answers are reliable, instant, and explainable on stage: *"the benchmark is a textbook policy — emergency fund, then avalanche the debt, then invest."*

### What-if replay — `lib/sim/counterfactual.ts`

Not precomputed (12 events × 3 choices ≈ 531,441 paths). Computed on demand:

```ts
export function whatIf(run: RunLog, month: number, altChoiceId: string): Rupees {
  let cur = clone(run.states[month - 1]);
  for (let m = month; m <= run.totalMonths; m++) {
    const choice = m === month ? altChoiceId : run.records[m-1].choiceId;
    cur = advanceMonth(cur, run.records[m-1].allocation,
                       run.deck[m-1], choice, run.market[m-1]).state;
  }
  return netWorth(cur) - run.finalNetWorth;
}
```

12 engine steps, sub-millisecond. Same deck, same market, same subsequent choices — only the one decision differs. That isolation is what makes the number honest.

**UI:** the timeline ribbon on the report page is tappable. Tap month 5 → "What if you'd diversified?" → the alternate line draws over yours with the delta in rupees.

**Costliest decisions:** run `whatIf` for every month with the correct choice substituted, rank descending, take the top 3, hand the computed numbers to the LLM as facts.

---

## 13. PWA layer

**`app/manifest.ts`** — `name: 'Compound'`, `display: 'standalone'`, `background_color: '#0F1D1B'`, `theme_color: '#0F1D1B'`, `orientation: 'portrait'`, 192 and 512 icons (512 with `purpose: 'maskable'`).

**`public/sw.js`** — ~15 lines. Cache the app shell on install, serve cache-first for static assets. **No dynamic caching needed** — Zustand persist already keeps game state in localStorage, so refresh and offline reopen work with zero service-worker involvement.

**iOS meta in `layout.tsx`** — Safari ignores the manifest for install behaviour:
```html
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<link rel="apple-touch-icon" href="/icon-192.png" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

**Install nudge:** listen for `beforeinstallprompt` (Android/desktop Chrome) → small "Add to home screen" button. iOS has no such event; show a one-line hint instead. Entirely optional — the app is identical whether installed or not.

---

## 14. Edge cases — implement defensively

| # | Situation | Handling |
|---|---|---|
| 1 | Cash negative | Overdraft loan @36%, cash→0. Never a game over. |
| 2 | Income 0 (job loss) | All ratio denominators guard against zero. `savingsRate` returns 0. |
| 3 | Allocation over budget | UI clamps; engine throws. A throw = UI bug. |
| 4 | Extra debt payment > principal | Refund the remainder to cash. Never destroy money. |
| 5 | All debts cleared | Slider disables with "No debt left." Full amount refunded. |
| 6 | Debt hits exactly 0 | Remove from array, note "Cleared", CIBIL +15. |
| 7 | Float creep | `Math.round` on every money expression. **Add a Vitest assertion that every money field is an integer after each of 12 steps.** |
| 8 | Event gate unmet | Month runs with no event. UI shows a quiet "A quiet month." card — do not leave blank space. |
| 9 | Choice `requires` unmet | Render disabled with `blockedReason` visible. Never hide it — *why you can't* is the lesson. |
| 10 | All choices blocked | Every event must have ≥1 choice with no `requires`. **Add a content lint test asserting this across all packs.** |
| 11 | Pending fires after run ends | Discard silently; do not push past `totalMonths`. |
| 12 | Pending references a removed debt | `debtPay` with a missing id becomes a no-op, not a crash. |
| 13 | AI timeout / 500 / rate limit | Fallback text. No error toast for the coach. |
| 14 | AI returns fenced or malformed JSON | Strip fences, `safeParse`, fall back. Console log in dev only. |
| 15 | Player advances before coach returns | `AbortController`; drop the stale response. |
| 16 | Double-tap advance | Disable while `isResolving`; guard in the store action too. |
| 17 | Refresh mid-game | Zustand persist. Store seed, month, history, pending. **Recompute the optimal run from seed on rehydrate — do not persist it.** |
| 18 | SSR hydration mismatch | `useHasHydrated()` hook; render a skeleton until true. **This will bite you otherwise.** |
| 19 | Stale save, older schema | Store `SCHEMA_VERSION`. On mismatch, clear with a toast and restart. |
| 20 | Stress 100 / below 0 | Clamped. Burnout applies once; reverses below 40 restoring income exactly. |
| 21 | CIBIL out of range | Clamped 300–900 after every mutation. |
| 22 | Portfolio negative after shock | `Math.max(0, …)`. |
| 23 | Final month reached | `month = totalMonths + 1`, block advances, route to report. |
| 24 | Report opened with no run | Redirect to start. |
| 25 | Player beats the shadow | Possible via lucky branches. Celebrate loudly, badge it, say so in the report. Don't let it look like a bug. |
| 26 | Shadow beats player hugely | Copy must not shame. "Here's the gap and where it opened" — never "you failed". |
| 27 | Long AI text overflowing | `line-clamp` + max-height on the coach bubble. |
| 28 | 375px phone | Single column tested. 44px touch targets. Safe-area insets. |
| 29 | Offline during judging | Fallbacks make everything playable except AI prose. **Verify with network throttled to offline.** |
| 30 | Timer fires while user is idle | Timer pauses if the tab is hidden (`visibilitychange`). Don't punish someone who alt-tabbed. |

---

## 15. Phase plan

Fourteen phases. **Stop at every gate, print the checklist, wait for the human.**

Phases 0–8 are the core product (~9.5h) and ship as a complete demo on their own. Phases 9–13 are additive, in priority order.

---

### Phase 0 — Scaffold and design system · 45 min
Next.js app, Tailwind v4, shadcn, three fonts via `next/font/google`, colour tokens in `globals.css`, `CLAUDE.md` with rules 3–6, `lib/format.ts` (₹ with lakh/crore, signed deltas, tabular figures), empty route skeletons, `manifest.ts`, `public/sw.js`, iOS meta tags.

**GATE — test manually:**
- [ ] All routes load without error
- [ ] A throwaway swatch page shows all 10 colour tokens correctly
- [ ] All three fonts render (Fraunces heading, Instrument Sans body, Plex Mono numerals)
- [ ] `npm run test` runs (zero tests, exits clean)
- [ ] `formatRupees(125000)` → `₹1,25,000` and `formatRupees(-4200)` → `−₹4,200`
- [ ] On a phone-width viewport, nothing overflows horizontally

---

### Phase 1 — Engine core ★ · 2h · NO UI AT ALL
`types.ts`, `rng.ts`, `effects.ts`, `metrics.ts`, `pending.ts`, `engine.ts`, plus 3 stub events for testing. Full Vitest suite.

**This is the critical path. Everything downstream depends on it.**

**GATE — `npm run test` must be fully green. Required tests:**
- [ ] **Determinism** — same seed + same inputs → byte-identical 12-month output, run twice
- [ ] **Integer money** — every money field is an integer after each of 12 steps
- [ ] **★ Pending scheduler** — an effect queued at month 3 with `monthsLater: 5` fires in month 8, exactly once, and is removed from the queue
- [ ] **★ Pending past end** — an effect scheduled beyond `totalMonths` is discarded without crashing
- [ ] **Overdraft** — negative cash creates a 36% loan and zeroes cash
- [ ] **Debt cleared** — principal reaching 0 removes the debt and adds 15 CIBIL
- [ ] **Overpay refund** — extra payment above principal returns to cash
- [ ] **Zero income** — a month with income 0 produces no NaN anywhere
- [ ] **Clamps** — stress stays 0–100, CIBIL stays 300–900, portfolio never negative
- [ ] **Over-budget allocation** throws

**Do not proceed with a red suite.**

---

### Phase 2 — Story content pack · 1.5h
`content/packs/story-first-earner.ts` — all 12 events with pressure beats, choices, delayed effects, debriefs, authored from `STORY_MODE_EVENTS.md`. Plus `content/concepts.ts` (14 concepts × 3 explanation depths) and `content/diagnostic.ts`.

**GATE:**
- [ ] Content lint test passes: every event has exactly one `correctChoiceId`; every event has ≥1 choice with no `requires`; every `concept` id referenced exists; every `delayed.monthsLater` lands ≤ 12
- [ ] Manually trace the M2→M11 chain in code: buying insurance sets `health_insured`; M11 branches on it
- [ ] Manually trace M7: avoiding the envelopes removes `health_insured`
- [ ] M8 gate: with no `has_card_debt` flag, month 8 produces no event

---

### Phase 3 — Onboarding and profile · 1h
Onboarding flow, five bucket cards (one active, four greyed), income band, diagnostic, `lib/profile.ts` with `scalePack`, Zustand store with persist and `useHasHydrated`.

**GATE:**
- [ ] Complete onboarding end to end; profile persists across a hard refresh
- [ ] Diagnostic scores correctly: 3 right → level 3, 1 right → level 1
- [ ] Selecting "under ₹25k" visibly scales starting salary and all event amounts down
- [ ] Greyed buckets are not clickable and say "coming soon"
- [ ] No hydration warning in the console

---

### Phase 4 — Game loop UI · 2h
`app/play/[mode]/page.tsx`, timeline ribbon, stat bars, allocation panel with linked sliders, event card, month result, advance loop. **Fallback coach text only — no AI yet.**

**GATE:**
- [ ] Play all 12 months start to finish
- [ ] Sliders clamp to available discretionary; "unallocated" readout is correct; advance disabled until fully allocated
- [ ] Blocked choices render disabled with the reason visible
- [ ] Month 8 is skipped (quiet-month card) if you paid cash for the phone in month 3
- [ ] Refresh at month 6 resumes at month 6 with correct state
- [ ] Double-tapping advance does nothing bad
- [ ] Month 12 routes to the report
- [ ] Playable on a 375px viewport with 44px touch targets

---

### Phase 5 — Pressure layer ★ · 1h
`PressureLayer.tsx` — renders `PressureBeat[]` in sequence: headlines, tickers, countdown timers on choice buttons, testimonials, notifications, screen dim, pre-filled inputs. Plus `visualWeight` styling so the wrong choice can be the prettiest button.

**GATE:**
- [ ] Event 01 (diversification): chart, headline, ticker and 45s timer all appear in sequence
- [ ] Timer counts down visibly and pauses when the tab is hidden
- [ ] Event 06 (minimum due): payment field is pre-filled with the minimum, total is small and grey
- [ ] The tempting choice fires confetti and a positive number roll-up
- [ ] `prefers-reduced-motion` disables animation and confetti but keeps timers functional

---

### Phase 6 — Near-death states · 45 min
Four bars, critical thresholds, screen desaturation, notification spam, ⚡ **slider lock at stress > 70**, choice timer at stress > 85, recovery transition, `Comeback` badge.

**GATE:**
- [ ] Force stress above 70 (dev button) → one slider is disabled with a visible reason
- [ ] Force runway below 1 → screen desaturates, banner appears
- [ ] Force debt above 3× income → notifications repeat
- [ ] Recovering from critical restores colour smoothly and re-enables the slider
- [ ] The run never ends early regardless of how bad things get

---

### Phase 7 — Shadow agent and chart · 1h
`agent.ts`, optimal run computed at game start, `NetWorthChart` with both lines revealed only to the current month, ribbon and chart sharing an x-axis.

**GATE:**
- [ ] Two lines render, marigold (you) and mint (optimal)
- [ ] The optimal line never reveals future months
- [ ] Manually choosing all correct answers produces a line close to the shadow
- [ ] `console.time` shows the optimal run completing in under 50ms

---

### Phase 8 — Report and what-if, fallback-first · 1.5h
`counterfactual.ts`, `fallbacks.ts`, report page: archetype, gap annotation in rupees, top-3 costliest decisions, decision grid, mastery chips, badge shelf, tappable ribbon for what-if replay. **Zero AI calls in this phase.**

**GATE — this is the "cannot be embarrassed" gate:**
- [ ] Report renders fully with **`GEMINI_API_KEY` absent from `.env.local`**
- [ ] Counterfactual costs are non-negative and plausible
- [ ] Tapping month 5 on the ribbon draws the alternate line with a rupee delta
- [ ] Archetype rules fire correctly across three playstyles: all-optimal, big spender, and hoarder
- [ ] **Play the entire app with the network throttled to offline. It works.**

**🏁 This is a complete, demoable product. If the clock is short, stop here and polish.**

---

### Phase 9 — AI coach and report · 1h
`provider.ts`, `/api/coach`, `/api/report`, Zod schemas, abort handling, loading states.

**GATE:**
- [ ] With a key: coach text appears within ~2s and is specific to the decision
- [ ] Without a key: fallback text appears instantly, no error, no console noise
- [ ] Kill the network mid-run → fallbacks, no crash
- [ ] Advance rapidly through 5 months → no stale coach bubbles
- [ ] Every rupee figure in AI output also appears in the request payload (no invented numbers)
- [ ] Deliberately return garbage from `/api/report` → template report renders

---

### Phase 10 — Historical case study · 45 min
`content/packs/historical-covid.ts` — 6 events, real market returns array, epilogue screen. Reuses the entire engine and both screens via the `[mode]` route.

**GATE:**
- [ ] Mode selectable from the start screen; plays 6 months on the same engine
- [ ] Market returns are the authored real ones, not `rollMarket`
- [ ] Epilogue shows what actually happened, clearly labelled as historical record
- [ ] Selling at the bottom produces a visibly worse outcome than holding
- [ ] Report page works unmodified for this mode

---

### Phase 11 — Short Bites · 45 min
`content/packs/bites-car.ts` — 4 events, goal target, progress bar replacing the shadow line.

**GATE:**
- [ ] Plays in under 5 minutes
- [ ] Progress bar tracks toward ₹3,50,000
- [ ] Hidden costs (insurance, registration, running costs) surface at the end
- [ ] Reaching the goal via high-APR debt is scored as failure, with the reason given

---

### Phase 12 — Explainer · 30 min
Concept library, chips coloured by mastery (mint mastered / marigold shaky / rust weak / outline unseen), tap to expand `explanations[literacyLevel]` instantly, optional AI expansion below.

**GATE:**
- [ ] All 14 concepts listed; explanation depth matches the diagnostic level
- [ ] Mastery colours reflect actual in-game decisions
- [ ] Works with no API key (local explanations show instantly)
- [ ] Prerequisite ordering holds: no tier-3 concept recommended above a weak tier-1

---

### Phase 13 — Polish and deploy · 45 min
Onboarding overlay (3 steps, dismissible, localStorage flag), empty and error states, mobile pass, install prompt, Vercel deploy, README with the pitch.

**GATE:**
- [ ] Cold load on a real phone over mobile data
- [ ] "Add to home screen" works; app opens full-screen with no browser chrome
- [ ] Full story run in under 6 minutes
- [ ] Deployed URL works in incognito
- [ ] Demo script rehearsed twice, timed

---

## 16. Demo script — 3 minutes

Pre-set a known-good seed. Keep a completed run open in a second tab as insurance.

- **0:00–0:20** — "You're 23, first job in Chennai, ₹42,000 a month. Twelve months. Go." Start a run.
- **0:20–0:50** — Month 2: **decline the health insurance**, deliberately. Say nothing about it.
- **0:50–1:30** — Month 5, the diversification event. Let the countdown, the headline and the ticker run visibly. Go all-in on the stock. Confetti fires. "Feels good."
- **1:30–2:00** — Jump to the pre-played tab at month 9. The correction. The screen is red, notifications are firing. Point at the disabled slider: "Stress is over 70, so the game has taken a slider away. That's the bandwidth tax — it's a documented research gap and we made it mechanical."
- **2:00–2:30** — Month 11. Appendicitis. **₹2,15,000.** Say nothing for two seconds. Then: "There is no correct answer on this screen. The correct answer was month 2."
- **2:30–2:50** — Report. Two lines, the gap in rupees. Tap month 5 on the ribbon → the alternate line draws. "Same market, same events, one different decision. That's what it cost."
- **2:50–3:00** — "Same seed for the benchmark policy. The comparison is honest."

**Your best live moment is the insurance skip.** Set it up in month 2 and let the ₹2,15,000 land on stage unannounced.

---

## 17. Cut list

**Cut in this order if behind:**
1. Explainer AI expansion (keep local explanations)
2. Short Bites
3. Historical case study
4. Install prompt
5. Onboarding overlay
6. Badges beyond three

**Never cut:**
- The `pending` scheduler
- The M2 → M11 insurance chain and the M7 lapse
- Shadow agent + two-line chart
- What-if replay
- Fallback text on every AI surface
- The stress-70 slider lock

**Do not add, no matter how good it sounds at hour 8:** auth, a database, multiplayer, leaderboards, more buckets, more languages, real property APIs, sound design, a second game loop.

**Time checkpoints:** engine green by hour 3 · playable 12 months by hour 6 · report with fallbacks by hour 8 · everything after is upside.
