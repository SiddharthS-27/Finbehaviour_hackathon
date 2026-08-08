import { describe, it, expect } from "vitest";
import {
  ARCHETYPE_RULES,
  DEFAULT_ARCHETYPE,
  buildReport,
  classify,
  mastery,
  summarise,
  theoryPracticeGap,
  type RunSummary,
} from "../fallbacks";
import { storyFirstEarner as PACK } from "@/content/packs/story-first-earner";
import { marketForRun, eventForMonth, takeableChoices } from "@/lib/sim/deck";
import { optimalAllocation, optimalChoice, runOptimal } from "@/lib/sim/agent";
import { advanceMonth, createInitialState } from "@/lib/sim/engine";
import { availableDiscretionary, netWorth } from "@/lib/sim/metrics";
import { scoreDiagnostic } from "@/content/diagnostic";
import { ZERO_ALLOC } from "@/lib/sim/__tests__/fixtures";
import type { Allocation, EventCard, SimState } from "@/lib/sim/types";

/**
 * The report, with the model deliberately absent.
 *
 * This is the "cannot be embarrassed" surface: it has to be complete, specific
 * and correct with no network at all. Every assertion here runs against the
 * deterministic path, because that is the path that ships.
 */

const SEED = 909090;
const MARKET = marketForRun(PACK, SEED);
const OPTIMAL = runOptimal(PACK, SEED, MARKET);
const OPENING = netWorth(createInitialState(PACK, SEED));
const DIAGNOSTIC = scoreDiagnostic({
  compounding: "more",
  inflation: "less",
  diversification: "false",
});

function playStyle(
  choose: (event: EventCard, state: SimState) => string | null,
  allocate: (state: SimState) => Allocation,
): SimState {
  let state = createInitialState(PACK, SEED);
  for (let m = 1; m <= PACK.totalMonths; m++) {
    const event = eventForMonth(PACK, m, state);
    const choiceId = event ? choose(event, state) : null;
    state = advanceMonth(state, allocate(state), event, choiceId, MARKET[m - 1]).state;
  }
  return state;
}

/* ── the three playstyles the gate names ── */

const TEXTBOOK = playStyle(
  (event, state) => optimalChoice(state, event),
  (state) => optimalAllocation(state),
);

const SPENDER = playStyle(
  (event, state) => {
    const takeable = takeableChoices(state, event);
    // The bright, confident, usually-wrong one.
    return (takeable.find((c) => c.visualWeight === "primary") ?? takeable[0]).id;
  },
  (state) => ({ ...ZERO_ALLOC, discretionarySpend: availableDiscretionary(state) }),
);

const HOARDER = playStyle(
  (event, state) => {
    // Right answers, but never anything that puts money into the market.
    const takeable = takeableChoices(state, event);
    const cashOnly = takeable.filter(
      (c) => !c.immediate.some((e) => e.kind === "portfolioAdd" && e.amount > 0),
    );
    const pool = cashOnly.length > 0 ? cashOnly : takeable;
    return (pool.find((c) => c.id === event.correctChoiceId) ?? pool[0]).id;
  },
  (state) => ({ ...ZERO_ALLOC, toEmergencyFund: availableDiscretionary(state) }),
);

function report(state: SimState) {
  return buildReport({
    pack: PACK,
    seed: SEED,
    market: MARKET,
    state,
    optimal: OPTIMAL,
    openingNetWorth: OPENING,
    diagnostic: DIAGNOSTIC,
  });
}

describe("★ archetypes fire correctly across the three playstyles", () => {
  it("all-optimal → The Textbook", () => {
    expect(report(TEXTBOOK).archetype.id).toBe("textbook");
  });

  it("big spender → The Present-Tense Spender", () => {
    const r = report(SPENDER);
    expect(r.archetype.id).toBe("present_tense_spender");
    expect(r.summary.spendShare).toBeGreaterThanOrEqual(0.5);
  });

  it("hoarder → The Hoarder", () => {
    const r = report(HOARDER);
    expect(r.archetype.id).toBe("hoarder");
    expect(r.summary.portfolioValue).toBeLessThan(r.summary.finalNetWorth * 0.2);
  });

  it("all three are different — the ladder discriminates", () => {
    const ids = [TEXTBOOK, SPENDER, HOARDER].map((s) => report(s).archetype.id);
    expect(new Set(ids).size).toBe(3);
  });
});

