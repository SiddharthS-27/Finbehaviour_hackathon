/**
 * ★ CLAUDE.md rule 3, enforced rather than requested.
 *
 * The model never computes. Every number is calculated in TypeScript and handed
 * over as a fact; the model writes prose *about* numbers it has been given.
 *
 * Asking nicely in a system prompt is not enforcement. This is: every response
 * is scanned, and any rupee figure that was not in the request payload gets the
 * whole response thrown away and the authored fallback used instead. A wrong
 * number on screen is far worse than no generated text at all — the fallback is
 * good, and it is always available.
 *
 * Pure and independently testable. Imported by both API routes.
 */

import { formatCompactRupees, formatRupees, MINUS } from "@/lib/format";

/**
 * Bare numbers below this are allowed through unchecked: month indices, "3 of
 * 12", percentages, a CIBIL band. Anything carrying a ₹ is checked whatever its
 * size, so "₹50" still has to have been supplied.
 */
const BARE_NUMBER_FLOOR = 1000;

/** Everything a number could legitimately look like once rendered. */
export function renderings(value: number): string[] {
  const abs = Math.abs(Math.round(value));
  return [
    String(abs),
    formatRupees(abs),
    formatCompactRupees(abs),
    // Models often write "4.4L" where the UI writes "4.38L" — both are
    // roundings of a figure that *was* supplied, so both are permitted.
    ...(abs >= 100_000 ? [`${(abs / 100_000).toFixed(1)}L`, `${Math.round(abs / 100_000)}L`] : []),
    ...(abs >= 10_000_000
      ? [`${(abs / 10_000_000).toFixed(1)}Cr`, `${Math.round(abs / 10_000_000)}Cr`]
      : []),
  ];
}

/**
 * Fold a rendered figure down to something comparable: no symbol, no grouping,
 * no sign, no spaces, lakh and crore lower-cased.
 *
 *   "₹4,38,289" → "438289"     "−₹4.38L" → "4.38l"     "4.4 lakh" → "4.4l"
 */
export function normalise(token: string): string {
  return token
    .toLowerCase()
    .replace(/[₹,\s]/g, "")
    .replace(new RegExp(`^[-${MINUS}+]`), "")
    .replace(/lakhs?$/, "l")
    .replace(/crores?$/, "cr")
    .replace(/\.$/, "");
}

/** Every form the supplied numeric facts are allowed to appear in. */
export function allowedForms(values: number[]): Set<string> {
  const out = new Set<string>();
  for (const value of values) {
    for (const form of renderings(value)) out.add(normalise(form));
  }
  return out;
}

/**
 * Matches anything that reads as a money figure: an optional ₹, digits with
 * Indian or Western grouping, an optional decimal, an optional lakh/crore unit.
 */
const NUMBER_TOKEN = /₹\s*[\d,]+(?:\.\d+)?\s*(?:l|lakhs?|cr|crores?)?|\b[\d,]+(?:\.\d+)?\s*(?:l|lakhs?|cr|crores?)\b|\b\d[\d,]*(?:\.\d+)?\b/gi;

/**
 * ★ Everything a response is allowed to say, drawn from the whole payload.
 *
 * Numeric fields are the obvious half. The half that is easy to miss — and that
 * broke the first build of this — is **numbers living inside supplied strings**.
 * The month-1 choice is labelled "Treat the team, send ₹5,000 home"; a coach
 * line that quotes that label is quoting a fact it was handed, not inventing
 * one, but ₹5,000 is nowhere in the numeric fields.
 *
 * So the allow-list is the union: every rendering of every number, plus every
 * money token that already appears in the text we sent.
 */
export function allowedFrom(payload: unknown): Set<string> {
  const out = allowedForms(factsIn(payload));
  for (const text of stringsIn(payload)) {
    for (const match of text.matchAll(NUMBER_TOKEN)) out.add(normalise(match[0]));
  }
  return out;
}

export interface NumberAudit {
  ok: boolean;
  /** The tokens that were not in the payload. Logged in dev, never shown. */
  invented: string[];
}

/**
 * Scan generated text against the facts it was given.
 *
 * A token fails only if it looks like money — carries a ₹, a lakh/crore unit,
 * or is at least four digits — and does not match anything supplied. Small bare
 * numbers pass, because "you took the better option 3 times out of 12" is prose
 * about counts, not an invented rupee figure.
 */
export function auditNumbers(text: string, allowed: number[] | Set<string>): NumberAudit {
  const permitted = allowed instanceof Set ? allowed : allowedForms(allowed);
  const invented: string[] = [];

  for (const match of text.matchAll(NUMBER_TOKEN)) {
    const raw = match[0];
    const isMoney = /₹/.test(raw) || /l|cr/i.test(raw);
    const digits = Number(raw.replace(/[^\d.]/g, ""));
    if (!isMoney && !(Number.isFinite(digits) && digits >= BARE_NUMBER_FLOOR)) continue;

    if (!permitted.has(normalise(raw))) invented.push(raw.trim());
  }

  return { ok: invented.length === 0, invented };
}

/**
 * The gate: generated text, or null.
 *
 * Null means "use the fallback", which every caller already knows how to do.
 * There is no partial acceptance and no repair pass — a response with one
 * invented figure is a response that computed something, and the whole point is
 * that it must not.
 */
export function acceptIfHonest(
  text: string | null,
  allowed: number[] | Set<string>,
): { text: string | null; invented: string[] } {
  if (!text) return { text: null, invented: [] };
  const audit = auditNumbers(text, allowed);
  return audit.ok ? { text, invented: [] } : { text: null, invented: audit.invented };
}

/** Pull every string out of a payload object, however deeply nested. */
export function stringsIn(payload: unknown, acc: string[] = []): string[] {
  if (typeof payload === "string") {
    acc.push(payload);
    return acc;
  }
  if (Array.isArray(payload)) {
    for (const v of payload) stringsIn(v, acc);
    return acc;
  }
  if (payload && typeof payload === "object") {
    for (const v of Object.values(payload)) stringsIn(v, acc);
  }
  return acc;
}

/** Pull every number out of a payload object, however deeply nested. */
export function factsIn(payload: unknown, acc: number[] = []): number[] {
  if (typeof payload === "number") {
    if (Number.isFinite(payload)) acc.push(payload);
    return acc;
  }
  if (Array.isArray(payload)) {
    for (const v of payload) factsIn(v, acc);
    return acc;
  }
  if (payload && typeof payload === "object") {
    for (const v of Object.values(payload)) factsIn(v, acc);
  }
  return acc;
}
