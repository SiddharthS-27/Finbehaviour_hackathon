"use client";

import { cn } from "@/lib/utils";
import type { MonthRecord } from "@/lib/sim/types";
import { RIBBON_GAP_PX } from "@/lib/ribbon-geometry";

/**
 * ★ The signature element.
 *
 * A full-width strip of one cell per month. Past months are filled
 * marigold-tinted, the current month glows, future months are hairline
 * outlines. All the boldness in the app is spent here — everything else stays
 * quiet.
 *
 * The net-worth chart lands directly beneath this in Phase 7 and shares its
 * x-coordinate space, so **the ribbon is the chart's axis**. Keep the cells
 * evenly divided and full-bleed or that stops being true.
 *
 * Colour carries data, per the rule: mint means the optimal choice was taken,
 * rust means something went wrong that month, marigold means it is yours.
 */

export interface RibbonProps {
  totalMonths: number;
  /** 1-indexed; equals totalMonths + 1 once the run is over. */
  currentMonth: number;
  records: MonthRecord[];
  /** Phase 8 makes cells tappable for the what-if replay. */
  onSelect?: (month: number) => void;
  selectedMonth?: number | null;
  /**
   * Slotted directly under the cell row, above the legend — this is where the
   * net-worth chart goes, so it hangs off the ribbon's x-axis with nothing
   * between them.
   */
  below?: React.ReactNode;
}

export function TimelineRibbon({
  totalMonths,
  currentMonth,
  records,
  onSelect,
  selectedMonth,
  below,
}: RibbonProps) {
  const months = Array.from({ length: totalMonths }, (_, i) => i + 1);

  return (
    <div className="flex w-full flex-col gap-1.5">
      {/* The gap comes from the shared geometry module, not a Tailwind literal:
          the net-worth chart below computes its x-positions from the same
          number, and a drift of 3px would visibly de-align the two. */}
      <div
        className="flex w-full"
        style={{ gap: RIBBON_GAP_PX }}
        role="list"
        aria-label="Timeline"
      >
        {months.map((m) => {
          const record = records[m - 1];
          const isPast = m < currentMonth;
          const isCurrent = m === currentMonth;
          const isSelected = selectedMonth === m;

          // A quiet month has a record but no event — the gate was unmet.
          const hadEvent = Boolean(record?.eventId);
          const wasOptimal = record?.wasOptimalChoice ?? false;
          const wentWrong = Boolean(record && record.missedPayment);

          const interactive = Boolean(onSelect) && isPast;

          return (
            <button
              key={m}
              type="button"
              role="listitem"
              disabled={!interactive}
              onClick={interactive ? () => onSelect?.(m) : undefined}
              aria-label={`Month ${m}${hadEvent ? (wasOptimal ? ", optimal choice" : ", suboptimal choice") : ""}`}
              aria-current={isCurrent ? "step" : undefined}
              className={cn(
                // 52px tall: this is the signature element, and Phase 8 makes
                // every cell tappable for the what-if replay — so it has to
                // clear the 44px touch floor before it gets there.
                "relative flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-between rounded-sm border py-2 transition-colors",
                isCurrent
                  ? "border-marigold bg-marigold/25 ring-1 ring-marigold/60"
                  : isPast
                    ? "border-marigold/30 bg-marigold/12"
                    : "border-line bg-transparent",
                isSelected && "border-chalk ring-1 ring-chalk/60",
                interactive && "cursor-pointer hover:bg-marigold/25",
              )}
            >
              {/* Something went wrong this month — a missed payment. */}
              <span
                className={cn(
                  "absolute inset-x-1 top-0 h-[2px] rounded-full",
                  wentWrong ? "bg-rust" : "bg-transparent",
                )}
              />

              <span
                className={cn(
                  "font-mono text-[10px] leading-none tabular-nums",
                  isCurrent ? "text-chalk" : isPast ? "text-chalk/70" : "text-muted-foreground/60",
                )}
              >
                {m}
              </span>

              {/* Event pip: mint for the optimal answer, muted otherwise. */}
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  !hadEvent
                    ? "bg-transparent"
                    : wasOptimal
                      ? "bg-mint"
                      : "bg-muted-foreground/70",
                )}
              />
            </button>
          );
        })}
      </div>

      {below}

      <div className="flex items-center justify-between px-0.5">
        <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
          Month {Math.min(currentMonth, totalMonths)} of {totalMonths}
        </span>
        <span className="flex items-center gap-3 font-mono text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-mint" /> optimal
          </span>
          <span className="flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-muted-foreground/70" /> not optimal
          </span>
        </span>
      </div>
    </div>
  );
}
