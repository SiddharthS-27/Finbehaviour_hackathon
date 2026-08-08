"use client";

import { cn } from "@/lib/utils";
import type { SimState } from "@/lib/sim/types";
import {
  healthBand,
  healthScore,
  highInterestDebt,
  monthlyOutflow,
  netWorth,
  runwayMonths,
} from "@/lib/sim/metrics";
import { formatCompactRupees, formatMonths, formatRupees } from "@/lib/format";

/**
 * The four bars that are always visible: runway, debt, stress, CIBIL.
 *
 * Deliberately dropped from the plan's earlier draft: "surrounding people
 * happiness" — a second economy to balance, and there are not the hours.
 *
 * Critical thresholds turn a bar rust. The full near-death treatment (screen
 * desaturation, the slider lock, notification spam) lands in Phase 6; these
 * bars are where it will read from.
 */

interface BarProps {
  label: string;
  value: string;
  /** 0..1 */
  fill: number;
  tone: "marigold" | "rust" | "mint";
  note?: string;
  critical?: boolean;
}

function Bar({ label, value, fill, tone, note, critical }: BarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 rounded-lg border bg-surface p-3",
        critical ? "border-rust/60" : "border-line",
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
          {label}
        </span>
      </div>
      <span
        data-money
        className={cn(
          "font-mono text-lg leading-none",
          tone === "rust" ? "text-rust" : tone === "mint" ? "text-mint" : "text-chalk",
        )}
      >
        {value}
      </span>
      <div className="h-1 w-full overflow-hidden rounded-full bg-surface2">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500",
            tone === "rust" ? "bg-rust" : tone === "mint" ? "bg-mint" : "bg-marigold",
          )}
          style={{ width: `${Math.max(0, Math.min(1, fill)) * 100}%` }}
        />
      </div>
      {note ? (
        <span className={cn("text-[11px] leading-tight", critical ? "text-rust" : "text-muted-foreground")}>
          {note}
        </span>
      ) : null}
    </div>
  );
}

export function StatBars({ state }: { state: SimState }) {
  const runway = runwayMonths(state);
  const debt = state.debts.reduce((sum, d) => sum + d.principal, 0);
  const expensive = highInterestDebt(state);
  const outflow = monthlyOutflow(state);
  const score = healthScore(state);

  // Debt measured against three months of income — the same yardstick the
  // health score uses, so the bar and the number never disagree.
  const debtCeiling = Math.max(1, state.monthlyIncome * 3);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
            Net worth
          </span>
          <span
            data-money
            className={cn(
              "font-mono text-2xl leading-none",
              netWorth(state) < 0 ? "text-rust" : "text-marigold",
            )}
          >
            {formatRupees(netWorth(state))}
          </span>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
            Health
          </span>
          <span className="font-mono text-lg leading-none text-chalk">
            {score}
            <span className="text-xs text-muted-foreground">/100</span>
          </span>
          <span className="text-[11px] text-muted-foreground">{healthBand(score)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Bar
          label="Runway"
          value={formatMonths(runway)}
          fill={runway / 6}
          tone={runway < 1 ? "rust" : "marigold"}
          critical={runway < 1}
          note={
            runway < 1
              ? "Under a month of cover."
              : `${formatCompactRupees(outflow)}/mo goes out`
          }
        />
        <Bar
          label="Debt"
          value={formatCompactRupees(debt)}
          fill={debt / debtCeiling}
          tone={debt > 0 ? "rust" : "mint"}
          critical={debt > state.monthlyIncome * 3}
          note={
            debt === 0
              ? "Nothing owed."
              : expensive > 0
                ? `${formatCompactRupees(expensive)} of it above 12%`
                : "All of it low-rate"
          }
        />
        <Bar
          label="Stress"
          value={`${Math.round(state.stress)}`}
          fill={state.stress / 100}
          tone={state.stress > 70 ? "rust" : "marigold"}
          critical={state.stress > 70}
          note={
            state.stress > 85
              ? "Decisions are timed now."
              : state.stress > 70
                ? "Bandwidth tax: a slider is locked."
                : undefined
          }
        />
        <Bar
          label="CIBIL"
          value={`${Math.round(state.creditScore)}`}
          // 300 is the floor of the range, not zero — a 600 score is not "half".
          fill={(state.creditScore - 300) / 600}
          tone={state.creditScore < 600 ? "rust" : "marigold"}
          critical={state.creditScore < 600}
          note={state.creditScore < 600 ? "Credit options are closing." : undefined}
        />
      </div>
    </div>
  );
}
