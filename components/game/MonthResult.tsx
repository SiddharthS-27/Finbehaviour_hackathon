"use client";

import { cn } from "@/lib/utils";
import { formatDelta, formatPercentDelta, formatRupees } from "@/lib/format";
import type { EventCard, MonthRecord } from "@/lib/sim/types";

/**
 * What the month actually did.
 *
 * The ledger comes first, then the consequences that fired, then the debrief.
 * That order matters: the player should see the arithmetic before they are told
 * what it means.
 */

function Row({
  label,
  value,
  tone = "chalk",
}: {
  label: string;
  value: string;
  tone?: "chalk" | "rust" | "mint" | "muted";
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span
        data-money
        className={cn(
          "shrink-0 font-mono text-[13px]",
          tone === "rust"
            ? "text-rust"
            : tone === "mint"
              ? "text-mint"
              : tone === "muted"
                ? "text-muted-foreground"
                : "text-chalk",
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function MonthResult({
  record,
  previousNetWorth,
  event,
  choiceLabel,
}: {
  record: MonthRecord;
  previousNetWorth: number;
  event: EventCard | null;
  choiceLabel: string | null;
}) {
  const delta = record.netWorthEnd - previousNetWorth;
  const alloc = record.allocation;

  return (
    <div className="flex flex-col gap-3">
      {/* headline */}
      <section className="flex flex-col gap-1 rounded-lg border border-line bg-surface p-4">
        <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
          Month {record.month} closed
        </span>
        <div className="flex items-end justify-between gap-3">
          <span
            data-money
            className={cn(
              "font-mono text-3xl leading-none",
              delta < 0 ? "text-rust" : "text-mint",
            )}
          >
            {formatDelta(delta)}
          </span>
          <div className="flex flex-col items-end">
            <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
              Net worth
            </span>
            <span data-money className="font-mono text-lg leading-none text-chalk">
              {formatRupees(record.netWorthEnd)}
            </span>
          </div>
        </div>
      </section>

      {/* ★ consequences arriving from earlier months — the whole mechanism */}
      {record.pendingFired.length > 0 ? (
        <section className="flex flex-col gap-2 rounded-lg border border-marigold/50 bg-marigold/10 p-4">
          <span className="font-mono text-[10px] tracking-widest text-marigold uppercase">
            Arriving from an earlier month
          </span>
          {record.pendingFired.map((note, i) => (
            <p key={i} className="text-[14px] leading-relaxed text-chalk">
              {note}
            </p>
          ))}
        </section>
      ) : null}

      {/* the ledger */}
      <section className="rounded-lg border border-line bg-surface px-4 py-2">
        <Row label="Salary" value={formatDelta(record.incomeReceived)} tone="mint" />
        <div className="h-px w-full bg-line" />
        <Row label="Fixed costs" value={formatDelta(-record.fixedPaid)} />
        {record.premiumsPaid > 0 ? (
          <Row label="Insurance premiums" value={formatDelta(-record.premiumsPaid)} />
        ) : null}
        {record.subscriptionsPaid > 0 ? (
          <Row label="Subscriptions" value={formatDelta(-record.subscriptionsPaid)} />
        ) : null}
        {record.debtMinimumsPaid > 0 ? (
          <Row
            label="Debt minimums"
            value={formatDelta(-record.debtMinimumsPaid)}
            tone={record.missedPayment ? "rust" : "chalk"}
          />
        ) : null}
        <div className="h-px w-full bg-line" />
        {alloc.discretionarySpend > 0 ? (
          <Row label="You spent" value={formatDelta(-alloc.discretionarySpend)} />
        ) : null}
        {alloc.toEmergencyFund > 0 ? (
          <Row label="To emergency fund" value={formatDelta(alloc.toEmergencyFund)} tone="mint" />
        ) : null}
        {alloc.toInvest > 0 ? (
          <Row label="Invested" value={formatDelta(alloc.toInvest)} tone="mint" />
        ) : null}
        {alloc.extraDebtPayment > 0 ? (
          <Row label="Extra debt payment" value={formatDelta(alloc.extraDebtPayment)} tone="mint" />
        ) : null}
        <div className="h-px w-full bg-line" />
        <Row
          label="Market this month"
          value={formatPercentDelta(record.marketReturn, 1)}
          tone={record.marketReturn < 0 ? "rust" : "mint"}
        />
      </section>

      {/* engine notes — cleared debts, overdrafts, burnout */}
      {record.notes.length > 0 ? (
        <section className="flex flex-col gap-1.5 rounded-lg border border-line bg-surface p-4">
          {record.notes.map((note, i) => (
            <p
              key={i}
              className={cn(
                "text-[13px] leading-snug",
                /overdraft|missed|burn/i.test(note) ? "text-rust" : "text-muted-foreground",
              )}
            >
              {note}
            </p>
          ))}
        </section>
      ) : null}

      {/* the debrief — the pedagogical payload */}
      {event && record.choiceId ? (
        <section className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
              You chose
            </span>
            <span className="text-[13px] text-chalk">{choiceLabel}</span>
            <span
              className={cn(
                "rounded-sm border px-1.5 py-0.5 font-mono text-[10px]",
                record.wasOptimalChoice
                  ? "border-mint/50 text-mint"
                  : "border-line text-muted-foreground",
              )}
            >
              {record.wasOptimalChoice ? "optimal" : "not optimal"}
            </span>
          </div>

          <div className="h-px w-full bg-line" />

          <p className="text-[14px] leading-relaxed text-chalk/90">{event.debrief.opening}</p>
          <p className="text-[14px] leading-relaxed text-chalk/90">{event.debrief.proof}</p>
          <div className="rounded-sm border-l-2 border-l-marigold bg-surface2 px-3 py-2">
            <span className="font-mono text-[10px] tracking-widest text-marigold uppercase">
              The rule
            </span>
            <p className="mt-1 text-[14px] leading-relaxed text-chalk">{event.debrief.rule}</p>
          </div>
        </section>
      ) : null}
    </div>
  );
}
