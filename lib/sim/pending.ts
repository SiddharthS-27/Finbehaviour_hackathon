/**
 * ★ The scheduled-effect queue.
 *
 * This is the mechanism the entire event library depends on. A choice in month
 * 3 queues consequences for month 8; step 4.5 of `advanceMonth` fires them and
 * removes them. Delete this and Story Mode can no longer teach present bias —
 * the wrong choice has to feel good *now* and cost *later*.
 *
 * Never cut it. See CLAUDE.md.
 */

import type { Choice, PendingEffect } from "./types";

/**
 * Queue one scheduled consequence.
 *
 * Returns a new array — the engine works on a draft, but keeping this pure
 * means it is trivially testable on its own.
 *
 * Two guards:
 *  - `monthsLater` is floored at 1. A delay of 0 would schedule into a month
 *    whose resolve step has already run, stranding the entry forever.
 *  - Anything landing past the final month is **discarded silently**. The run
 *    is over; there is nobody left to bill. (Edge case 11.)
 */
export function schedule(
  pending: PendingEffect[],
  entry: {
    currentMonth: number;
    monthsLater: number;
    effects: PendingEffect["effects"];
    sourceEventId: string;
    note: string;
  },
  totalMonths: number,
): PendingEffect[] {
  const monthsLater = Math.max(1, Math.round(entry.monthsLater));
  const fireMonth = entry.currentMonth + monthsLater;

  if (fireMonth > totalMonths) return pending;

  return [
    ...pending,
    {
      fireMonth,
      effects: entry.effects,
      sourceEventId: entry.sourceEventId,
      note: entry.note,
    },
  ];
}

/** Queue every delayed block on a choice at once. */
export function scheduleFromChoice(
  pending: PendingEffect[],
  choice: Choice,
  eventId: string,
  currentMonth: number,
  totalMonths: number,
): PendingEffect[] {
  return choice.delayed.reduce(
    (acc, d) =>
      schedule(
        acc,
        {
          currentMonth,
          monthsLater: d.monthsLater,
          effects: d.effects,
          sourceEventId: eventId,
          note: d.note,
        },
        totalMonths,
      ),
    pending,
  );
}

/**
 * Split the queue into what fires now and what waits.
 *
 * The comparison is `<=`, not `===`, so an entry can never be stranded by an
 * off-by-one: whatever is due or overdue fires on the next month to run, and
 * fires exactly once because it leaves the queue in the same step.
 *
 * Order is by fireMonth then insertion, so effect application is deterministic.
 */
export function takeDue(
  pending: PendingEffect[],
  month: number,
): { due: PendingEffect[]; remaining: PendingEffect[] } {
  const due: PendingEffect[] = [];
  const remaining: PendingEffect[] = [];

  for (const p of pending) {
    if (p.fireMonth <= month) due.push(p);
    else remaining.push(p);
  }

  due.sort((a, b) => a.fireMonth - b.fireMonth);
  return { due, remaining };
}

/** Everything still owed to the player's future, for the report's trace view. */
export function pendingFrom(pending: PendingEffect[], eventId: string): PendingEffect[] {
  return pending.filter((p) => p.sourceEventId === eventId);
}