describe("the archetype ladder", () => {
  const blank: RunSummary = {
    finalNetWorth: 100000,
    openingNetWorth: 0,
    optimalNetWorth: 100000,
    gapRupees: 0,
    gapFraction: 1,
    health: 50,
    band: "Steady",
    optimalChoices: 0,
    eventsFaced: 12,
    endedWithHighInterestDebt: 0,
    meanSavingsRate: 0.1,
    portfolioValue: 90000,
    monthsOnTheEdge: 0,
    spendShare: 0.1,
    missedPayments: 0,
    finalCreditScore: 750,
    peakStress: 20,
    badges: [],
  };

  it("★ does not fire The Tightrope Walker on an ordinary run", () => {
    // The First Earner opens on 0.4 months of cover. A literal reading of
    // "runway < 1 at any point" would label every single run fragile.
    expect(classify({ ...blank, monthsOnTheEdge: 1 }).id).not.toBe("tightrope_walker");
    expect(classify({ ...blank, monthsOnTheEdge: 3 }).id).toBe("tightrope_walker");
  });

  it("falls through to a non-shaming default", () => {
    expect(classify(blank)).toBe(DEFAULT_ARCHETYPE);
    expect(DEFAULT_ARCHETYPE.description).not.toMatch(/fail|bad|wrong|should have/i);
  });

  it("every archetype is authored in full", () => {
    for (const { archetype } of [...ARCHETYPE_RULES, { archetype: DEFAULT_ARCHETYPE }]) {
      expect(archetype.name.length, archetype.id).toBeLessThanOrEqual(28);
      expect(archetype.tagline.length, archetype.id).toBeLessThanOrEqual(80);
      expect(archetype.description.length, archetype.id).toBeGreaterThan(80);
      expect(archetype.description.length, archetype.id).toBeLessThanOrEqual(400);
    }
  });

  it("names no archetype twice", () => {
    const ids = ARCHETYPE_RULES.map((r) => r.archetype.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("never shames, in any archetype", () => {
    for (const { archetype } of ARCHETYPE_RULES) {
      expect(
        `${archetype.tagline} ${archetype.description}`,
        archetype.id,
      ).not.toMatch(/you failed|stupid|irresponsible|should be ashamed/i);
    }
  });
});

describe("the report as a whole", () => {
  for (const [name, state] of [
    ["textbook", TEXTBOOK],
    ["spender", SPENDER],
    ["hoarder", HOARDER],
  ] as const) {
    it(`${name}: renders complete with no AI available`, () => {
      const r = report(state);

      expect(r.archetype.name.length).toBeGreaterThan(0);
      expect(r.decisions).toHaveLength(PACK.totalMonths);
      expect(r.badges.length).toBeGreaterThan(0);
      expect(r.nextConcepts).toHaveLength(3);
      expect(r.closingLine.length).toBeGreaterThan(20);
      expect(r.mastery.length).toBeGreaterThan(0);

      // Every rupee figure is an integer. No "roughly" anywhere.
      expect(Number.isInteger(r.summary.gapRupees)).toBe(true);
      expect(Number.isInteger(r.summary.finalNetWorth)).toBe(true);
      for (const d of r.costliest) expect(Number.isInteger(d.costRupees)).toBe(true);
      for (const row of r.decisions) expect(Number.isInteger(row.netWorthDelta)).toBe(true);
    });
  }

  it("is deterministic — same run, same report", () => {
    expect(JSON.stringify(report(SPENDER))).toBe(JSON.stringify(report(SPENDER)));
  });

  it("★ celebrates beating the agent rather than hiding it", () => {
    const r = report(HOARDER);
    expect(r.beatTheAgent).toBe(true);
    expect(r.summary.gapRupees).toBeLessThan(0);
    expect(r.closingLine).toMatch(/ahead/i);
    // Edge case 25: do not let beating the benchmark read as an accident.
    expect(r.closingLine).not.toMatch(/was luck|just luck|a fluke|somehow|surprisingly/i);
  });

  it("recommends nothing the player has already nailed", () => {
    const r = report(TEXTBOOK);
    const solid = new Set(r.mastery.filter((m) => m.level === "solid").map((m) => m.conceptId));
    const risky = r.nextConcepts.filter((c) => solid.has(c.id) && c.why.includes("caught you"));
    expect(risky).toEqual([]);
  });

  it("every strength names something specific", () => {
    for (const state of [TEXTBOOK, HOARDER]) {
      for (const s of report(state).strengths) {
        expect(s, s).toMatch(/\d/);
      }
    }
  });
});

describe("mastery", () => {
  it("counts each concept the run actually tested", () => {
    const ms = mastery(PACK, TEXTBOOK.history);
    for (const m of ms) {
      expect(m.seen).toBeGreaterThan(0);
      expect(m.correct).toBeLessThanOrEqual(m.seen);
      expect(m.name.length).toBeGreaterThan(0);
    }
  });

  it("a flawless run is solid everywhere it was tested", () => {
    expect(mastery(PACK, TEXTBOOK.history).every((m) => m.level === "solid")).toBe(true);
  });

  it("a run of wrong answers is shaky everywhere", () => {
    expect(mastery(PACK, SPENDER.history).every((m) => m.level === "shaky")).toBe(true);
  });
});

describe("★ the theory–practice gap", () => {
  it("names it when someone knew the concept and still got caught", () => {
    const text = theoryPracticeGap(PACK, SPENDER.history, DIAGNOSTIC);
    expect(text).not.toBeNull();
    expect(text).toMatch(/month \d/);
  });

  it("stays silent rather than inventing one", () => {
    expect(theoryPracticeGap(PACK, TEXTBOOK.history, DIAGNOSTIC)).toBeNull();
  });

  it("says nothing when the diagnostic was never answered", () => {
    const blank = scoreDiagnostic({});
    expect(theoryPracticeGap(PACK, SPENDER.history, blank)).toBeNull();
  });
});

describe("summarise", () => {
  it("excludes month 1 from the months-on-the-edge count", () => {
    // The pack opens on 0.4 months of runway by design.
    const s = summarise(TEXTBOOK, TEXTBOOK.history, OPTIMAL, OPENING);
    expect(s.monthsOnTheEdge).toBe(
      TEXTBOOK.history.filter((r) => r.month > 1 && r.healthScoreEnd < 25).length,
    );
  });

  it("has no NaN in it, on any playstyle", () => {
    for (const state of [TEXTBOOK, SPENDER, HOARDER]) {
      const s = summarise(state, state.history, OPTIMAL, OPENING);
      for (const [key, value] of Object.entries(s)) {
        if (typeof value === "number") {
          expect(Number.isFinite(value), `${key} = ${value}`).toBe(true);
        }
      }
    }
  });
});

describe("★ 'nothing cost you' distinguishes flawless from lucky", () => {
  it("a flawless run says so", () => {
    const r = report(TEXTBOOK);
    expect(r.costliest).toEqual([]);
    expect(r.nothingCostlyReason).toBe("flawless");
    expect(r.summary.optimalChoices).toBe(r.summary.eventsFaced);
  });

  it("a run that got away with it is not congratulated as if it were right", () => {
    // The hoarder skips the month-5 split and dodges the month-9 correction by
    // accident. Nothing cost them anything, and they were still wrong.
    const r = report(HOARDER);
    expect(r.costliest).toEqual([]);
    expect(r.nothingCostlyReason).toBe("luck");
    expect(r.summary.optimalChoices).toBeLessThan(r.summary.eventsFaced);
  });

  it("is null whenever there is something to list", () => {
    expect(report(SPENDER).nothingCostlyReason).toBeNull();
  });
});

describe("learn-these-next advice is specific, not templated", () => {
  it("★ names the month rather than repeating a formula", () => {
    const whys = report(SPENDER).nextConcepts.map((c) => c.why);
    expect(new Set(whys).size, whys.join(" ‖ ")).toBe(whys.length);
    for (const why of whys) expect(why, why).toMatch(/Month/);
  });

  it("falls back gracefully when nothing was tested", () => {
    // A flawless run has no weak concept to point at; the advice comes from the
    // diagnostic and the foundations instead, and must still be three entries.
    const r = report(TEXTBOOK);
    expect(r.nextConcepts).toHaveLength(3);
    for (const c of r.nextConcepts) expect(c.why.length).toBeGreaterThan(10);
  });
});
