import { BITES, type Bite } from "@/content/bites";

/**
 * Quick Bites — the daily-limit arithmetic.
 *
 * Pure, and deliberately so: every function here takes the day as a *string*
 * that the caller obtained from the clock, rather than reading the clock
 * itself. That keeps the streak logic testable without freezing time, and it
 * keeps the one `new Date()` in this feature at a single call site
 * (`todayKey`), where it is easy to find.
 *
 * This is not under `lib/sim/`, so a clock is allowed at all — but the engine's
 * discipline is worth borrowing for anything that decides what a person sees.
 */

/** Cards served per day. The progress bar has this many segments. */
export const DAILY_BITE_COUNT = 5;

/** Banked to the ledger when the day's five are finished. */
export const BITE_XP_REWARD = 50;

/* ────────────────────────────── the day ─────────────────────────────── */

/**
 * A calendar day as `YYYY-MM-DD`, in the device's own timezone.
 *
 * Local, not UTC. Someone finishing their bites at 11pm in Chennai has
 * finished them *today*, and a UTC key would roll them into tomorrow and eat
 * the streak they just earned.
 */
export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** The single call site that reads the clock. */
export function todayKey(): string {
  return dayKey(new Date());
}

/** The day before a key, as a key. Handles month and year boundaries. */
export function previousDay(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  date.setDate(date.getDate() - 1);
  return dayKey(date);
}

/* ────────────────────────────── the deck ────────────────────────────── */

/**
 * The five cards for a session, taken from where this learner left off.
 *
 * Ordered, not shuffled — Level Zero has to land before anything else, and a
 * random five would hand a beginner credit utilisation on day one. The deck
 * wraps once it is exhausted, so a long streak revisits the fundamentals
 * rather than running out of cards and breaking.
 *
 * `cursor` is how many cards this person has consumed in total. Same cursor →
 * same five, which is what makes "review today's cards" show today's cards.
 */
export function dailyDeck(cursor: number, deck: Bite[] = BITES): Bite[] {
  if (deck.length === 0) return [];
  const start = ((cursor % deck.length) + deck.length) % deck.length;
  return Array.from(
    { length: Math.min(DAILY_BITE_COUNT, deck.length) },
    (_, i) => deck[(start + i) % deck.length],
  );
}

/**
 * Where today's five start in the deck.
 *
 * The cursor advances the moment a day is banked, so that tomorrow serves
 * fresh cards. That means once today is complete the cursor has already moved
 * past today's window — and "review today's cards" would otherwise hand back
 * *tomorrow's* five. Reading the window back is one subtraction; the
 * alternative was a second persisted field that could drift out of step with
 * the first.
 */
export function deckStartFor(
  record: { cursor: number; lastCompletedDay: string | null },
  today: string,
): number {
  return record.lastCompletedDay === today
    ? Math.max(0, record.cursor - DAILY_BITE_COUNT)
    : record.cursor;
}

/* ───────────────────────────── the streak ───────────────────────────── */

export interface StreakRecord {
  streak: number;
  lastCompletedDay: string | null;
}

/**
 * The streak after finishing today's five.
 *
 * Finishing twice in one day is not two days — this is idempotent, so the
 * "review today's cards" path can call it freely.
 */
export function nextStreak(record: StreakRecord, today: string): number {
  if (record.lastCompletedDay === today) return record.streak;
  if (record.lastCompletedDay === previousDay(today)) return record.streak + 1;
  return 1;
}

/**
 * The streak worth *showing*, which is not the same as the stored one.
 *
 * A stored streak of 9 whose last completed day was a fortnight ago is over.
 * Displaying it would be a lie the flame icon tells every time the app opens.
 * Yesterday still counts — the day is not lost until it ends.
 */
export function currentStreak(record: StreakRecord, today: string): number {
  if (!record.lastCompletedDay) return 0;
  if (record.lastCompletedDay === today) return record.streak;
  if (record.lastCompletedDay === previousDay(today)) return record.streak;
  return 0;
}

/** True once today's five are done. */
export function isDayComplete(lastCompletedDay: string | null, today: string): boolean {
  return lastCompletedDay === today;
}
