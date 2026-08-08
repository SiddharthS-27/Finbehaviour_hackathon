/**
 * ★ The ribbon is the chart's x-axis.
 *
 * The timeline ribbon and the net-worth chart are stacked and must line up to
 * the pixel — month 7 on the chart has to sit above month 7 on the ribbon or
 * the whole "your line, their line, this month" reading falls apart.
 *
 * That alignment lives here, in one place, so the two components cannot drift.
 * If the ribbon's gap ever changes, it changes here and the chart follows.
 */

/** Gap between ribbon cells, in px. The ribbon sets its own gap from this. */
export const RIBBON_GAP_PX = 3;

/** Width of a single month cell at a given container width. */
export function cellWidth(width: number, months: number): number {
  if (months <= 0) return 0;
  return (width - (months - 1) * RIBBON_GAP_PX) / months;
}

/**
 * The x position of each month *boundary*, from the opening balance to the
 * close of the final month — `months + 1` values.
 *
 * Index 0 is the left edge: the opening balance, before month 1 has happened.
 * Index m is the right edge of cell m, because `netWorthEnd` is the close of
 * that month and belongs at the end of its cell, not floating in the middle.
 */
export function monthBoundaries(width: number, months: number): number[] {
  if (months <= 0 || width <= 0) return [];
  const cell = cellWidth(width, months);
  return Array.from({ length: months + 1 }, (_, m) =>
    m === 0 ? 0 : Math.min(width, m * (cell + RIBBON_GAP_PX) - RIBBON_GAP_PX),
  );
}
