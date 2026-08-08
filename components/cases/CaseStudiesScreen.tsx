"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useGuard } from "@/lib/hooks/useGuard";
import { CASE_STUDIES } from "@/content/case-studies";
import { AppHeader } from "@/components/chrome/AppHeader";

/**
 * The library. Two cases, and the mode badge is the useful thing on the card —
 * it tells you whether you are about to read something or do something.
 */

function Skeleton() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-4 px-5 pt-6">
      <div className="h-9 w-1/2 rounded-sm bg-surface2" />
      {[0, 1].map((i) => (
        <div key={i} className="h-32 w-full rounded-lg bg-surface" />
      ))}
    </main>
  );
}

export function CaseStudiesScreen() {
  const { ready } = useGuard({ requireAuth: true, requireOnboarded: true });
  if (!ready) return <Skeleton />;

  return (
    <main
      data-testid="case-studies"
      className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-5 pt-5 pb-16"
    >
      <AppHeader backHref="/home" backLabel="Home" eyebrow="Case studies" />

      <div className="flex flex-col gap-2 pb-6">
        <h1 className="font-display text-3xl leading-tight font-bold text-chalk sm:text-4xl">
          What actually happened
        </h1>
        <p className="text-[14px] leading-snug text-muted-foreground">
          Documented events, with the sources attached. Some you read. Some happen to you first.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        {CASE_STUDIES.map((study) => (
          <Link
            key={study.id}
            href={`/case-studies/${study.id}`}
            data-case-card={study.id}
            className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-4 transition-colors hover:border-marigold hover:bg-surface2"
          >
            <div className="flex flex-wrap items-center gap-2">
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
              <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                {study.category}
              </span>
            </div>
            <h2 className="font-display text-xl leading-tight font-bold text-chalk">
              {study.title}
            </h2>
            <p className="text-[13px] leading-snug text-muted-foreground">{study.hook}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
