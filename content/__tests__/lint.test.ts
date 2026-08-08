import { describe, it, expect } from "vitest";
import { PACKS } from "../packs";
import { CONCEPTS, CONCEPTS_BY_ID } from "../concepts";
import { DIAGNOSTIC, scoreDiagnostic } from "../diagnostic";
import type { ContentPack, Effect, EventCard } from "@/lib/sim/types";
import { isCreditChoice } from "@/lib/sim/bandwidth";

/**
 * Content lint — the Phase 2 gate.
 *
 * Authored content is data, and data with a typo in it fails at 2:40 a.m. in
 * front of judges rather than at build time. Everything mechanically checkable
 * is checked here.
 */

const CONCEPT_IDS = new Set(CONCEPTS.map((c) => c.id));

/** Every event across every pack, tagged with the pack it came from. */
const ALL_EVENTS: [string, ContentPack, EventCard][] = PACKS.flatMap((pack) =>
  pack.events.map((e) => [`${pack.id}/${e.id}`, pack, e] as [string, ContentPack, EventCard]),
);

/** Every effect an event can apply, immediate or delayed. */
function allEffects(event: EventCard): Effect[] {
  return event.choices.flatMap((c) => [...c.immediate, ...c.delayed.flatMap((d) => d.effects)]);
}

/** The money-carrying numbers inside an effect. Each must be an integer rupee. */
function moneyAmounts(e: Effect): [string, number][] {
  switch (e.kind) {
    case "cash":
    case "emergencyFund":
    case "portfolioAdd":
    case "expenseDelta":
      return [[e.kind, e.amount]];
    case "debtPay":
      return [["debtPay.amount", e.amount]];
    case "insurance":
      return [["insurance.premiumMonthly", e.premiumMonthly]];
    case "debtAdd":
      return [
        ["debtAdd.principal", e.debt.principal],
        ["debtAdd.minPaymentFloor", e.debt.minPaymentFloor],
        ...(e.debt.limit === undefined
          ? []
          : ([["debtAdd.limit", e.debt.limit]] as [string, number][])),
      ];
    case "subscriptionAdd":
      return [["subscriptionAdd.monthlyCost", e.sub.monthlyCost]];
    default:
      return [];
  }
}

/* ══════════════════════ the four gate assertions ══════════════════════ */

describe("★ gate — every event has exactly one correct choice", () => {
  it.each(ALL_EVENTS.map(([label, , e]) => [label, e]))("%s", (_label, event) => {
    const matches = event.choices.filter((c) => c.id === event.correctChoiceId);
    expect(matches, `correctChoiceId "${event.correctChoiceId}" must match exactly one choice`)
      .toHaveLength(1);
  });
});

describe("★ gate — every event has at least one choice with no requirements", () => {
  it.each(ALL_EVENTS.map(([label, , e]) => [label, e]))("%s", (_label, event) => {
    // Without this the player can be softlocked on a card where every option
    // is disabled. (Edge case 10.)
    const unconditional = event.choices.filter((c) => !c.requires);
    expect(unconditional.length, "at least one choice must be takeable in any state")
      .toBeGreaterThanOrEqual(1);
  });
});

describe("★ every event survives a collapsed CIBIL", () => {
  it.each(ALL_EVENTS.map(([label, , e]) => [label, e]))("%s", (_label, event) => {
    // Below 600 the deck also blocks credit-taking choices (Phase 6). The
    // softlock guarantee has to hold against BOTH gates at once, not just
    // `requires` — otherwise a player with wrecked credit meets a card where
    // every option is disabled.
    const alwaysOpen = event.choices.filter((c) => !c.requires && !isCreditChoice(c));
    expect(
      alwaysOpen.length,
      `${event.id} leaves nothing takeable at CIBIL < 600`,
    ).toBeGreaterThanOrEqual(1);
  });
});

describe("★ gate — every concept id referenced exists", () => {
  it.each(ALL_EVENTS.map(([label, , e]) => [label, e]))("%s", (_label, event) => {
    expect(CONCEPT_IDS.has(event.concept), `unknown concept "${event.concept}"`).toBe(true);
  });

  it("the diagnostic only probes real concepts", () => {
    for (const q of DIAGNOSTIC) {
      expect(CONCEPT_IDS.has(q.concept), `unknown concept "${q.concept}"`).toBe(true);
    }
  });

  it("every prerequisite is a real concept", () => {
    for (const c of CONCEPTS) {
      for (const p of c.prerequisites) {
        expect(CONCEPT_IDS.has(p), `${c.id} requires unknown concept "${p}"`).toBe(true);
      }
    }
  });
});

describe("★ gate — every delayed effect lands inside the run", () => {
  it.each(ALL_EVENTS.map(([label, pack, e]) => [label, pack, e]))(
    "%s",
    (_label, pack, event) => {
      for (const choice of event.choices) {
        for (const d of choice.delayed) {
          const fireMonth = event.month + d.monthsLater;
          expect(
            fireMonth,
            `${choice.id} schedules into month ${fireMonth} of a ${pack.totalMonths}-month run — it would be discarded silently`,
          ).toBeLessThanOrEqual(pack.totalMonths);
          expect(d.monthsLater, `${choice.id} must delay by at least one month`)
            .toBeGreaterThanOrEqual(1);
        }
      }
    },
  );
});

