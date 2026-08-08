# LifeLedger

**Two years of your money, in twenty minutes.**

A financial-literacy simulator for Indian first earners. You get a salary, a slider, and a
deck of authored months. Every decision compounds — the phone EMI you took in month 3 arrives
in month 11 whether you remember it or not — and at the end a shadow agent shows you the line
you *could* have walked, on the same seed, in the same market, facing the same constraints.

> FINBEHAVIOUR 2026 · Team Suns/Pillow Cover · Segment 3 — PS 4

Next.js 15 (App Router) · TypeScript strict · Tailwind v4 · Zustand · PWA · optional Gemini

---

## Table of contents

- [Why this exists](#why-this-exists)
- [Quick start](#quick-start)
- [The core loop](#the-core-loop)
- [What ships today](#what-ships-today)
- [Architecture](#architecture)
- [The engine](#the-engine)
- [Domain model](#domain-model)
- [The shadow agent and what-if replay](#the-shadow-agent-and-what-if-replay)
- [Near-death states and the bandwidth tax](#near-death-states-and-the-bandwidth-tax)
- [The pressure layer](#the-pressure-layer)
- [Content packs](#content-packs)
- [The AI layer](#the-ai-layer)
- [Design system](#design-system)
- [State, persistence and accounts](#state-persistence-and-accounts)
- [PWA](#pwa)
- [Repository map](#repository-map)
- [Testing](#testing)
- [Scripts](#scripts)
- [Working rules](#working-rules)
- [Project documents](#project-documents)
- [Status and roadmap](#status-and-roadmap)

---

## Why this exists

Financial literacy content tells people what an APR is. It does not put them in a room where a
colleague, a countdown and a chart all agree that taking the EMI is fine. LifeLedger does that
second thing.

Three claims it makes, and can defend:

1. **Consequences are delayed on purpose.** A choice schedules effects into a future month
   (`lib/sim/pending.ts`). Present bias cannot be taught by a card that punishes you immediately.
2. **The benchmark is honest.** The comparison line is a textbook policy played by the same engine
   on the same seed against the same market path and the same locked sliders. The only difference
   between the two lines on the chart is the decisions.
3. **The manipulation is encoded, not described.** The wrong choice is often the `primary` button.
   Pressure beats (headline → ticker → testimonial → timer) arrive in sequence, and the debrief
   afterwards *names* the technique that was just used on you.

There is no fail state anywhere. Overdraft becomes a 36% loan and the run continues; recovery arcs
teach better than game overs.

---

## Quick start

```bash
npm install
cp .env.example .env.local     # optional — see below
npm run dev                    # http://localhost:3000
```

Node 20+ recommended (Next 15 + Turbopack).

### The API key is optional, and that is the point

```env
# .env.example
# Optional. The app is fully playable and reportable without it.
GEMINI_API_KEY=
```

With no key, `lib/ai/provider.ts` returns `null` on its first line — **no network request is made
at all**. Every AI surface falls back to authored content that was written first and ships as the
primary path:

| Surface | Fallback when there is no key |
|---|---|
| Coach bubble after each month | `choice.fallbackNote`, authored on every single choice |
| Final report | Deterministic archetype rules in `lib/ai/fallbacks.ts` |
| Concept explainer | `concept.explanations[literacyLevel]`, authored, shown instantly |
| Case-study follow-up box | Keyword-matched authored FAQ answers (`lib/cases.ts`) |

Test the app with the key deliberately removed before any demo.

`GEMINI_BASE_URL` can be set to point the real code path at a local fake or an
OpenAI-compatible proxy.

---

## The core loop

One month, four beats:

```
ALLOCATE          →   EVENT              →   RESOLVE            →   NEXT
sliders over          an authored card       the engine steps       coach line,
what's left           with pressure          the world forward      then month + 1
after fixed costs     beats and choices      (13 ordered stages)
```

- **Allocate** — spend, emergency fund, invest, extra debt payment. The budget is
  `availableDiscretionary(state)`: income minus fixed expenses, premiums, subscriptions and debt
  minimums. Sliders can be *locked* by the state you are in.
- **Event** — the month's card, if its gate is met. Choices can be blocked with a
  `blockedReason`, because *why you can't* is itself the lesson.
- **Resolve** — `advanceMonth()` runs, returning a brand-new state plus a `MonthRecord`.
- **Next** — the coach bubble explains what just happened; the ribbon and the chart extend by
  one month.

After the final month the run routes to `/report/[mode]`.

---

## What ships today

| Surface | Route | What it is |
|---|---|---|
| Title / sign-up / sign-in | `/`, `/signup`, `/signin` | Device-local account, salted + stretched hash |
| Onboarding | `/onboarding` | Profile, income tier, and a 3-question literacy diagnostic |
| Home | `/home` | Mode cards, resume-run card, Quick Bites daily widget |
| Story Mode | `/play/story` | 12 authored months, First Earner pack |
| Report | `/report/story` | Archetype, gap-to-optimal, costliest decisions, what-if replay |
| Case studies | `/case-studies`, `/case-studies/[id]` | GameStop (read) and the Economist decoy (played first, read after) |
| Explainer | `/explainer` | 16 concepts, each written three ways |
| Quick Bites | Home widget | 5 cards a day from an ordered 12-card deck, streak + XP |
| Profile | `/profile` | Profile, diagnostic result, sign-out, reset |
| Swatch | `/swatch` | Design-token reference page |

**Story Mode** is the full 12-month deck. **Quick Bites** is the daily pre-teaching habit — five
swipeable cards, Level Zero fundamentals first, deterministic cursor so tomorrow's five are
genuinely different. **Case studies** are researched and cited; the decoy-pricing one runs the
menu on you before it explains what the menu did.

---

## Architecture

```
                    ┌──────────────────────────────────────┐
   content/         │  packs · concepts · bites · cases    │   authored, typed, linted
                    └───────────────────┬──────────────────┘
                                        │
                    ┌───────────────────▼──────────────────┐
   lib/sim/         │  PURE ENGINE                         │   no React · no Math.random
                    │  engine · effects · pending · deck   │   no Date · no IO
                    │  rng · metrics · bandwidth · gamify  │
                    │  agent (shadow) · counterfactual     │
                    └───────────────────┬──────────────────┘
                                        │
                    ┌───────────────────▼──────────────────┐
   lib/store.ts     │  ZUSTAND + persist (localStorage)    │   the only stateful thing
                    │  account · profile · run · bites     │
                    └───────────────────┬──────────────────┘
                                        │
      components/   ┌───────────────────▼──────────────────┐
      app/          │  React 19 · App Router · Tailwind v4 │
                    └───────────────────┬──────────────────┘
                                        │  (enhancement only)
                    ┌───────────────────▼──────────────────┐
   app/api/*        │  coach · report · case-question      │   never fails; returns null text
   lib/ai/          │  provider · prompts · numbers guard  │   and the fallback stays on screen
                    └──────────────────────────────────────┘
```

**Dependency rule:** `lib/sim/` may import only from `lib/sim/` and `content/`. A React import
inside the engine is a bug, not a shortcut. There is a Vitest scan
(`lib/sim/__tests__/purity.test.ts`) that fails the build if `Math.random`, `Date`, `fetch`,
`window` or `localStorage` appear anywhere under `lib/sim/`.

---

## The engine

`advanceMonth(state, allocation, event, choiceId, marketReturn)` → `{ state, record }`

It returns a **new** state and never mutates its arguments. `marketReturn` is *injected*, never
generated inside — that single decision is what lets the shadow agent face a byte-identical world.

### Order of operations (pedagogical, not arbitrary)

| # | Step | Note |
|---|---|---|
| 1 | Validate | Negative or over-budget allocation throws `EngineError` — a *caller* bug |
| 2 | Income | `cash += monthlyIncome` |
| 3 | Fixed expenses | |
| 4 | Insurance premiums | |
| **4.5** | **★ Resolve pending effects** | Month 3's choice arriving in month 8 |
| 4.6 | Subscriptions | |
| 5 | Debt minimums | Ascending APR, for determinism. A miss costs 45 CIBIL points |
| 6 | Allocation | Spend genuinely relieves stress — that is why it is tempting |
| 7 | Event resolution | Immediate effects apply; delayed effects get scheduled |
| 8 | Debt interest | **After** payments, so paying down debt helps *this* month |
| 9 | Market | Composes multiplicatively with any `portfolioMultiply` shock |
| 10 | Overdraft | Negative cash → a 36% loan, cash → 0. **Never a game over** |
| 11 | Derived | Stress decay, CIBIL, burnout on/off at 85/40 |
| 12–13 | Record, XP, badges, commit | `healthScore` needs this month in history first |

Reordering 6 and 8 would silently teach that paying debt does nothing. Don't.

### Rule: all money is integer rupees

No floats, no paise. Every money-producing expression ends in `Math.round()`.

```ts
portfolio.value = Math.round(portfolio.value * (1 + marketReturn));   // yes
portfolio.value = portfolio.value * (1 + marketReturn);               // bug
```

Formatting — `₹`, lakh/crore, Indian 2-2-3 digit grouping, the U+2212 minus sign — happens **only
at render time**, in `lib/format.ts`. There is a test asserting every money field is an integer
after each of the 12 steps.

### Randomness

`lib/sim/rng.ts` is the only source of randomness in the project: `mulberry32` seeded from the
run seed, with a Box–Muller `gaussian` that consumes exactly two draws per call so the sequence
stays deterministic. `Math.random()` is banned under `lib/sim/`. The run seed itself is taken from
the clock **once**, in the store, at the moment a run starts — and can be passed explicitly for a
reproducible demo.

---

## Domain model

Defined in [lib/sim/types.ts](lib/sim/types.ts). The load-bearing shapes:

```ts
SimState        seed, month, cash, emergencyFund, portfolio, debts[], creditScore,
                stress, flags[], pending[], subscriptions[], xp, badges[], history[]

PendingEffect   { fireMonth, effects, sourceEventId, note }   ★ the mechanism
Allocation      { discretionarySpend, toEmergencyFund, toInvest, extraDebtPayment, target }
MonthRecord     everything that happened in one month, including marketReturn and
                wasOptimalChoice — the report and the chart are built from these

EventCard       { month, title, body, concept, proofType, biases[], gate?,
                  pressure[], choices[], correctChoiceId, debrief }
Choice          { label, visualWeight, requires?, blockedReason?, immediate[],
                  delayed[], fallbackNote }
Effect          cash | emergencyFund | portfolioAdd | portfolioMultiply | debtAdd |
                debtPay | incomeMultiply | expenseDelta | stress | creditScore |
                flagAdd | flagRemove | insurance | subscriptionAdd | xp
```

`PendingEffect` is not optional plumbing. It is how the game teaches present bias: the wrong
choice has to feel good *now* and cost *later*. Delete it and the event library stops working.

`Choice.visualWeight` is where the manipulation lives — the wrong answer being `primary` is
content, not styling.

---

## The shadow agent and what-if replay

**`lib/sim/agent.ts`** plays the identical world: same pack, same seed, same market array, same
gates, same blocked choices, same locked sliders. Its policy is a textbook one — fill the buffer,
avalanche the expensive debt, then invest — and it is deliberately **not** a search and **not** an
LLM. An authored policy is instant, reproducible, and explainable out loud; a beam search would be
a better player and a worse teacher.

The optimal run is **recomputed from the seed on rehydrate, never persisted** — a stale save that
disagreed with the current engine would quietly poison every number in the report. It is memoised
per `packId:incomeTier:seed` in a small module-level cache.

The chart reveals the mint line only up to the current month. Revealing the future spoils the game.

**`lib/sim/counterfactual.ts`** answers "what if I had picked the other thing in month 4?" It is
not precomputed — 12 events with 3 choices each is 531,441 paths — it replays one timeline with a
single decision swapped and everything else held identical, in under a millisecond. When a
substituted choice's `requires` doesn't hold in the replayed timeline, it catches
`REQUIREMENTS_UNMET` and reports that what-if as unavailable rather than crashing the report.

---

## Near-death states and the bandwidth tax

`lib/sim/bandwidth.ts`, pure and in the engine layer, because it changes what the player *can do*
and the shadow agent has to face exactly the same restrictions.

- Runway under 1 month, or stress over 70 → **a slider locks**, and it is generally the lever you
  most need.
- Stress over 85 → the decision gets a countdown.
- The literature describes scarcity taxing cognitive bandwidth and calls the lack of a mechanical
  implementation an open gap. This is that implementation, in about fifteen lines.

The interface gets hostile — desaturation, notification spam about expensive debt, a `bg-scrim/45`
dim — but the run always finishes.

---

## The pressure layer

`PressureBeat`s arrive in timed sequence on top of an event card: `headline`, `ticker`, `chart`,
`timer`, `testimonial`, `notification`, `dim`, `prefill`. Individually each is a nudge; arriving
together they read as confirmation, which is precisely the manipulation being taught. The debrief
afterwards names it, proves it (arithmetic, evidence, or rule) and hands over a portable takeaway.

Reduced motion is honoured — decorative beats become opacity or are dropped, but **timers stay
functional**. A countdown is a game mechanic, not an animation.

---

## Content packs

**One engine, several decks.** Story Mode, the historical case study and Short
Bites are the same `advanceMonth()` with different configs, rendered by the same
`app/play/[mode]/page.tsx` and `app/report/[mode]/page.tsx`. If you find yourself writing a second
game loop, stop.

| Pack | `mode` | Months | Status |
|---|---|---|---|
| `story-first-earner` | `story` | 12 | **Shipped** — 12 authored events, gates, pressure, debriefs |
| Historical — March 2020 | `historical` | 6 | Planned; uses real returns via `pack.marketReturns` |
| Short Bites — "Buy a car" | `bites` | 4 | Planned; goal-driven via `pack.goal` |

Packs register in [content/packs/index.ts](content/packs/index.ts). Home-screen cards for
unregistered packs hide themselves (`packForMode` returns undefined), so nothing links into a
dead route.

Other authored content:

- **[content/concepts.ts](content/concepts.ts)** — 16 concepts, each with three authored
  explanation depths. Literacy level *selects* a depth; it never rewrites a number.
- **[content/bites.ts](content/bites.ts)** — 12 Quick Bites cards (Level Zero fundamentals first),
  some carrying a `demo` that makes you choose before it explains.
- **[content/case-studies.ts](content/case-studies.ts)** — GameStop (`explanation`) and Economist
  decoy pricing (`simulation`), both with sources and authored FAQ answers.
- **[content/diagnostic.ts](content/diagnostic.ts)** — three questions adapted from Lusardi &
  Mitchell's "Big Three", localised to rupees. "Not sure" is an option on every one, on purpose.

### Content lint

`content/__tests__/lint.test.ts` asserts the invariants that keep a deck playable — notably that
**every event has at least one choice with no `requires`**, or the player could be softlocked.
`interconnections.test.ts` checks that concept ids, gates and flags actually connect across files.

### Income scaling

`lib/profile.ts` multiplies every rupee in a pack by the tier (`low` 0.55, `mid` 1.0, `high` 2.2).
One deck, three scales — separate content per tier is not authored. The engine only ever sees the
scaled result.

---

## The AI layer

**The LLM never computes.** Every number is calculated in TypeScript and handed to the model as a
fact. The model writes prose *about* numbers it was given.

That is enforced, not requested. `lib/ai/numbers.ts` scans every response and throws the whole
thing away if it contains a rupee figure that was not in the request payload — a wrong number on
screen is far worse than no generated text, and the authored fallback is already there.

| Route | Payload | Rejection layers |
|---|---|---|
| `POST /api/coach` | month record + pre-computed metrics | Zod shape → invented-number audit |
| `POST /api/report` | run summary, archetype, costliest decisions | JSON parses → Zod + length caps → `costRupees` returned **verbatim** → invented-number audit |
| `POST /api/case-question` | the case's own text and figures | Zod shape → invented-number audit |

All three routes **always return 200**. No key, malformed body, timeout, a 429, a hallucinated
figure — every path returns `{ text: null, source: "fallback" }`, because the caller already has
authored content on screen and the correct behaviour is to leave it there. A missing coach line is
not an error and must never raise a toast.

Other guarantees:

- `lib/ai/merge.ts` lets generated prose replace **words, never numbers**. It never reads a figure
  out of a model reply. A single unusable field keeps its authored version; the rest still merges.
- `lib/hooks/useAi.ts` aborts the previous request and **drops stale answers** — a player
  advancing five months in ten seconds must never see month 2's coach line under month 5's result.
- 6-second timeout. Past that the player has read the fallback and moved on, so a late answer
  would replace text they have already absorbed.
- `lib/ai/provider.ts` is the only file that talks to a model and the only file that reads the
  env. Swapping providers means editing that one file.

Model: `gemini-2.5-flash`.

---

## Design system

**The app is light.** Smoke-white paper, near-black-green ink.

| Token | Hex | Means |
|---|---|---|
| `ink` | `#F4F3ED` | the page — warm smoke white |
| `surface` | `#FCFBF7` | raised panels — *lighter* than the page |
| `chalk` | `#14251C` | body text |
| `muted` | `#566B60` | secondary text · 5.9:1 |
| `marigold` | `#A85400` | **YOU** — your money, your line, primary CTA · 4.8:1 |
| `mint` | `#1E6B47` | **OPTIMAL** — the shadow agent's line · 5.8:1 |
| `rust` | `#B3261E` | **DEBT** — what you owe, losses, danger · 5.9:1 |
| `violet` | `#6B4FBF` | **the coach's voice** — never used for data · 5.4:1 |
| `scrim` | `#14251C` | what modal backdrops are made of |

Those four accents never mean anything else anywhere in the app. **Colour carries data, not
decoration** — that is what keeps the two-line chart meaningful. Every accent clears 4.5:1 against
`ink`, so all four are safe even for the 10px mono eyebrows used throughout.

`--scrim` exists because `bg-ink/70` stopped working when the theme inverted: on white, a white
veil over white hides nothing. Backdrops use `bg-scrim/45`.

**Glow utilities** (`glow-marigold`, `glow-soft-*`, `aurora`, …) are declared with Tailwind v4's
`@utility` directive in `globals.css` — **not** `@layer utilities` — because only `@utility`
generates variants, and `hover:glow-marigold` is the entire point of a CTA that lights up. On this
light ground they render as tinted elevation: a soft coloured drop shadow that lifts the element
and stains the paper under it. `text-glow-*` are deliberately inert here.

Elevation never carries meaning on its own — it amplifies a colour that already means something.
`border-radius: 4px` maximum. 1px hairlines.

**Type:** Fraunces (`font-display`, headings and month numbers, large sizes only) · Instrument
Sans (`font-sans`, all prose) · IBM Plex Mono (`font-mono`, **every rupee amount without
exception**, tabular figures — money that jitters while animating is money you can't read).

**Copy voice:** blunt, warm, second person, present tense, sentence case. *"You skipped the SIP
this month."* Never shame — when the shadow agent wins by a mile the copy says *here's the gap and
where it opened*, never *you failed*.

`/swatch` renders every token and utility for eyeballing.

---

## State, persistence and accounts

[lib/store.ts](lib/store.ts) is the only stateful thing in the project. Zustand + `persist` into
`localStorage` under the key `lifeledger`. There is no database and there will not be one.

Persisted: `account`, `sessionUser`, `profile`, `diagnosticAnswers`, `onboardingComplete`, `run`,
`bites`.

**Deliberately not persisted**, because they are derived from `packId` + `incomeTier` + `seed`:
the scaled pack, the market path, and the shadow agent's run. A stale save can never disagree with
the current engine.

- **`SCHEMA_VERSION`** (currently 3) — on mismatch the save is cleared and the player is told via
  `StaleSaveNotice`, rather than being handed state the engine cannot read.
- **`useHasHydrated()`** — Zustand `persist` + SSR needs this guard or the first paint mismatches.
  Screens render a skeleton until it returns true; route guards in `lib/hooks/useGuard.ts` all
  wait for it before redirecting.
- **`resolveMonth`** is guarded on both phase and an `isResolving` flag, so a double-tap on Advance
  cannot run a month twice.
- **`devForce`** exists for forcing critical states at phase gates and is double-guarded off in
  production.

**Accounts** are device-local (`lib/auth/`). Passwords are salted and stretched with a
hand-written SHA-256 in plain TypeScript — *not* `crypto.subtle`, which is undefined outside a
secure context and would break the whole point of installing the PWA on a phone from
`http://<lan-ip>:3000`. Sign-in returns one deliberately vague error for both a wrong username and
a wrong password. This is the honest bar for a device-local account: the stored value is not the
password and does not fall to a rainbow table.

---

## PWA

- `app/manifest.ts` → served at `/manifest.webmanifest`, standalone display, portrait, light
  theme colour.
- `public/sw.js` → app-shell service worker registered by `components/ServiceWorkerRegistrar.tsx`.
  Navigations are **network-first** so a fresh deploy is never masked by a stale shell;
  `/_next/static` is content-hashed and therefore cache-first.
- Game state already survives refresh and offline reopen via `localStorage` — the service worker
  only adds a cold offline load.

---

## Repository map

```
app/
  page.tsx                 title screen
  signup/ signin/          device-local auth
  onboarding/              profile + literacy diagnostic
  home/                    mode cards, resume, Quick Bites widget
  play/[mode]/             ★ ONE game screen, all modes
  report/[mode]/           ★ ONE report screen, all modes
  case-studies/[id]/       researched cases, read or played
  explainer/               16 concepts, three depths each
  profile/  swatch/
  api/coach|report|case-question/
  globals.css              tokens, @utility glows, aurora
  layout.tsx  manifest.ts

lib/sim/                   ★ THE PURE ENGINE — no React, no clock, no IO
  types.ts                 the whole domain model
  engine.ts                advanceMonth — 13 ordered steps
  effects.ts               Effect application, Condition evaluation
  pending.ts               ★ scheduled consequences
  deck.ts                  event selection and gating
  rng.ts                   mulberry32, gaussian, clamp
  metrics.ts               netWorth, runway, healthScore, savingsRate, utilisation
  bandwidth.ts             near-death states, slider locks
  gamify.ts                XP and badge predicates
  agent.ts                 ★ the shadow agent
  counterfactual.ts        ★ what-if replay

lib/ai/                    provider, prompts, schemas, parse, merge,
                           numbers (the invented-figure guard), fallbacks
lib/auth/                  account rules + hand-rolled SHA-256 hashing
lib/hooks/                 useAi, useGuard, usePressure
lib/                       store.ts, format.ts, profile.ts, bites.ts, cases.ts,
                           ribbon-geometry.ts, confetti.ts, utils.ts

content/
  packs/                   story-first-earner.ts + the registry
  concepts.ts bites.ts case-studies.ts diagnostic.ts
  __tests__/               lint, interconnections, smoke

components/
  game/                    PlayScreen, AllocationPanel, EventCard, PressureLayer,
                           CriticalLayer, NetWorthChart, TimelineRibbon, MonthResult,
                           CoachBubble, StatBars, RollingNumber, DevPanel
  report/                  ReportScreen, ReportSections, WhatIfPanel
  bites/ cases/ explainer/ onboarding/ chrome/ ui/
```

---

## Testing

```bash
npm run test          # vitest run
npm run test:watch
npm run test:ui
```

**Engine tests only** — 21 files, ~426 cases across `lib/**` and `content/**`. There are no
component tests: the engine is pure and worth testing exhaustively, and the UI is worth testing by
hand at each phase gate. `vitest.config.mts` runs in the `node` environment.

The ones that are load-bearing:

- `lib/sim/__tests__/purity.test.ts` — scans the engine source for `Math.random`, `Date`, `fetch`,
  `window`, `localStorage`. Comments are stripped before matching.
- `lib/sim/__tests__/engine.test.ts` — step order, and the assertion that **every money field is
  an integer after each of the 12 steps**. If that goes red, a `Math.round()` is missing. Do not
  relax the test.
- `lib/sim/__tests__/agent.test.ts` — the shadow agent faces the identical world.
- `content/__tests__/lint.test.ts` — no event can softlock the player.
- `lib/ai/__tests__/numbers.test.ts` — the invented-figure guard actually catches figures.

Also useful: `npm run lint` and `npx tsc --noEmit`.

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Next dev server with Turbopack on :3000 |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run test` | Vitest, once |
| `npm run test:watch` / `test:ui` | Vitest watch / browser UI |
| `npm run lint` | ESLint |

---

## Working rules

The short version, for anyone touching this repo:

1. **The engine is pure.** No React, no `Math.random()`, no `Date`, no IO under `lib/sim/`.
2. **All money is integer rupees.** Every money expression ends in `Math.round()`. Formatting is
   render-time only.
3. **The LLM never computes.** A prompt containing "calculate" or "estimate" is a bug.
4. **Every AI surface has an authored fallback, and the fallback ships first.**
5. **One engine, four content packs.** A second game loop means something has gone wrong.
6. **Phase gates.** Don't refactor a completed phase without discussing it first.
7. **Log issues as you find them** in [KNOWN_ISSUES.md](KNOWN_ISSUES.md).
8. **Don't run two dev servers, or a dev server and a build, at once.** Fighting over `.next` is a
   recurring, expensive failure mode here.

---

## Project documents

| File | What's in it |
|---|---|
| [COMPOUND_IMPLEMENTATION_PLAN.md](COMPOUND_IMPLEMENTATION_PLAN.md) | Full spec: domain model, engine order, packs, phases, edge cases, demo script |
| [STORY_MODE_EVENTS.md](STORY_MODE_EVENTS.md) | Event copy for the 12-month story deck |
| [KNOWN_ISSUES.md](KNOWN_ISSUES.md) | Running record of deviations, workarounds and open questions, per phase, each with a status |

---

## Status and roadmap

**Shipped:** the engine and its full test suite · the 12-month First Earner story pack · profile
scaling and the literacy diagnostic · the game-loop UI · the pressure layer · near-death states and
the bandwidth tax · the shadow agent and the two-line chart · the report with what-if replay ·
the AI coach and AI report (both fallback-first) · Quick Bites · case studies · the explainer ·
the PWA layer and device-local accounts.

**Next, in rough order:**

- Register the **historical pack** (March 2020, 6 months, real `marketReturns`, epilogue before
  the report). No new game loop required — it is a config.
- Register the **Short Bites pack** ("Buy a car", 4 months, `goal`-driven).
- More life stages beyond `first_earner` — the `LifeStage` union and pack `lifeStages` filter are
  already in place.

**Explicitly not planned:** a backend, a user directory, cloud saves. State lives on the device.
