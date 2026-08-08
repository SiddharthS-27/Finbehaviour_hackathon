"use client";

import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { formatRupees } from "@/lib/format";
import { availableDiscretionary, highestAprDebt } from "@/lib/sim/metrics";
import type { Allocation, SimState } from "@/lib/sim/types";
import { formatPercent } from "@/lib/format";

/**
 * Where the month's spare money goes.
 *
 * Four linked sliders sharing one budget: each one's ceiling is its own value
 * plus whatever is still unallocated, so the total can never exceed
 * `availableDiscretionary`. The engine throws if it ever does — a throw here
 * would mean this component failed. (Edge case 3.)
 *
 * Steps are ₹100 for draggability, so the last few rupees are not reachable by
 * dragging. That is what the "+ rest" buttons are for: they assign the exact
 * remainder, which is also how a player gets through twelve months quickly.
 */

const STEP = 100;

interface Row {
  key: keyof Omit<Allocation, "extraDebtTargetId">;
  label: string;
  hint: string;
  tone: "chalk" | "mint" | "marigold" | "rust";
}

const ROWS: Row[] = [
  {
    key: "discretionarySpend",
    label: "Spend",
    hint: "Eating out, going out, the things that make a month bearable.",
    tone: "chalk",
  },
  {
    key: "toEmergencyFund",
    label: "Emergency fund",
    hint: "The buffer. Boring until the month it is the only thing between you and a 42% loan.",
    tone: "mint",
  },
  {
    key: "toInvest",
    label: "Invest",
    hint: "Your SIP. Small now, and the only thing here that compounds.",
    tone: "marigold",
  },
  {
    key: "extraDebtPayment",
    label: "Extra debt payment",
    hint: "On top of the minimums, against your most expensive debt.",
    tone: "rust",
  },
];

export interface AllocationPanelProps {
  state: SimState;
  allocation: Allocation;
  onChange: (patch: Partial<Allocation>) => void;
  /** ★ Phase 6 locks one slider when stress passes 70 — the bandwidth tax. */
  lockedKey?: Row["key"] | null;
  lockedReason?: string;
}

export function AllocationPanel({
  state,
  allocation,
  onChange,
  lockedKey,
  lockedReason,
}: AllocationPanelProps) {
  const available = availableDiscretionary(state);
  const used =
    allocation.discretionarySpend +
    allocation.toEmergencyFund +
    allocation.toInvest +
    allocation.extraDebtPayment;
  const unallocated = Math.max(0, available - used);

  const target = highestAprDebt(state.debts);
  const hasDebt = target !== null;

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-4">
      <header className="flex items-baseline justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="font-display text-xl font-bold text-chalk">What now?</h2>
          <p className="text-[13px] text-muted-foreground">
            Salary landed, bills paid. This is what is left.
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end">
          <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
            To allocate
          </span>
          <span data-money className="font-mono text-xl leading-none text-marigold">
            {formatRupees(available)}
          </span>
        </div>
      </header>

      <div className="h-px w-full bg-line" />

      <div className="flex flex-col gap-5">
        {ROWS.map((row) => {
          const value = allocation[row.key];
          const isDebtRow = row.key === "extraDebtPayment";
          const locked = lockedKey === row.key;
          const disabled = locked || (isDebtRow && !hasDebt) || available === 0;

          // The ceiling that keeps the four sliders inside one budget.
          const max = Math.max(0, value + unallocated);

          const blockedNote = locked
            ? (lockedReason ?? "Locked this month.")
            : isDebtRow && !hasDebt
              ? "No debt left."
              : null;

          return (
            <div key={row.key} className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-2">
                <label className="text-[15px] font-medium text-chalk">{row.label}</label>
                <div className="flex items-center gap-2">
                  {unallocated > 0 && !disabled ? (
                    <button
                      type="button"
                      onClick={() => onChange({ [row.key]: value + unallocated })}
                      className="touch-target rounded-sm border border-line px-2 font-mono text-[11px] text-muted-foreground transition-colors hover:border-marigold hover:text-chalk"
                    >
                      + rest
                    </button>
                  ) : null}
                  <span
                    data-money
                    className={cn(
                      "min-w-[5.5rem] text-right font-mono text-base",
                      value > 0 ? "text-chalk" : "text-muted-foreground/60",
                    )}
                  >
                    {formatRupees(value)}
                  </span>
                </div>
              </div>

              <Slider
                value={[value]}
                min={0}
                max={Math.max(STEP, max)}
                step={STEP}
                disabled={disabled}
                aria-label={row.label}
                onValueChange={([v]) => onChange({ [row.key]: Math.min(v, max) })}
                className={cn(disabled && "opacity-40")}
              />

              <p
                className={cn(
                  "text-[11px] leading-snug",
                  blockedNote ? "text-rust" : "text-muted-foreground",
                )}
              >
                {blockedNote ?? row.hint}
              </p>

              {isDebtRow && hasDebt && value > 0 ? (
                <p className="font-mono text-[11px] text-muted-foreground">
                  → {target.label} @ {formatPercent(target.apr)} ·{" "}
                  {formatRupees(target.principal)} owed
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="h-px w-full bg-line" />

      <div
        className={cn(
          "flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5",
          unallocated === 0 ? "border-line bg-surface2" : "border-marigold/50 bg-marigold/10",
        )}
      >
        <span className="text-[13px] text-muted-foreground">
          {available === 0
            ? "Nothing left to allocate this month."
            : unallocated === 0
              ? "All allocated."
              : "Still unallocated"}
        </span>
        <span
          data-money
          className={cn(
            "font-mono text-base",
            unallocated === 0 ? "text-muted-foreground" : "text-marigold",
          )}
        >
          {formatRupees(unallocated)}
        </span>
      </div>

      {unallocated > 0 ? (
        <button
          type="button"
          onClick={() =>
            onChange({ toEmergencyFund: allocation.toEmergencyFund + unallocated })
          }
          className="touch-target w-full rounded-lg border border-line bg-surface2 text-sm text-chalk transition-colors hover:border-marigold"
        >
          Put the rest in the emergency fund
        </button>
      ) : null}
    </section>
  );
}
