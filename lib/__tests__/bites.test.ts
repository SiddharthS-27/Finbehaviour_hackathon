import { describe, it, expect } from "vitest";
import {
  DAILY_BITE_COUNT,
  currentStreak,
  dailyDeck,
  dayKey,
  deckStartFor,
  isDayComplete,
  nextStreak,
  previousDay,
} from "../bites";
import { BITES } from "@/content/bites";

/**
 * The genuinely new logic in Quick Bites is the daily-limit arithmetic: which
 * five cards, and whether the flame is still lit. Both are easy to get subtly
 * wrong in ways nobody notices until a streak silently resets, so both are
 * tested here rather than by eye.
 */

describe("dayKey", () => {
  it("is local, zero-padded and sortable", () => {
    expect(dayKey(new Date(2026, 7, 8))).toBe("2026-08-08");
    expect(dayKey(new Date(2026, 0, 1))).toBe("2026-01-01");
  });

  it("does not roll over late at night", () => {
    // A UTC key would push an 11pm finish in Chennai into tomorrow and eat the
    // streak the player just earned.
    expect(dayKey(new Date(2026, 7, 8, 23, 45))).toBe("2026-08-08");
    expect(dayKey(new Date(2026, 7, 8, 0, 5))).toBe("2026-08-08");
  });
});

describe("previousDay", () => {
  it("walks back across month and year boundaries", () => {
    expect(previousDay("2026-08-08")).toBe("2026-08-07");
    expect(previousDay("2026-08-01")).toBe("2026-07-31");
    expect(previousDay("2026-01-01")).toBe("2025-12-31");
    expect(previousDay("2028-03-01")).toBe("2028-02-29"); // leap year
  });
});

describe("dailyDeck", () => {
  it("serves exactly the daily count", () => {
    expect(dailyDeck(0)).toHaveLength(DAILY_BITE_COUNT);
    expect(dailyDeck(7)).toHaveLength(DAILY_BITE_COUNT);
  });

  it("★ starts a new learner on Level Zero, in authored order", () => {
    // The whole reason the deck is ordered rather than shuffled. A beginner
    // meeting credit utilisation on day one is the failure this prevents.
    const first = dailyDeck(0);
    expect(first[0].id).toBe(BITES[0].id);
    expect(first.slice(0, 4).every((b) => b.level === 0)).toBe(true);
  });

  it("is stable for a given cursor, so review shows the same cards", () => {
    expect(dailyDeck(5).map((b) => b.id)).toEqual(dailyDeck(5).map((b) => b.id));
    expect(dailyDeck(5).map((b) => b.id)).not.toEqual(dailyDeck(0).map((b) => b.id));
  });

  it("wraps instead of running out", () => {
    const wrapped = dailyDeck(BITES.length - 2);
    expect(wrapped).toHaveLength(DAILY_BITE_COUNT);
    expect(wrapped.map((b) => b.id)).toContain(BITES[0].id);
  });

  it("never repeats a card within one day", () => {
    for (let cursor = 0; cursor < BITES.length; cursor++) {
      const ids = dailyDeck(cursor).map((b) => b.id);
      expect(new Set(ids).size, `cursor ${cursor} repeats a card`).toBe(ids.length);
    }
  });

  it("survives an empty deck rather than throwing", () => {
    expect(dailyDeck(3, [])).toEqual([]);
  });
});

describe("deckStartFor", () => {
  it("serves the next window while today is still unfinished", () => {
    expect(deckStartFor({ cursor: 10, lastCompletedDay: "2026-08-07" }, "2026-08-08")).toBe(10);
    expect(deckStartFor({ cursor: 0, lastCompletedDay: null }, "2026-08-08")).toBe(0);
  });

  it("★ reads today's window back once the day is banked", () => {
    // Completion advances the cursor so tomorrow is fresh. Without this,
    // "review today's cards" would show tomorrow's five instead.
    expect(deckStartFor({ cursor: 10, lastCompletedDay: "2026-08-08" }, "2026-08-08")).toBe(5);
    expect(dailyDeck(deckStartFor({ cursor: 5, lastCompletedDay: "2026-08-08" }, "2026-08-08")))
      .toEqual(dailyDeck(0));
  });
});

describe("nextStreak", () => {
  it("starts at one", () => {
    expect(nextStreak({ streak: 0, lastCompletedDay: null }, "2026-08-08")).toBe(1);
  });

  it("extends when yesterday was done", () => {
    expect(nextStreak({ streak: 4, lastCompletedDay: "2026-08-07" }, "2026-08-08")).toBe(5);
  });

  it("★ is idempotent within a day", () => {
    // "Review today's cards" re-runs completion. Counting it twice would make
    // the flame a lie by the end of the week.
    expect(nextStreak({ streak: 5, lastCompletedDay: "2026-08-08" }, "2026-08-08")).toBe(5);
  });

  it("resets after a missed day", () => {
    expect(nextStreak({ streak: 9, lastCompletedDay: "2026-08-05" }, "2026-08-08")).toBe(1);
  });
});

describe("currentStreak", () => {
  it("shows nothing when nothing has been completed", () => {
    expect(currentStreak({ streak: 0, lastCompletedDay: null }, "2026-08-08")).toBe(0);
  });

  it("keeps the flame lit today and the day after", () => {
    expect(currentStreak({ streak: 6, lastCompletedDay: "2026-08-08" }, "2026-08-08")).toBe(6);
    expect(currentStreak({ streak: 6, lastCompletedDay: "2026-08-07" }, "2026-08-08")).toBe(6);
  });

  it("★ goes cold once a day is missed, even though the stored number stands", () => {
    expect(currentStreak({ streak: 12, lastCompletedDay: "2026-07-20" }, "2026-08-08")).toBe(0);
  });
});

describe("isDayComplete", () => {
  it("is true only for today", () => {
    expect(isDayComplete("2026-08-08", "2026-08-08")).toBe(true);
    expect(isDayComplete("2026-08-07", "2026-08-08")).toBe(false);
    expect(isDayComplete(null, "2026-08-08")).toBe(false);
  });
});

describe("the deck itself is authored", () => {
  it("has enough cards for a day and then some", () => {
    expect(BITES.length).toBeGreaterThanOrEqual(DAILY_BITE_COUNT * 2);
  });

  it("has unique ids", () => {
    const ids = BITES.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("is fully written — no card ships with a blank face", () => {
    for (const b of BITES) {
      expect(b.hook.length, `${b.id} hook`).toBeGreaterThan(20);
      expect(b.term.length, `${b.id} term`).toBeGreaterThan(0);
      expect(b.mechanics.length, `${b.id} mechanics`).toBeGreaterThan(60);
      expect(b.goldenRule.length, `${b.id} goldenRule`).toBeGreaterThan(20);
      expect(b.category.length, `${b.id} category`).toBeGreaterThan(0);
    }
  });

  it("only cross-links to concepts that exist, and only with integer rupees", async () => {
    const { CONCEPTS_BY_ID } = await import("@/content/concepts");
    for (const b of BITES) {
      if (b.concept) {
        expect(CONCEPTS_BY_ID[b.concept], `${b.id} links to unknown concept "${b.concept}"`)
          .toBeDefined();
      }
      if (b.demo) {
        expect(Number.isInteger(b.demo.stake), `${b.id} demo stake`).toBe(true);
        for (const o of b.demo.options) {
          expect(Number.isInteger(o.afterOneYear), `${b.id}/${o.id}`).toBe(true);
        }
      }
    }
  });
});
