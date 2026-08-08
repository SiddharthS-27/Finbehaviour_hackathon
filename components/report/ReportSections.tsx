"use client";

import { cn } from "@/lib/utils";
import { formatCompactRupees, formatDelta, formatRupees } from "@/lib/format";
import type { Archetype, DecisionRow, Mastery, ReportData } from "@/lib/ai/fallbacks";
import type { CostliestDecision } from "@/lib/sim/counterfactual";

/**
 * The report, in pieces.
 *
 * Every number on this screen was computed in TypeScript and handed here as a
 * fact — CLAUDE.md rule 3. When Phase 9 adds the model it rewrites the *prose*
 * around these figures and is forbidden from producing one of its own.
 *
 * Copy rule that applies to all of it: never shame. When the gap is large the
 * job is to show where it opened, not to say you failed.
 */

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
      {children}
    </h2>
  );
}

/* ─────────────────────────── archetype ───────────────────────── */

export function ArchetypeCard({
  archetype,
  playerName,
}: {
  archetype: Archetype;
  playerName: string;
}) {
  return (
    <section className="flex flex-col gap-2" data-testid="archetype" data-archetype={archetype.id}>
      <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
        {playerName ? `${playerName}, after twelve months` : "After twelve months"}
      </span>
      <h1 className="font-display text-4xl leading-none font-bold text-marigold">
        {archetype.name}
      </h1>
      <p className="text-[15px] leading-snug text-chalk">{archetype.tagline}</p>
      <p className="text-[14px] leading-relaxed text-chalk/80">{archetype.description}</p>
    </section>
  );
}

/* ────────────────────────── the gap ──────────────────────────── */

export function GapAnnotation({ summary, beat }: { summary: ReportData["summary"]; beat: boolean }) {
  const magnitude = Math.abs(summary.gapRupees);

  return (
    <section
      className={cn(
        "flex flex-col gap-2 rounded-lg border p-4",
        beat ? "border-mint/50 bg-mint/10" : "border-line bg-surface",
      )}
      data-testid="gap"
      data-gap-rupees={summary.gapRupees}
    >
      <SectionHeading>{beat ? "You beat the benchmark" : "The gap"}</SectionHeading>

      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            "font-mono text-3xl leading-none",
            beat ? "text-mint" : "text-marigold",
          )}
        >
          {formatRupees(magnitude)}
        </span>
        <span className="text-[13px] text-muted-foreground">
          {beat ? "ahead of the textbook policy" : "behind the textbook policy"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-1">
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-[10px] tracking-widest text-marigold uppercase">you</span>
          <span className="font-mono text-[15px] text-chalk">
            {formatRupees(summary.finalNetWorth)}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-[10px] tracking-widest text-mint uppercase">optimal</span>
          <span className="font-mono text-[15px] text-chalk">
            {formatRupees(summary.optimalNetWorth)}
          </span>
        </div>
      </div>

      <p className="text-[12px] leading-snug text-muted-foreground">
        The benchmark played your exact year — same events, same market, same locked sliders. It
        also allowed itself ₹3,000 a month to live on. Only the decisions differed.
      </p>
    </section>
  );
}

/* ──────────────────── costliest decisions ────────────────────── */

