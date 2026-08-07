/**
 * Rupee formatting. Render-time only.
 *
 * The engine deals exclusively in integer rupees (see CLAUDE.md rule 2) and
 * never sees a formatted string. Everything here is presentation.
 *
 * Indian digit grouping throughout: ₹1,25,000 — not ₹125,000. Getting this
 * wrong is the fastest way to look like a foreign product.
 */

/** U+2212 MINUS SIGN. A hyphen is punctuation; this is arithmetic. */
export const MINUS = "−";
export const RUPEE = "₹";

const LAKH = 100_000;
const CRORE = 10_000_000;

/** Indian grouping (2,2,3). Built once — Intl construction is not cheap. */
const groupIN = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
  useGrouping: true,
});

/**
 * Coerce anything the UI might hand us into a safe integer.
 * The engine should never produce NaN, but formatting runs on every paint and
 * must not be the thing that throws.
 */
function safeInt(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n);
}

/** Trim trailing zeros: 1.20 → "1.2", 2.00 → "2". */
function trimZeros(s: string): string {
  return s.includes(".") ? s.replace(/\.?0+$/, "") : s;
}

/**
 * Full rupee amount with Indian grouping.
 *
 *   formatRupees(125000)  → "₹1,25,000"
 *   formatRupees(-4200)   → "−₹4,200"
 *   formatRupees(0)       → "₹0"
 *
 * The sign sits outside the symbol, which is how Indian statements print it.
 */
export function formatRupees(n: number): string {
  const v = safeInt(n);
  const sign = v < 0 ? MINUS : "";
  return `${sign}${RUPEE}${groupIN.format(Math.abs(v))}`;
}

/**
 * Abbreviated for tight spaces — chart axes, stat bars, ribbon cells.
 * Below a lakh there is nothing to gain, so it falls through to the full form.
 *
 *   formatCompactRupees(950)      → "₹950"
 *   formatCompactRupees(42000)    → "₹42,000"
 *   formatCompactRupees(125000)   → "₹1.25L"
 *   formatCompactRupees(215000)   → "₹2.15L"
 *   formatCompactRupees(24000000) → "₹2.4Cr"
 */
export function formatCompactRupees(n: number): string {
  const v = safeInt(n);
  const abs = Math.abs(v);
  const sign = v < 0 ? MINUS : "";

  if (abs >= CRORE) {
    return `${sign}${RUPEE}${trimZeros((abs / CRORE).toFixed(2))}Cr`;
  }
  if (abs >= LAKH) {
    return `${sign}${RUPEE}${trimZeros((abs / LAKH).toFixed(2))}L`;
  }
  return `${sign}${RUPEE}${groupIN.format(abs)}`;
}

/**
 * A change, always signed — so a gain never reads as a balance.
 *
 *   formatDelta(4200)  → "+₹4,200"
 *   formatDelta(-4200) → "−₹4,200"
 *   formatDelta(0)     → "₹0"        (zero takes no sign)
 */
export function formatDelta(n: number, opts?: { compact?: boolean }): string {
  const v = safeInt(n);
  const body = opts?.compact
    ? formatCompactRupees(Math.abs(v))
    : formatRupees(Math.abs(v));
  if (v === 0) return body;
  return `${v > 0 ? "+" : MINUS}${body}`;
}

/**
 * Bare number with Indian grouping, no symbol. For "12 units", counts, XP.
 */
export function formatNumber(n: number): string {
  const v = safeInt(n);
  const sign = v < 0 ? MINUS : "";
  return `${sign}${groupIN.format(Math.abs(v))}`;
}

/**
 * A rate held as a fraction (0.42) rendered as a percentage ("42%").
 * APRs are authored as fractions everywhere in the engine.
 */
export function formatPercent(fraction: number, digits = 0): string {
  if (!Number.isFinite(fraction)) return "0%";
  const pct = fraction * 100;
  const sign = pct < 0 ? MINUS : "";
  return `${sign}${trimZeros(Math.abs(pct).toFixed(digits))}%`;
}

/**
 * Signed percentage — market returns, portfolio moves.
 *
 *   formatPercentDelta(-0.14) → "−14%"
 *   formatPercentDelta(0.09)  → "+9%"
 */
export function formatPercentDelta(fraction: number, digits = 0): string {
  if (!Number.isFinite(fraction) || fraction === 0) return "0%";
  const sign = fraction > 0 ? "+" : MINUS;
  return `${sign}${trimZeros((Math.abs(fraction) * 100).toFixed(digits))}%`;
}

/**
 * Runway, in plain language. Runway is the one metric a player feels rather
 * than reads, so it never shows more precision than it has.
 *
 *   formatMonths(0.4)  → "under a month"
 *   formatMonths(1)    → "1 month"
 *   formatMonths(3.7)  → "3.7 months"
 *   formatMonths(99)   → "99+ months"
 */
export function formatMonths(m: number): string {
  if (!Number.isFinite(m) || m < 0) return "0 months";
  if (m >= 99) return "99+ months";
  if (m < 1) return "under a month";
  const rounded = Math.round(m * 10) / 10;
  return `${trimZeros(rounded.toFixed(1))} ${rounded === 1 ? "month" : "months"}`;
}

/**
 * Ordinal month label for the ribbon and report.
 *   formatMonthLabel(1) → "Month 1"
 */
export function formatMonthLabel(month: number): string {
  return `Month ${Math.max(1, Math.round(month))}`;
}
