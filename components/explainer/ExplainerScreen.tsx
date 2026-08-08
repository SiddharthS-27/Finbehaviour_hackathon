"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { packForRun, useLedgerStore } from "@/lib/store";
import { useGuard } from "@/lib/hooks/useGuard";
import { CONCEPTS, conceptById } from "@/content/concepts";
import { mastery, type Mastery } from "@/lib/ai/fallbacks";
import { AppHeader } from "@/components/chrome/AppHeader";
import type { LiteracyLevel } from "@/lib/sim/types";

/**
 * The concept library.
 *
 * ★ Fully authored, fully offline, no API key. Sixteen concepts written at
 * three depths each — the diagnostic picks the depth, and the reader can
 * override it, because "explain it like I already know this" and "explain it
 * again, simpler" are both things people want mid-sentence.
 *
 * Colour still carries data: a chip is mint where the run showed you had it,
 * rust where it caught you. Concepts the run never tested stay quiet rather
 * than being scored on nothing.
 */

const DEPTHS: { level: LiteracyLevel; label: string; blurb: string }[] = [
  { level: 1, label: "Plain", blurb: "No jargon" },
  { level: 2, label: "Standard", blurb: "Everyday terms" },
  { level: 3, label: "Technical", blurb: "Assumes fluency" },
];

const TIERS: { tier: 1 | 2 | 3; title: string; blurb: string }[] = [
  { tier: 1, title: "Start here", blurb: "The five that everything else rests on." },
  { tier: 2, title: "Next", blurb: "Where money quietly leaks." },
  { tier: 3, title: "The long game", blurb: "What compounds, and what compounds against you." },
];

function Skeleton() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-4 px-5 pt-6">
      <div className="h-9 w-full rounded-sm bg-surface2" />
      <div className="h-12 w-2/3 rounded-sm bg-surface2" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-20 w-full rounded-lg bg-surface" />
      ))}
    </main>
  );
}

function MasteryChip({ entry }: { entry: Mastery }) {
  const style =
    entry.level === "solid"
      ? "border-mint/60 bg-mint/15 text-mint"
      : entry.level === "getting_there"
        ? "border-marigold/60 bg-marigold/12 text-marigold"
        : "border-rust/60 bg-rust/12 text-rust";

  const label =
    entry.level === "solid"
      ? "you had this"
      : entry.level === "getting_there"
        ? `${entry.correct} of ${entry.seen}`
        : "caught you";

  return (
    <span
      data-mastery-level={entry.level}
      className={cn("shrink-0 rounded-sm border px-2 py-0.5 font-mono text-[10px]", style)}
    >
      {label}
    </span>
  );
}

