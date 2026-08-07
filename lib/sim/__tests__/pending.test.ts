import { describe, it, expect } from "vitest";
import { pendingFrom, schedule, scheduleFromChoice, takeDue } from "../pending";
import type { Choice, PendingEffect } from "../types";

function entry(fireMonth: number, note = `fires ${fireMonth}`): PendingEffect {
  return { fireMonth, effects: [], sourceEventId: "e", note };
}

describe("schedule", () => {
  it("queues into the right future month", () => {
    const out = schedule(
      [],
      { currentMonth: 3, monthsLater: 5, effects: [], sourceEventId: "e", note: "n" },
      12,
    );
    expect(out).toHaveLength(1);
    expect(out[0].fireMonth).toBe(8);
  });

  it("discards anything landing past the final month — the run is over", () => {
    const out = schedule(
      [],
      { currentMonth: 10, monthsLater: 5, effects: [], sourceEventId: "e", note: "n" },
      12,
    );
    expect(out).toEqual([]);
  });

  it("keeps something landing exactly on the final month", () => {
    const out = schedule(
      [],
      { currentMonth: 10, monthsLater: 2, effects: [], sourceEventId: "e", note: "n" },
      12,
    );
    expect(out[0].fireMonth).toBe(12);
  });

  it("floors a zero delay at one month, so it cannot be stranded", () => {
    const out = schedule(
      [],
      { currentMonth: 4, monthsLater: 0, effects: [], sourceEventId: "e", note: "n" },
      12,
    );
    expect(out[0].fireMonth).toBe(5);
  });

  it("does not mutate the queue it is given", () => {
    const before: PendingEffect[] = [];
    schedule(
      before,
      { currentMonth: 1, monthsLater: 1, effects: [], sourceEventId: "e", note: "n" },
      12,
    );
    expect(before).toEqual([]);
  });
});

describe("scheduleFromChoice", () => {
  const choice: Choice = {
    id: "c",
    label: "c",
    visualWeight: "normal",
    immediate: [],
    delayed: [
      { monthsLater: 2, effects: [], note: "soon" },
      { monthsLater: 40, effects: [], note: "never" },
      { monthsLater: 9, effects: [], note: "last month" },
    ],
    fallbackNote: "",
  };

  it("queues every delayed block that lands inside the run", () => {
    const out = scheduleFromChoice([], choice, "evt", 3, 12);
    expect(out.map((p) => p.note)).toEqual(["soon", "last month"]);
    expect(out.map((p) => p.fireMonth)).toEqual([5, 12]);
  });

  it("tags each entry with the event that caused it, for the report trace", () => {
    const out = scheduleFromChoice([], choice, "evt", 3, 12);
    expect(out.every((p) => p.sourceEventId === "evt")).toBe(true);
    expect(pendingFrom(out, "evt")).toHaveLength(2);
    expect(pendingFrom(out, "other")).toHaveLength(0);
  });
});

describe("takeDue", () => {
  it("splits what fires now from what waits", () => {
    const queue = [entry(8), entry(11), entry(9)];
    const { due, remaining } = takeDue(queue, 9);
    expect(due.map((p) => p.fireMonth)).toEqual([8, 9]);
    expect(remaining.map((p) => p.fireMonth)).toEqual([11]);
  });

  it("fires nothing when nothing is due", () => {
    const { due, remaining } = takeDue([entry(8)], 5);
    expect(due).toEqual([]);
    expect(remaining).toHaveLength(1);
  });

  it("sweeps up an overdue entry rather than stranding it", () => {
    // Uses <= so an off-by-one can never leave something in the queue forever.
    const { due, remaining } = takeDue([entry(3)], 7);
    expect(due).toHaveLength(1);
    expect(remaining).toEqual([]);
  });

  it("orders what fires by month, so effects apply deterministically", () => {
    const { due } = takeDue([entry(9, "c"), entry(7, "a"), entry(8, "b")], 9);
    expect(due.map((p) => p.note)).toEqual(["a", "b", "c"]);
  });

  it("removes an entry so it can never fire twice", () => {
    let queue = [entry(5)];
    const first = takeDue(queue, 5);
    expect(first.due).toHaveLength(1);
    queue = first.remaining;
    expect(takeDue(queue, 6).due).toEqual([]);
  });
});