export function CostliestDecisions({
  decisions,
  nothingCostlyReason,
}: {
  decisions: CostliestDecision[];
  nothingCostlyReason: ReportData["nothingCostlyReason"];
}) {
  if (decisions.length === 0) {
    return (
      <section
        className="flex flex-col gap-2"
        data-testid="costliest"
        data-costliest-count={0}
        data-nothing-costly={nothingCostlyReason ?? ""}
      >
        <SectionHeading>What it cost you</SectionHeading>
        {/* Getting everything right and getting away with it are different
            things. Congratulating the second as if it were the first would
            teach exactly the wrong lesson. */}
        <p className="text-[14px] leading-relaxed text-chalk/80">
          {nothingCostlyReason === "flawless"
            ? "Nothing. You took the authored answer every time it mattered, so there is no month where a different call would have left you better off."
            : "Nothing — but not because every call was right. There is no month where the better answer would have paid more, which means the market ran your way. That is not the same as being right, and it will not repeat."}
        </p>
      </section>
    );
  }

  return (
    <section
      className="flex flex-col gap-3"
      data-testid="costliest"
      data-costliest-count={decisions.length}
    >
      <SectionHeading>What it cost you</SectionHeading>

      {decisions.map((d, i) => (
        <article
          key={d.month}
          data-costliest-month={d.month}
          data-costliest-cost={d.costRupees}
          className="flex flex-col gap-1.5 rounded-lg border border-line bg-surface p-4"
        >
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
              {i + 1} · month {d.month}
            </span>
            <span className="shrink-0 font-mono text-lg text-rust">
              {formatCompactRupees(d.costRupees)}
            </span>
          </div>

          <h3 className="font-display text-lg leading-tight font-bold text-chalk">{d.eventTitle}</h3>

          <p className="text-[13px] leading-snug text-chalk/80">
            You took <span className="text-chalk">{d.yourChoiceLabel}</span>. Taking{" "}
            <span className="text-mint">{d.betterChoiceLabel}</span> instead would have left you{" "}
            {formatCompactRupees(d.costRupees)} better off by month twelve.
          </p>

          <p className="border-t border-line pt-2 text-[13px] leading-snug text-chalk">{d.lesson}</p>
        </article>
      ))}
    </section>
  );
}

/* ───────────────────────── decision grid ─────────────────────── */

export function DecisionGrid({ rows }: { rows: DecisionRow[] }) {
  return (
    <section className="flex flex-col gap-2" data-testid="decision-grid">
      <SectionHeading>Every month</SectionHeading>

      <div className="overflow-hidden rounded-lg border border-line">
        {rows.map((row, i) => (
          <div
            key={row.month}
            data-decision-month={row.month}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5",
              i > 0 && "border-t border-line",
              row.quiet && "bg-surface/40",
            )}
          >
            <span className="w-5 shrink-0 font-mono text-[12px] text-muted-foreground tabular-nums">
              {row.month}
            </span>

            <span
              aria-hidden
              className={cn(
                "size-1.5 shrink-0 rounded-full",
                row.quiet ? "bg-transparent" : row.wasOptimal ? "bg-mint" : "bg-muted-foreground/70",
              )}
            />

            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] leading-snug text-chalk">
                {row.choiceLabel ?? (row.quiet ? "A quiet month" : "No choice recorded")}
              </span>
              {row.eventTitle ? (
                <span className="block truncate text-[11px] text-muted-foreground">
                  {row.eventTitle}
                </span>
              ) : null}
            </span>

            <span
              className={cn(
                "shrink-0 font-mono text-[12px] tabular-nums",
                row.netWorthDelta > 0
                  ? "text-mint"
                  : row.netWorthDelta < 0
                    ? "text-rust"
                    : "text-muted-foreground",
              )}
            >
              {formatDelta(row.netWorthDelta, { compact: true })}
            </span>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-muted-foreground">
        Tap any month on the ribbon above to replay it with a different answer.
      </p>
    </section>
  );
}

/* ────────────────────────── mastery ──────────────────────────── */

const MASTERY_STYLE: Record<Mastery["level"], string> = {
  solid: "border-mint/60 bg-mint/15 text-mint",
  getting_there: "border-marigold/60 bg-marigold/12 text-marigold",
  shaky: "border-rust/60 bg-rust/12 text-rust",
  untested: "border-line bg-surface2 text-muted-foreground",
};

const MASTERY_LABEL: Record<Mastery["level"], string> = {
  solid: "solid",
  getting_there: "getting there",
  shaky: "caught you",
  untested: "untested",
};

