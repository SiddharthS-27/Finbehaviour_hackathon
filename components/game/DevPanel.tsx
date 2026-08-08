"use client";

import { useState } from "react";
import { useLedgerStore } from "@/lib/store";
import { CRITICAL } from "@/lib/sim/bandwidth";
import type { SimState } from "@/lib/sim/types";

/**
 * Development-only controls for forcing near-death states.
 *
 * The Phase 6 gate needs stress above 70, runway under a month and debt above
 * three months of income on demand — none of which a twelve-month run reaches
 * reliably enough to test by playing.
 *
 * Returns null in production, and `devForce` refuses to run there as well. Two
 * guards, because a run that can be edited by hand is no longer reproducible
 * from its seed, and that property is what everything else rests on.
 */
export function DevPanel() {
  const run = useLedgerStore((s) => s.run);
  const devForce = useLedgerStore((s) => s.devForce);
  const [open, setOpen] = useState(false);

  if (process.env.NODE_ENV === "production") return null;
  if (!run) return null;

  const s = run.state;

  const force = (patch: Partial<SimState>) => devForce(patch);

  const buttons: [string, () => void][] = [
    ["stress 75 (lock a slider)", () => force({ stress: CRITICAL.stressLock + 5 })],
    ["stress 90 (timed choices)", () => force({ stress: CRITICAL.stressTimer + 5 })],
    ["stress 0 (recover)", () => force({ stress: 0 })],
    [
      "runway < 1",
      () => force({ cash: 0, emergencyFund: 0 }),
    ],
    [
      "runway healthy",
      () => force({ emergencyFund: Math.max(s.emergencyFund, s.monthlyIncome * 5) }),
    ],
    [
      "debt > 3× income",
      () =>
        force({
          debts: [
            ...s.debts,
            {
              id: `dev-debt-${s.month}`,
              label: "Dev debt",
              kind: "credit_card",
              principal: Math.round(s.monthlyIncome * 3.5),
              apr: 0.42,
              minPaymentPct: 0.05,
              minPaymentFloor: 1000,
              limit: Math.round(s.monthlyIncome * 4),
            },
          ],
        }),
    ],
    ["clear debts", () => force({ debts: [] })],
    ["CIBIL 550", () => force({ creditScore: 550 })],
    ["CIBIL 780", () => force({ creditScore: 780 })],
  ];

  return (
    <div className="rounded-lg border border-dashed border-violet/50 bg-violet/5 p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        data-dev-toggle
        className="touch-target w-full text-left font-mono text-[10px] tracking-widest text-violet uppercase"
      >
        dev · force state {open ? "▾" : "▸"}
      </button>

      {open ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {buttons.map(([label, fn]) => (
            <button
              key={label}
              type="button"
              data-dev-action={label}
              onClick={fn}
              className="rounded-sm border border-violet/40 px-2 py-1.5 font-mono text-[10px] text-violet transition-colors hover:bg-violet/15"
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