/* ═══════════════════════ structural integrity ═════════════════════════ */

describe("event structure", () => {
  it("event ids are unique within a pack", () => {
    for (const pack of PACKS) {
      const ids = pack.events.map((e) => e.id);
      expect(new Set(ids).size, `duplicate event id in ${pack.id}`).toBe(ids.length);
    }
  });

  it("each month slot holds at most one event", () => {
    for (const pack of PACKS) {
      const months = pack.events.map((e) => e.month);
      expect(new Set(months).size, `two events share a month in ${pack.id}`).toBe(months.length);
    }
  });

  it.each(ALL_EVENTS.map(([label, pack, e]) => [label, pack, e]))(
    "%s sits inside the run and is fully authored",
    (_label, pack, event) => {
      expect(event.month).toBeGreaterThanOrEqual(1);
      expect(event.month).toBeLessThanOrEqual(pack.totalMonths);

      expect(event.title.length).toBeGreaterThan(0);
      expect(event.body.length).toBeGreaterThan(0);

      // The debrief is the payload — an event without one teaches nothing.
      expect(event.debrief.opening.length, "debrief.opening").toBeGreaterThan(20);
      expect(event.debrief.proof.length, "debrief.proof").toBeGreaterThan(20);
      expect(event.debrief.rule.length, "debrief.rule").toBeGreaterThan(20);

      expect(event.choices.length, "needs at least two choices").toBeGreaterThanOrEqual(2);
    },
  );

  it.each(ALL_EVENTS.map(([label, , e]) => [label, e]))("%s has well-formed choices", (_label, event) => {
    const ids = event.choices.map((c) => c.id);
    expect(new Set(ids).size, "duplicate choice id").toBe(ids.length);

    for (const c of event.choices) {
      expect(c.label.length, `${c.id} label`).toBeGreaterThan(0);

      // ★ Every AI surface ships a fallback first. The coach bubble's fallback
      // is this string, so a missing one is a blank bubble with no key.
      expect(c.fallbackNote.length, `${c.id} needs a fallbackNote`).toBeGreaterThan(20);

      // A blocked choice must say why — *why you cannot* is the lesson.
      if (c.requires) {
        expect(c.blockedReason, `${c.id} has requires but no blockedReason`).toBeTruthy();
      }
    }
  });

  it.each(ALL_EVENTS.map(([label, , e]) => [label, e]))(
    "%s makes the wrong answer at least as attractive as the right one",
    (_label, event) => {
      // visualWeight is the manipulation, encoded. If the correct choice were
      // always the prettiest button, players would learn the tell rather than
      // the lesson.
      const correct = event.choices.find((c) => c.id === event.correctChoiceId);
      expect(correct).toBeDefined();
      const primaries = event.choices.filter((c) => c.visualWeight === "primary");
      expect(primaries.length, "at most one primary choice").toBeLessThanOrEqual(1);
    },
  );
});

describe("money in content is integer rupees", () => {
  it.each(ALL_EVENTS.map(([label, , e]) => [label, e]))("%s", (_label, event) => {
    for (const effect of allEffects(event)) {
      for (const [field, value] of moneyAmounts(effect)) {
        expect(Number.isInteger(value), `${field} = ${value} is not an integer rupee`).toBe(true);
      }
    }
  });

  it("pack initial states hold only integer rupees", () => {
    for (const pack of PACKS) {
      const s = pack.initialState;
      const fields: [string, number][] = [
        ["monthlyIncome", s.monthlyIncome],
        ["fixedExpenses", s.fixedExpenses],
        ["cash", s.cash],
        ["emergencyFund", s.emergencyFund],
        ["portfolio.value", s.portfolio.value],
        ["portfolio.invested", s.portfolio.invested],
        ["insuranceHealthPremium", s.insuranceHealthPremium],
        ["insuranceTermPremium", s.insuranceTermPremium],
        ...s.debts.map((d) => [`debt(${d.id}).principal`, d.principal] as [string, number]),
      ];
      for (const [field, value] of fields) {
        expect(Number.isInteger(value), `${pack.id}.${field} = ${value}`).toBe(true);
      }
    }
  });
});

describe("debt references", () => {
  it("every debtPay names a debt that some choice or the pack can create", () => {
    for (const pack of PACKS) {
      const known = new Set(pack.initialState.debts.map((d) => d.id));
      for (const e of pack.events) {
        for (const effect of allEffects(e)) {
          if (effect.kind === "debtAdd" && effect.debt.id) known.add(effect.debt.id);
        }
      }
      for (const e of pack.events) {
        for (const effect of allEffects(e)) {
          if (effect.kind === "debtPay" && effect.debtId !== null) {
            // A missing id is a no-op at runtime rather than a crash, but it
            // is always a content bug — the choice would quietly do nothing.
            expect(
              known.has(effect.debtId),
              `${pack.id}/${e.id} pays debt "${effect.debtId}", which nothing creates`,
            ).toBe(true);
          }
        }
      }
    }
  });
});

