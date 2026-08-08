"use client";

import { useEffect, useRef, useState } from "react";
import type { MonthRecord, Rupees } from "@/lib/sim/types";
import { revealedNetWorth, type OptimalRun } from "@/lib/sim/agent";
import { formatCompactRupees, formatDelta } from "@/lib/format";
import { monthBoundaries } from "@/lib/ribbon-geometry";

/**
 * ★ Two lines, one chart, and the gap is a real number.
 *
 * Marigold is you. Mint is the shadow agent — a textbook policy that played the
 * identical world: same pack, same market, same gates, same locked slider. The
 * only difference is the decisions, which is the only reason the gap means
 * anything.
 *
 * **The optimal line is revealed only as far as the player has played.** Seeing
 * it arc to month twelve would turn every remaining decision into a lookup. The
 * gap is worth something precisely because it is earned one month at a time.
 *
 * It sits directly beneath the ribbon and shares its x-axis to the pixel — see
 * `lib/ribbon-geometry.ts`, which owns that alignment for both components.
 */

const HEIGHT = 104;
/** Breathing room above and below the data, as a fraction of the range. */
const PAD = 0.12;

/** Container width, measured. The x-axis is pixel-shared with the ribbon, so it
 *  cannot be faked with percentages — the 3px cell gaps would drift. */
function useMeasuredWidth() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return { ref, width };
}