export function ExplainerScreen() {
  const { ready } = useGuard({ requireAuth: true, requireOnboarded: true });

  const profile = useLedgerStore((s) => s.profile);
  const run = useLedgerStore((s) => s.run);

  const [depth, setDepth] = useState<LiteracyLevel | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  /* What the run actually tested. Mid-run history counts — the most useful
     moment to look something up is right after it went wrong. */
  const byConcept = useMemo(() => {
    if (!run || run.state.history.length === 0) return new Map<string, Mastery>();
    return new Map(
      mastery(packForRun(run), run.state.history).map((m) => [m.conceptId, m]),
    );
  }, [run]);

  if (!ready) return <Skeleton />;

  const level: LiteracyLevel = depth ?? profile.literacyLevel;
  const needle = query.trim().toLowerCase();

  const matches = CONCEPTS.filter((c) => {
    if (!needle) return true;
    return (
      c.name.toLowerCase().includes(needle) ||
      c.oneLiner.toLowerCase().includes(needle) ||
      c.explanations[level].toLowerCase().includes(needle)
    );
  });

  return (
    <main
      data-testid="explainer"
      data-depth={level}
      data-concept-count={matches.length}
      className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-5 pt-5 pb-safe"
    >
      <AppHeader backHref="/home" eyebrow="Explainer" />

      <div className="flex flex-col gap-2 pb-6">
        <h1 className="font-display text-3xl leading-tight font-bold text-chalk sm:text-4xl">
          Every idea the game uses
        </h1>
        <p className="text-[14px] leading-snug text-muted-foreground">
          Written three ways. Read it at whichever depth is useful right now — the level below is
          the one the quick check picked for you.
        </p>
      </div>

      {/* depth */}
      <div className="flex gap-1.5 pb-4" role="group" aria-label="Explanation depth">
        {DEPTHS.map((d) => (
          <button
            key={d.level}
            type="button"
            data-depth-option={d.level}
            aria-pressed={level === d.level}
            onClick={() => setDepth(d.level)}
            className={cn(
              "touch-target flex flex-1 flex-col items-center justify-center rounded-sm border px-2 transition-colors",
              level === d.level
                ? "border-marigold bg-marigold/12 text-chalk"
                : "border-line bg-surface text-muted-foreground hover:bg-surface2",
            )}
          >
            <span className="text-[13px] leading-none font-medium">{d.label}</span>
            <span className="pt-0.5 text-[10px] leading-none opacity-70">{d.blurb}</span>
          </button>
        ))}
      </div>

      <input
        data-testid="explainer-search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search — try “interest”, “buffer”, “OTP”"
        className="h-12 w-full rounded-lg border border-line bg-surface px-4 text-[16px] text-chalk placeholder:text-muted-foreground/70 focus:border-marigold focus:outline-none"
      />

      <div className="flex flex-col gap-7 pt-6 pb-10">
        {TIERS.map((group) => {
          const inTier = matches.filter((c) => c.tier === group.tier);
          if (inTier.length === 0) return null;

          return (
            <section key={group.tier} className="flex flex-col gap-2">
              <div className="flex flex-col gap-0.5">
                <h2 className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                  {group.title}
                </h2>
                <p className="text-[12px] text-muted-foreground/80">{group.blurb}</p>
              </div>

              {inTier.map((concept) => {
                const isOpen = open === concept.id;
                const scored = byConcept.get(concept.id);

                return (
                  <article
                    key={concept.id}
                    id={concept.id}
                    data-concept={concept.id}
                    data-open={isOpen ? "1" : "0"}
                    className={cn(
                      "flex flex-col overflow-hidden rounded-lg border bg-surface transition-colors",
                      isOpen ? "border-marigold/60" : "border-line hover:border-marigold/40",
                    )}
                  >
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setOpen(isOpen ? null : concept.id)}
                      className="flex min-h-[60px] w-full items-center gap-3 px-4 py-3 text-left"
                    >
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="text-[15px] leading-snug font-medium text-chalk">
                          {concept.name}
                        </span>
                        <span className="text-[13px] leading-snug text-muted-foreground">
                          {concept.oneLiner}
                        </span>
                      </span>
                      {scored ? <MasteryChip entry={scored} /> : null}
                      <span
                        aria-hidden
                        className={cn(
                          "shrink-0 font-mono text-muted-foreground transition-transform",
                          isOpen && "rotate-90",
                        )}
                      >
                        ›
                      </span>
                    </button>

                    {isOpen ? (
                      <div className="flex flex-col gap-3 border-t border-line px-4 py-4">
                        <p
                          data-concept-body
                          className="text-[14px] leading-relaxed text-chalk/90"
                        >
                          {concept.explanations[level]}
                        </p>

                        {concept.prerequisites.length > 0 ? (
                          <p className="text-[12px] text-muted-foreground">
                            Rests on{" "}
                            {concept.prerequisites.map((id, i) => (
                              <span key={id}>
                                {i > 0 ? ", " : ""}
                                <button
                                  type="button"
                                  onClick={() => setOpen(id)}
                                  className="text-marigold hover:underline"
                                >
                                  {conceptById(id)?.name ?? id}
                                </button>
                              </span>
                            ))}
                            .
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </section>
          );
        })}

        {matches.length === 0 ? (
          <p className="py-8 text-center text-[14px] text-muted-foreground">
            Nothing matches “{query}”. Try a plainer word — these are written to be searched the way
            you would say them out loud.
          </p>
        ) : null}
      </div>
    </main>
  );
}