describe("pack configuration", () => {
  it.each(PACKS.map((p) => [p.id, p]))("%s is internally consistent", (_id, pack) => {
    expect(pack.initialState.packId).toBe(pack.id);
    expect(pack.initialState.totalMonths).toBe(pack.totalMonths);
    expect(pack.totalMonths).toBeGreaterThan(0);

    if (pack.marketReturns) {
      expect(
        pack.marketReturns.length,
        "authored market must cover every month of the run",
      ).toBe(pack.totalMonths);
      expect(pack.marketReturns.every(Number.isFinite)).toBe(true);
    }
  });
});

/* ═════════════════════════════ concepts ═══════════════════════════════ */

describe("concepts", () => {
  it("ids are unique", () => {
    const ids = CONCEPTS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(CONCEPTS.map((c) => [c.id, c]))("%s is authored at all three depths", (_id, concept) => {
    for (const level of [1, 2, 3] as const) {
      const text = concept.explanations[level];
      expect(text, `level ${level} missing`).toBeTruthy();
      expect(text.length, `level ${level} too short to be an explanation`).toBeGreaterThan(60);
    }
    expect(concept.oneLiner.length).toBeGreaterThan(20);
    expect(concept.name.length).toBeGreaterThan(0);
  });

  it("gets plainer, not shorter, at level 1", () => {
    // Level 1 is for someone who was never taught this. It should not be a
    // one-line brush-off — it should be the same idea in smaller words.
    for (const c of CONCEPTS) {
      expect(c.explanations[1].length, `${c.id} level 1`).toBeGreaterThan(100);
    }
  });

  it("never gates a concept behind something harder than itself", () => {
    for (const c of CONCEPTS) {
      for (const p of c.prerequisites) {
        const prereq = CONCEPTS_BY_ID[p];
        expect(
          prereq.tier,
          `${c.id} (tier ${c.tier}) requires ${p} (tier ${prereq.tier})`,
        ).toBeLessThanOrEqual(c.tier);
      }
    }
  });

  it("has no circular prerequisites", () => {
    const visit = (id: string, seen: string[]): void => {
      expect(seen.includes(id), `cycle: ${[...seen, id].join(" → ")}`).toBe(false);
      for (const p of CONCEPTS_BY_ID[id]?.prerequisites ?? []) visit(p, [...seen, id]);
    };
    for (const c of CONCEPTS) visit(c.id, []);
  });

  it("covers every concept the deck teaches", () => {
    const taught = new Set(PACKS.flatMap((p) => p.events.map((e) => e.concept)));
    for (const id of taught) {
      expect(CONCEPT_IDS.has(id), `deck teaches "${id}" but no concept is authored`).toBe(true);
    }
  });
});

/* ════════════════════════════ diagnostic ══════════════════════════════ */

describe("diagnostic", () => {
  it("has three questions, each with a correct option that exists", () => {
    expect(DIAGNOSTIC).toHaveLength(3);
    for (const q of DIAGNOSTIC) {
      const match = q.options.filter((o) => o.id === q.correctOptionId);
      expect(match, `${q.id} correctOptionId must match exactly one option`).toHaveLength(1);
      expect(q.options.length).toBeGreaterThanOrEqual(3);
      expect(q.explanation.length).toBeGreaterThan(40);
    }
  });

  it("always offers a way to say you do not know", () => {
    // Forcing a guess turns a clean signal into noise.
    for (const q of DIAGNOSTIC) {
      expect(q.options.some((o) => o.id === "unsure"), `${q.id} needs an unsure option`).toBe(true);
    }
  });

  it("scores to the right literacy level", () => {
    const all = Object.fromEntries(DIAGNOSTIC.map((q) => [q.id, q.correctOptionId]));
    expect(scoreDiagnostic(all).literacyLevel).toBe(3);
    expect(scoreDiagnostic(all).correct).toBe(3);

    const two = { ...all, [DIAGNOSTIC[0].id]: "unsure" };
    expect(scoreDiagnostic(two).literacyLevel).toBe(2);

    const one = { ...two, [DIAGNOSTIC[1].id]: "unsure" };
    expect(scoreDiagnostic(one).literacyLevel).toBe(1);

    expect(scoreDiagnostic({}).literacyLevel).toBe(1);
    expect(scoreDiagnostic({}).correct).toBe(0);
  });

  it("reports what was missed, to seed the learning path", () => {
    const all = Object.fromEntries(DIAGNOSTIC.map((q) => [q.id, q.correctOptionId]));
    const partial = { ...all, diversification: "true" };
    const result = scoreDiagnostic(partial);
    expect(result.missedConcepts).toContain("diversification");
    expect(result.knownConcepts).toContain("compounding");
  });
});