export function MasteryChips({ mastery }: { mastery: Mastery[] }) {
  if (mastery.length === 0) return null;

  return (
    <section className="flex flex-col gap-2" data-testid="mastery">
      <SectionHeading>What you know now</SectionHeading>
      <div className="flex flex-wrap gap-1.5">
        {mastery.map((m) => (
          <span
            key={m.conceptId}
            data-mastery-concept={m.conceptId}
            data-mastery-level={m.level}
            title={m.oneLiner}
            className={cn(
              "flex items-baseline gap-1.5 rounded-sm border px-2.5 py-1.5",
              MASTERY_STYLE[m.level],
            )}
          >
            <span className="text-[12px]">{m.name}</span>
            <span className="font-mono text-[10px] opacity-80">
              {m.correct}/{m.seen} · {MASTERY_LABEL[m.level]}
            </span>
          </span>
        ))}
      </div>
    </section>
  );
}

/* ───────────────────────── badge shelf ───────────────────────── */

export function BadgeShelf({ badges }: { badges: ReportData["badges"] }) {
  const earned = badges.filter((b) => b.earned).length;

  return (
    <section className="flex flex-col gap-2" data-testid="badges" data-badges-earned={earned}>
      <SectionHeading>
        Badges · {earned} of {badges.length}
      </SectionHeading>

      <div className="grid grid-cols-2 gap-2">
        {badges.map((b) => (
          <div
            key={b.id}
            data-badge={b.id}
            data-badge-earned={b.earned ? "1" : "0"}
            className={cn(
              "flex flex-col gap-0.5 rounded-sm border px-3 py-2.5",
              b.earned ? "border-marigold/50 bg-marigold/10" : "border-line bg-transparent",
            )}
          >
            <span
              className={cn(
                "text-[13px] leading-snug",
                b.earned ? "text-chalk" : "text-muted-foreground",
              )}
            >
              {b.label}
            </span>
            <span
              className={cn(
                "text-[11px] leading-snug",
                b.earned ? "text-chalk/70" : "text-muted-foreground/60",
              )}
            >
              {b.description}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ──────────────────── strengths and next up ──────────────────── */

export function StrengthsAndNext({
  strengths,
  nextConcepts,
}: {
  strengths: string[];
  nextConcepts: ReportData["nextConcepts"];
}) {
  return (
    <div className="flex flex-col gap-5">
      {strengths.length > 0 ? (
        <section className="flex flex-col gap-2" data-testid="strengths">
          <SectionHeading>What you did well</SectionHeading>
          <ul className="flex flex-col gap-1.5">
            {strengths.map((s) => (
              <li key={s} className="flex gap-2 text-[14px] leading-snug text-chalk/85">
                <span aria-hidden className="mt-[7px] size-1.5 shrink-0 rounded-full bg-mint" />
                {s}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="flex flex-col gap-2" data-testid="next-concepts">
        <SectionHeading>Learn these next</SectionHeading>
        <ul className="flex flex-col gap-2">
          {nextConcepts.map((c) => (
            <li key={c.id} data-next-concept={c.id} className="flex flex-col gap-0.5">
              <span className="text-[14px] leading-snug text-chalk">{c.name}</span>
              <span className="text-[12px] leading-snug text-muted-foreground">{c.why}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/* ────────────────── theory vs practice, closing ──────────────── */

export function TheoryPracticeGap({ text }: { text: string }) {
  return (
    <section
      className="flex flex-col gap-1.5 rounded-lg border border-violet/40 bg-violet/8 p-4"
      data-testid="theory-practice-gap"
    >
      <SectionHeading>Knowing it and doing it</SectionHeading>
      <p className="text-[14px] leading-relaxed text-chalk">{text}</p>
    </section>
  );
}

export function ClosingLine({
  text,
  source = "fallback",
}: {
  text: string;
  source?: "ai" | "fallback";
}) {
  return (
    <div className="flex flex-col gap-2 border-t border-line pt-5">
      <p
        data-testid="closing-line"
        className="font-display text-xl leading-snug font-bold text-chalk"
      >
        {text}
      </p>
      {/* Say which words were generated. Every figure on this page was computed
          either way, and claiming a model's prose as our own would be the
          cheapest possible dishonesty. */}
      {source === "ai" ? (
        <p data-testid="ai-attribution" className="text-[11px] text-muted-foreground">
          The wording above was written by the coach. Every rupee figure on this page was computed
          from your run.
        </p>
      ) : null}
    </div>
  );
}