function polyline(xs: number[], ys: number[]): string {
  return xs.map((x, i) => `${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
}

/** The road not taken — the what-if replay, drawn over the real lines. */
export interface AlternateSeries {
  month: number;
  label: string;
  netWorthByMonth: Rupees[];
}

export interface NetWorthChartProps {
  totalMonths: number;
  /** Both lines start from this shared point, so the gap opens visibly. */
  openingNetWorth: Rupees;
  records: MonthRecord[];
  optimal: OptimalRun | null;
  reducedMotion?: boolean;
  /**
   * Drawn dashed in chalk, deliberately **not** in one of the four palette
   * colours: marigold is you, mint is the benchmark, rust is debt. A hypothetical
   * is not data about your money, so it does not get to borrow a data colour.
   */
  alternate?: AlternateSeries | null;
}

export function NetWorthChart({
  totalMonths,
  openingNetWorth,
  records,
  optimal,
  reducedMotion = false,
  alternate = null,
}: NetWorthChartProps) {
  const { ref, width } = useMeasuredWidth();

  const completed = records.length;
  const you: Rupees[] = [openingNetWorth, ...records.map((r) => r.netWorthEnd)];
  // ★ Never further than the player has got. This is the whole rule.
  const them: Rupees[] = optimal ? revealedNetWorth(optimal, completed) : [];

  const yourNow = you[you.length - 1];
  const theirNow = them.length > 0 ? them[them.length - 1] : null;
  const gap = theirNow === null ? null : theirNow - yourNow;

  const alt = alternate?.netWorthByMonth ?? [];

  /* ── scales ──
     One shared y-domain across every series, or the gap would be a lie. */
  const values = [...you, ...them, ...alt];
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || Math.max(1000, Math.abs(hi) * 0.1);
  const yMin = lo - span * PAD;
  const yMax = hi + span * PAD;

  const xs = monthBoundaries(width, totalMonths);
  const toY = (v: Rupees) => HEIGHT - ((v - yMin) / (yMax - yMin)) * HEIGHT;

  const youXs = xs.slice(0, you.length);
  const themXs = xs.slice(0, them.length);
  const youYs = you.map(toY);
  const themYs = them.map(toY);

  const zeroY = yMin < 0 && yMax > 0 ? toY(0) : null;
  const ready = width > 0 && xs.length > 0;

  return (
    <figure
      className="flex w-full flex-col gap-1.5"
      data-testid="networth-chart"
      data-revealed-month={completed}
      data-you-points={you.length}
      data-optimal-points={them.length}
    >
      <div ref={ref} className="relative w-full" style={{ height: HEIGHT }}>
        {ready ? (
          <svg
            width={width}
            height={HEIGHT}
            viewBox={`0 0 ${width} ${HEIGHT}`}
            className="block overflow-visible"
            role="img"
            aria-label={
              theirNow === null
                ? `Your net worth: ${formatCompactRupees(yourNow)}.`
                : `Your net worth ${formatCompactRupees(yourNow)}. The optimal path ${formatCompactRupees(theirNow)}. A gap of ${formatCompactRupees(Math.abs(gap ?? 0))}.`
            }
          >
            {/* Zero. A hairline, not a colour — colour carries data here. */}
            {zeroY !== null ? (
              <line
                x1={0}
                x2={width}
                y1={zeroY}
                y2={zeroY}
                stroke="var(--line)"
                strokeWidth={1}
                strokeDasharray="2 4"
              />
            ) : null}

            {/* The gap itself, shaded. Reads before either line does. */}
            {theirNow !== null && them.length > 1 ? (
              <polygon
                points={`${polyline(themXs, themYs)} ${polyline(
                  [...youXs.slice(0, them.length)].reverse(),
                  [...youYs.slice(0, them.length)].reverse(),
                )}`}
                fill="var(--mint)"
                opacity={0.1}
              />
            ) : null}

            {/* mint — the shadow agent */}
            {them.length > 1 ? (
              <polyline
                data-series="optimal"
                points={polyline(themXs, themYs)}
                fill="none"
                stroke="var(--mint)"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}

            {/* the road not taken — dashed chalk, never a data colour */}
            {alt.length > 1 ? (
              <>
                <polyline
                  data-series="alternate"
                  points={polyline(xs.slice(0, alt.length), alt.map(toY))}
                  fill="none"
                  stroke="var(--chalk)"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  opacity={0.75}
                  strokeLinecap="round"
                />
                {/* Where the timeline forked. */}
                <line
                  data-series="fork"
                  x1={xs[alternate!.month - 1]}
                  x2={xs[alternate!.month - 1]}
                  y1={0}
                  y2={HEIGHT}
                  stroke="var(--chalk)"
                  strokeWidth={1}
                  opacity={0.3}
                />
              </>
            ) : null}

            {/* marigold — you. Drawn last so it is never hidden under theirs. */}
            {you.length > 1 ? (
              <polyline
                data-series="you"
                points={polyline(youXs, youYs)}
                fill="none"
                stroke="var(--marigold)"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}

            {theirNow !== null ? (
              <circle
                data-series="optimal-head"
                cx={themXs[themXs.length - 1]}
                cy={themYs[themYs.length - 1]}
                r={3}
                fill="var(--mint)"
              />
            ) : null}
            <circle
              data-series="you-head"
              cx={youXs[youXs.length - 1]}
              cy={youYs[youYs.length - 1]}
              r={3.5}
              fill="var(--marigold)"
            >
              {/* A quiet pulse on your own position. Dropped under reduced
                  motion — it is decoration, and the dot reads fine without it. */}
              {reducedMotion ? null : (
                <animate
                  attributeName="opacity"
                  values="1;0.45;1"
                  dur="2.4s"
                  repeatCount="indefinite"
                />
              )}
            </circle>
          </svg>
        ) : null}
      </div>

      <figcaption className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-3 font-mono text-[10px] whitespace-nowrap">
          <span className="flex items-center gap-1 text-marigold">
            <span className="h-[2px] w-3 rounded-full bg-marigold" />
            you {formatCompactRupees(yourNow)}
          </span>
          {theirNow !== null ? (
            <span className="flex items-center gap-1 text-mint">
              <span className="h-[2px] w-3 rounded-full bg-mint" />
              optimal {formatCompactRupees(theirNow)}
            </span>
          ) : null}
          {alt.length > 1 ? (
            <span className="flex items-center gap-1 text-chalk/80">
              <span className="h-[2px] w-3 rounded-full border-t border-dashed border-chalk/80" />
              if you had {formatCompactRupees(alt[alt.length - 1])}
            </span>
          ) : null}
        </span>

        {gap !== null && completed > 0 ? (
          <span
            data-testid="networth-gap"
            className="font-mono text-[10px] whitespace-nowrap text-muted-foreground"
          >
            {gap > 0
              ? `${formatCompactRupees(gap)} behind`
              : gap < 0
                ? `${formatCompactRupees(-gap)} ahead`
                : "dead level"}
          </span>
        ) : (
          <span className="font-mono text-[10px] text-muted-foreground">
            the lines start after month 1
          </span>
        )}
      </figcaption>
    </figure>
  );
}

/** Exported for the report, where the delta is spelled out rather than implied. */
export function formatGap(gap: Rupees): string {
  return formatDelta(-gap);
}
