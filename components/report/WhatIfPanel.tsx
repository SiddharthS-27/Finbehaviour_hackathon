"use client";

import { cn } from "@/lib/utils";
import type { EventCard } from "@/lib/sim/types";
import type { WhatIf } from "@/lib/sim/counterfactual";
import { formatCompactRupees } from "@/lib/format";

/**
 * ★ What one different decision would have been worth.
 *
 * Tap a month on the ribbon, see every option that card offered and what each
 * would have left you with. The alternate line draws over your own; the number
 * is the delta at month twelve.
 *
 * Options the player *could not* have taken are shown disabled with the reason.
 * Hiding them would hide the lesson — "you did not have the liquidity for this"
 * is the most useful thing the panel can say about some months.
 */

export function WhatIfPanel({
  month,
  event,
  takenChoiceId,
  results,
  selectedChoiceId,
  onSelect,
  onClose,
}: {
  month: number;
  event: EventCard | null;
  takenChoiceId: string | null;
  results: WhatIf[];
  selectedChoiceId: string | null;
  onSelect: (choiceId: string | null) => void;
  onClose: () => void;
}) {
  return (
    <section
      className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4"
      data-testid="whatif-panel"
      data-whatif-month={month}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
            Month {month} · what if
          </span>
          <h3 className="font-display text-lg leading-tight font-bold text-chalk">
            {event ? event.title : "A quiet month"}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="touch-target shrink-0 rounded-sm border border-line px-3 font-mono text-[10px] text-muted-foreground transition-colors hover:border-chalk hover:text-chalk"
        >
          close
        </button>
      </header>

      {!event ? (
        <p className="text-[13px] leading-snug text-muted-foreground">
          Nothing landed this month, so there is nothing to replay. Quiet months are where the
          compounding actually happens.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {results.map((result) => {
            const isTaken = result.choiceId === takenChoiceId;
            const isSelected = result.choiceId === selectedChoiceId;

            return (
              <button
                key={result.choiceId}
                type="button"
                data-whatif-choice={result.choiceId}
                disabled={!result.available || isTaken}
                onClick={() => onSelect(isSelected ? null : result.choiceId)}
                className={cn(
                  "flex min-h-[52px] w-full flex-col items-start gap-1 rounded-sm border px-3 py-2.5 text-left transition-colors",
                  isTaken
                    ? "cursor-default border-marigold/50 bg-marigold/10"
                    : !result.available
                      ? "cursor-not-allowed border-line/60 bg-surface2/40"
                      : isSelected
                        ? "border-chalk bg-surface2"
                        : "border-line bg-surface2 hover:border-chalk/60",
                )}
              >
                <span className="flex w-full items-baseline justify-between gap-3">
                  <span
                    className={cn(
                      "text-[14px] leading-snug",
                      result.available || isTaken ? "text-chalk" : "text-muted-foreground",
                    )}
                  >
                    {result.choiceLabel}
                  </span>

                  {isTaken ? (
                    <span className="shrink-0 font-mono text-[10px] tracking-widest text-marigold uppercase">
                      you chose this
                    </span>
                  ) : result.available ? (
                    <span
                      data-whatif-delta={result.delta}
                      className={cn(
                        "shrink-0 font-mono text-[13px]",
                        result.delta > 0 ? "text-mint" : result.delta < 0 ? "text-rust" : "text-muted-foreground",
                      )}
                    >
                      {result.delta === 0
                        ? "no change"
                        : `${result.delta > 0 ? "+" : "−"}${formatCompactRupees(Math.abs(result.delta))}`}
                    </span>
                  ) : null}
                </span>

                {!result.available && result.reason ? (
                  <span className="text-[12px] leading-snug text-muted-foreground">
                    {result.reason}
                  </span>
                ) : null}
              </button>
            );
          })}

          <p className="text-[11px] leading-snug text-muted-foreground">
            Same market, same months, same everything else you did. Only this one decision changes —
            which is what makes the number worth reading.
          </p>
        </div>
      )}
    </section>
  );
}
