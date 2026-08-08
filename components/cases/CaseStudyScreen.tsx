"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useGuard } from "@/lib/hooks/useGuard";
import { useCaseAnswer } from "@/lib/hooks/useAi";
import { fallbackAnswer } from "@/lib/cases";
import { caseById, type CaseConcept, type CaseStudy } from "@/content/case-studies";
import { AppHeader } from "@/components/chrome/AppHeader";
import { DecoyLab } from "./DecoyLab";

/**
 * One case study, read or played.
 *
 * A `simulation` case mounts its interactive above the writing; an
 * `explanation` case is the writing. Everything below the fold — mechanics,
 * behaviour, lesson, sources, follow-up — is identical for both, because the
 * mode changes how a case opens, not what a case is.
 */

function Skeleton() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-4 px-5 pt-6">
      <div className="h-9 w-2/3 rounded-sm bg-surface2" />
      <div className="h-40 w-full rounded-lg bg-surface" />
      <div className="h-24 w-full rounded-lg bg-surface" />
    </main>
  );
}

function ConceptList({ title, items }: { title: string; items: CaseConcept[] }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
        {title}
      </h2>
      <div className="flex flex-col gap-3">
        {items.map((c) => (
          <div key={c.term} className="flex flex-col gap-1 rounded-lg border border-line bg-surface p-4">
            <h3 className="text-[15px] font-medium text-chalk">{c.term}</h3>
            <p className="text-[14px] leading-relaxed text-chalk/80">{c.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * The illustrative path.
 *
 * Bars rather than a line, and labelled "illustrative" in the caption: these
 * are the milestones the sources name, not a tick-by-tick series, and drawing a
 * smooth line through six points would imply a precision the data does not have.
 */
function Timeline({ timeline }: { timeline: NonNullable<CaseStudy["timeline"]> }) {
  const peak = Math.max(...timeline.points.map((p) => p.value), 1);

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4">
      <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
        The path, in the milestones the sources name
      </span>
      <div className="flex flex-col gap-2.5">
        {timeline.points.map((p) => (
          <div key={p.label} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-mono text-[12px] text-muted-foreground">{p.label}</span>
              <span className="font-mono text-[14px] text-chalk tabular-nums">
                {timeline.currency}
                {p.value}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-marigold"
                style={{ width: `${Math.max(2, (p.value / peak) * 100)}%` }}
              />
            </div>
            {p.note ? (
              <p className="text-[12px] leading-snug text-muted-foreground">{p.note}</p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * ★ The follow-up box.
 *
 * The authored answer renders the instant a question is submitted, from
 * `fallbackAnswer` — a pure keyword match over the case's own FAQ. A generated
 * answer replaces it if and when one arrives, and if none ever does, nobody is
 * told anything is missing. With no `GEMINI_API_KEY` no request leaves the
 * device at all and this still answers. (CLAUDE.md rule 4.)
 */
function FollowUp({ study }: { study: CaseStudy }) {
  const [draft, setDraft] = useState("");
  const [asked, setAsked] = useState<string | null>(null);

  const authored = useMemo(
    () => (asked === null ? null : fallbackAnswer(study, asked)),
    [study, asked],
  );

  const request = useMemo(
    () =>
      asked === null || authored === null
        ? null
        : {
            caseId: study.id,
            title: study.title,
            category: study.category,
            summary: study.summary,
            keyLesson: study.keyLesson,
            concepts: [...study.coreConcepts, ...study.behaviouralConcepts].map((c) => ({
              term: c.term,
              body: c.body,
            })),
            authoredAnswer: authored.text,
            question: asked,
          },
    [study, asked, authored],
  );

  const { text: ai, pending } = useCaseAnswer(
    asked === null ? null : `${study.id}:${asked}`,
    request,
  );

  const answer = ai ?? authored?.text ?? null;

  return (
    <section
      className="flex flex-col gap-3"
      data-testid="case-followup"
      data-answer-source={ai ? "ai" : answer ? "fallback" : ""}
    >
      <h2 className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
        Ask a follow-up
      </h2>

      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          const q = draft.trim();
          if (q.length > 0) setAsked(q);
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={300}
          placeholder="Why does the decoy work if nobody picks it?"
          aria-label={`Ask a question about ${study.title}`}
          className="h-12 w-full flex-1 rounded-lg border border-line bg-surface px-4 text-[16px] text-chalk placeholder:text-muted-foreground/50 focus:border-marigold focus:outline-none"
        />
        <button
          type="submit"
          disabled={draft.trim().length === 0}
          className={cn(
            "touch-target shrink-0 rounded-lg px-5 font-medium transition-colors",
            draft.trim().length > 0
              ? "bg-marigold text-ink hover:bg-marigold/90"
              : "cursor-not-allowed bg-surface2 text-muted-foreground",
          )}
        >
          Ask
        </button>
      </form>

      {/* The questions worth asking, offered rather than waited for. */}
      <div className="flex flex-wrap gap-2">
        {study.faq.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => {
              setDraft(f.question);
              setAsked(f.question);
            }}
            className="rounded-sm border border-line px-2.5 py-1.5 text-left text-[12px] text-muted-foreground transition-colors hover:border-marigold hover:text-chalk"
          >
            {f.question}
          </button>
        ))}
      </div>

      {answer ? (
        <div className="flex flex-col gap-2 rounded-lg border border-violet/50 bg-violet/10 p-4">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-mono text-[10px] tracking-widest text-violet uppercase">
              {asked}
            </span>
            {/* Say which it is. Passing authored text off as generated — or the
                reverse — would be the one dishonest thing on the page. */}
            <span className="shrink-0 font-mono text-[9px] tracking-widest text-muted-foreground uppercase">
              {pending ? "thinking" : ai ? "generated" : "from the notes"}
            </span>
          </div>
          <p className="text-[15px] leading-relaxed text-chalk">{answer}</p>
        </div>
      ) : null}
    </section>
  );
}

export function CaseStudyScreen({ id }: { id: string }) {
  const { ready } = useGuard({ requireAuth: true, requireOnboarded: true });
  const study = caseById(id);

  if (!ready) return <Skeleton />;

  if (!study) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-4 px-5 pt-6">
        <AppHeader backHref="/case-studies" backLabel="Case studies" />
        <h1 className="font-display text-3xl font-bold text-chalk">No such case study</h1>
        <p className="text-[14px] text-chalk/80">
          That link points at a case that is not in the library.
        </p>
        <Link
          href="/case-studies"
          className="touch-target flex w-fit items-center rounded-lg bg-marigold px-5 font-medium text-ink"
        >
          See what is
        </Link>
      </main>
    );
  }

  return (
    <main
      data-testid="case-study"
      data-case={study.id}
      data-case-mode={study.mode}
      className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-5 pt-5 pb-16"
    >
      <AppHeader backHref="/case-studies" backLabel="Case studies" eyebrow={study.category} />

      <header className="flex flex-col gap-3 pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-sm border border-line bg-surface2 px-2 py-1 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
            Case {study.number}
          </span>
          <span
            className={cn(
              "rounded-sm border px-2 py-1 font-mono text-[10px] tracking-widest uppercase",
              study.mode === "simulation"
                ? "border-marigold/60 bg-marigold/12 text-marigold"
                : "border-line bg-surface2 text-muted-foreground",
            )}
          >
            {study.mode}
          </span>
          <span className="rounded-sm border border-line bg-surface2 px-2 py-1 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
            {study.category}
          </span>
        </div>
        <h1 className="font-display text-[28px] leading-tight font-bold text-balance text-chalk sm:text-3xl">
          {study.title}
        </h1>
      </header>

      <div className="flex flex-col gap-8">
        {study.sim === "decoy" ? <DecoyLab /> : null}
        {study.timeline ? <Timeline timeline={study.timeline} /> : null}

        <section className="flex flex-col gap-3">
          <h2 className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
            What happened
          </h2>
          <p className="text-[15px] leading-relaxed text-chalk/90">{study.summary}</p>
        </section>

        <ConceptList title="The mechanics" items={study.coreConcepts} />
        <ConceptList title="The behaviour underneath" items={study.behaviouralConcepts} />

        <section className="flex flex-col gap-2 rounded-lg border border-mint/60 bg-mint/10 p-4">
          <span className="font-mono text-[10px] tracking-widest text-mint uppercase">
            The key lesson
          </span>
          <p className="text-[15px] leading-snug font-medium text-chalk">{study.keyLesson}</p>
        </section>

        <FollowUp study={study} />

        <section className="flex flex-col gap-2 border-t border-line pt-5">
          <h2 className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
            Sources
          </h2>
          <ul className="flex flex-col gap-2">
            {study.sources.map((s) => (
              <li key={s.citation} className="text-[13px] leading-snug text-muted-foreground">
                {s.url ? (
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-marigold underline-offset-4 hover:underline"
                  >
                    {s.citation}
                  </a>
                ) : (
                  s.citation
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
