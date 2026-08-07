# COMPOUND — working rules

> **Two years of your money, in twenty minutes.**
> Next.js 15 · App Router · TypeScript strict · Tailwind v4 · Zustand · PWA
> Full spec: `COMPOUND_IMPLEMENTATION_PLAN.md` · Event copy: `STORY_MODE_EVENTS.md`

These rules are load-bearing. They survive context compaction. Read them before writing code.

---

## Rule 1 — The engine is pure

Everything under `lib/sim/` must contain:

- **no React** — no imports from `react`, no hooks, no JSX
- **no `Math.random()`** — all randomness comes from the seeded `mulberry32` RNG in `lib/sim/rng.ts`
- **no `Date.now()`, no `new Date()`** — time is the `month` counter, nothing else
- **no `fetch`, no `window`, no `localStorage`, no IO of any kind**

Same inputs → same outputs, always. `advanceMonth()` returns a **new** state and never mutates its
arguments.

This is not stylistic. It is what makes the shadow-agent comparison honest (the benchmark policy
plays a byte-identical world) and the stage demo reproducible from a seed.

**Dependency rule:** `lib/sim/` may import only from `lib/sim/` and `content/`. If it ever imports
React, something has gone wrong — stop and fix it rather than working around it.

---

## Rule 2 — All money is integer rupees

No floats. No paise. Every money-producing expression ends in `Math.round()`.

```ts
portfolio.value = Math.round(portfolio.value * (1 + marketReturn));   // yes
portfolio.value = portfolio.value * (1 + marketReturn);               // bug
```

`Rupees` is `number`, but it is *always* an integer. Formatting (`₹`, lakh/crore, commas) happens
**only at render time**, via `lib/format.ts`. The engine never sees a formatted string.

There is a Vitest assertion that every money field is an integer after each of the 12 steps. If it
goes red, a `Math.round()` is missing — do not relax the test.

---

## Rule 3 — The LLM never computes

All numbers are calculated in TypeScript and handed to the model as **facts**. The model writes
prose *about* numbers it has been given. It never produces one.

A prompt containing the words "calculate", "estimate", "work out", or "figure out how much" is a
bug. So is any response containing a rupee figure that was not in the request payload.

Report generation passes `costRupees` in and requires it back verbatim. The coach receives
`netWorthDelta`, `runwayMonths`, `highInterestDebt` etc. pre-computed.

---

## Rule 4 — Every AI surface has an authored fallback, and the fallback ships first

The app must be **fully playable and fully reportable with no API key**. Build the deterministic
path first, then layer AI on top as an enhancement.

| Surface | Fallback |
|---|---|
| Coach bubble | `choice.fallbackNote`, authored on every single choice |
| Final report | Deterministic archetype rules in `lib/ai/fallbacks.ts` |
| Explainer | `concept.explanations[literacyLevel]`, authored locally, shown instantly |

`lib/ai/provider.ts` returns `null` when `GEMINI_API_KEY` is absent — **no network call at all**.
Callers treat `null` as "use the fallback", never as an error. No error toast for a missing coach line.

Test the whole app with `GEMINI_API_KEY` deliberately removed before every demo.

---

## Rule 5 — One engine, four content packs

Story Mode, Historical Case Study and Short Bites are **not** separate features. They are three
decks fed to the same `advanceMonth()` with different configs, rendered by the same
`app/play/[mode]/page.tsx` and `app/report/[mode]/page.tsx`.

**If you find yourself writing a second game loop, stop and ask.**

---

## Rule 6 — Phase gates

Work is phase-gated (see §15 of the plan). At the end of each phase: print the phase's test
checklist and **stop**. Do not begin the next phase until the human says continue.

**Never refactor a completed phase without asking.** If a later phase exposes a design flaw, say so
explicitly and propose the fix. Do not silently rewrite.

Commit at each gate with the message `phase-N: <summary>`.

---

## The colour rule, absolute

```
marigold  #E9A63C   YOU — your money, your line, primary CTA
mint      #6FC79A   OPTIMAL — the shadow agent's line
rust      #C4573A   DEBT — what you owe, losses, danger
violet    #8B7CC8   the AI coach's voice — never used for data
```

These four never mean anything else anywhere in the app. **Colour carries data, not decoration.**

Surfaces are quiet: flat panels, 1px hairlines (`--line`), no gradients, no glass, no drop shadows,
`border-radius: 4px` maximum. All boldness is spent on the timeline ribbon.

## Type

- **Fraunces** (`font-display`) — headings, month numbers, archetype name. Large sizes only.
- **Instrument Sans** (`font-sans`) — all prose, labels, buttons.
- **IBM Plex Mono** (`font-mono`) — **every rupee amount without exception**, tabular figures.
  Money that jitters while animating is money you can't read.

## Copy voice

Blunt, warm, second person, present tense. Sentence case everywhere.
"You skipped the SIP this month." Not "The user has elected to forgo."
Errors state what happened and what to do next.

Never shame. When the shadow agent beats the player badly, the copy says *"here's the gap and where
it opened"* — never *"you failed"*.

---

## Architectural facts worth not rediscovering

- **`lib/sim/pending.ts` is the mechanism the entire event library depends on.** A choice schedules
  `PendingEffect { fireMonth, effects, sourceEventId, note }`; step 4.5 of `advanceMonth` fires and
  removes them. Delete this and Story Mode stops teaching present bias. Never cut it.
- **Engine step order is pedagogical, not arbitrary.** Interest accrues *after* payments (step 8
  after step 6) so paying down debt this month actually helps this month.
- **`marketReturn` is injected into `advanceMonth`**, never generated inside it. That is what lets
  the shadow agent face an identical market.
- **The optimal run is recomputed from the seed on rehydrate — never persisted.** Persisting it
  would let a stale save disagree with the engine.
- **Reveal the shadow line only up to the current month.** Revealing the future spoils the game.
- **Overdraft is not a game over.** Negative cash becomes a 36% loan and cash → 0. Recovery arcs
  demo better than fail states. The run never ends early, no matter how bad it gets.
- **Every event needs ≥1 choice with no `requires`**, or the player can be softlocked. There is a
  content lint test asserting this across all packs.
- **Hydration:** Zustand `persist` + SSR needs the `useHasHydrated()` guard, or the first paint
  mismatches. Render a skeleton until true.
- **`SCHEMA_VERSION`** in the store. On mismatch, clear the save with a toast and restart.

## Commands

```bash
npm run dev          # localhost:3000
npm run test         # vitest run — engine only, no component tests
npm run test:watch
npm run build
```
