"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCompoundStore, useHasHydrated } from "@/lib/store";
import { INCOME_BANDS, LIFE_STAGES, previewIncome, scalePack } from "@/lib/profile";
import { DIAGNOSTIC, DIAGNOSTIC_INTRO } from "@/content/diagnostic";
import { storyFirstEarner } from "@/content/packs";
import { formatRupees } from "@/lib/format";
import type { IncomeTier, LifeStage } from "@/lib/sim/types";

/**
 * Onboarding: name → bucket → income band → context → three questions.
 *
 * We never ask "how much do you know about money". The diagnostic infers it,
 * which is both more accurate and not insulting.
 */

const STEPS = ["name", "stage", "income", "context", "q0", "q1", "q2"] as const;
type Step = (typeof STEPS)[number];

/* ─────────────────────────── primitives ─────────────────────────── */

function OptionCard({
  selected,
  disabled,
  onClick,
  title,
  blurb,
  trailing,
}: {
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  blurb?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition-colors",
        "min-h-[56px]", // comfortably past the 44px floor
        disabled
          ? "cursor-not-allowed border-line/60 bg-surface/40 text-muted-foreground"
          : selected
            ? "border-marigold bg-surface2 text-chalk"
            : "border-line bg-surface text-chalk hover:bg-surface2",
      )}
    >
      <span className="flex flex-col gap-0.5">
        <span className="text-[15px] leading-tight font-medium">{title}</span>
        {blurb ? (
          <span className="text-[13px] leading-snug text-muted-foreground">{blurb}</span>
        ) : null}
      </span>
      {trailing}
    </button>
  );
}

function StepHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
        {eyebrow}
      </p>
      <h1 className="font-display text-3xl leading-[1.1] font-bold text-chalk sm:text-4xl">
        {title}
      </h1>
    </div>
  );
}

function Skeleton() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-6 px-5 py-12">
      <div className="h-1 w-full rounded-full bg-surface2" />
      <div className="h-3 w-24 rounded-sm bg-surface2" />
      <div className="h-10 w-3/4 rounded-sm bg-surface2" />
      <div className="flex flex-col gap-3 pt-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-14 w-full rounded-lg bg-surface" />
        ))}
      </div>
    </main>
  );
}

/* ──────────────────────────── the flow ──────────────────────────── */

export function OnboardingFlow() {
  const router = useRouter();
  const hydrated = useHasHydrated();

  const profile = useCompoundStore((s) => s.profile);
  const answers = useCompoundStore((s) => s.diagnosticAnswers);
  const updateProfile = useCompoundStore((s) => s.updateProfile);
  const answerDiagnostic = useCompoundStore((s) => s.answerDiagnostic);
  const completeOnboarding = useCompoundStore((s) => s.completeOnboarding);

  const [index, setIndex] = useState(0);
  const step: Step = STEPS[index];

  // Recomputed only when the tier changes — scaling walks the whole deck.
  const scaledSample = useMemo(() => {
    const scaled = scalePack(storyFirstEarner, profile.incomeTier);
    const phone = scaled.events
      .find((e) => e.id === "m03-phone")
      ?.choices.find((c) => c.id === "budget_cash");
    return {
      income: previewIncome(storyFirstEarner, profile.incomeTier),
      fixed: scaled.initialState.fixedExpenses,
      phoneLabel: phone?.label ?? "",
    };
  }, [profile.incomeTier]);

  if (!hydrated) return <Skeleton />;

  const canContinue = (() => {
    switch (step) {
      case "name":
        return profile.name.trim().length > 0;
      case "stage":
      case "income":
      case "context":
        return true;
      default: {
        const q = DIAGNOSTIC[Number(step.slice(1))];
        return Boolean(answers[q.id]);
      }
    }
  })();

  const back = () => (index === 0 ? router.push("/") : setIndex((i) => i - 1));

  const next = () => {
    if (index < STEPS.length - 1) {
      setIndex((i) => i + 1);
      return;
    }
    const result = completeOnboarding();
    toast.success(`Set up for ${profile.name.trim()}.`, {
      description:
        result.correct === 3
          ? "You got all three. We'll skip the basics."
          : result.correct === 0
            ? "We'll explain everything in plain language."
            : `${result.correct} of 3. We'll pitch explanations to match.`,
    });
    router.push("/");
  };

  /* Diagnostic answers advance on tap — the whole thing should take 20 seconds. */
  const pickAnswer = (questionId: string, optionId: string) => {
    answerDiagnostic(questionId, optionId);
    if (index < STEPS.length - 1) setTimeout(() => setIndex((i) => i + 1), 160);
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pt-8 pb-safe">
      {/* progress */}
      <div className="flex gap-1" role="progressbar" aria-valuenow={index + 1} aria-valuemin={1} aria-valuemax={STEPS.length}>
        {STEPS.map((s, i) => (
          <span
            key={s}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i <= index ? "bg-marigold" : "bg-surface2",
            )}
          />
        ))}
      </div>

      <div className="flex flex-1 flex-col gap-6 pt-10">
        {step === "name" && (
          <>
            <StepHeading eyebrow="Before we start" title="What should we call you?" />
            <input
              autoFocus
              value={profile.name}
              onChange={(e) => updateProfile({ name: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canContinue) next();
              }}
              placeholder="Your first name"
              maxLength={24}
              className="h-14 w-full rounded-lg border border-line bg-surface px-4 text-lg text-chalk placeholder:text-muted-foreground/60 focus:border-marigold focus:outline-none"
            />
            <p className="text-sm text-muted-foreground">
              Stays on this device. There is no account and no server.
            </p>
          </>
        )}

        {step === "stage" && (
          <>
            <StepHeading eyebrow="Step 2 of 7" title="Where are you right now?" />
            <div className="flex flex-col gap-2">
              {LIFE_STAGES.map((s) => (
                <OptionCard
                  key={s.id}
                  selected={profile.lifeStage === s.id}
                  disabled={!s.available}
                  onClick={() => updateProfile({ lifeStage: s.id as LifeStage })}
                  title={s.label}
                  blurb={s.blurb}
                  trailing={
                    s.available ? null : (
                      <span className="shrink-0 rounded-sm border border-line px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                        coming soon
                      </span>
                    )
                  }
                />
              ))}
            </div>
          </>
        )}

        {step === "income" && (
          <>
            <StepHeading eyebrow="Step 3 of 7" title="Roughly what do you take home?" />
            <div className="flex flex-col gap-2">
              {INCOME_BANDS.map((b) => (
                <OptionCard
                  key={b.id}
                  selected={profile.incomeTier === b.id}
                  onClick={() => updateProfile({ incomeTier: b.id as IncomeTier })}
                  title={b.label}
                  blurb={b.blurb}
                />
              ))}
            </div>

            {/* The gate wants this visible: the whole deck scales, not just the salary. */}
            <div className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-4">
              <p className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
                Your run will start at
              </p>
              <p className="font-mono text-2xl text-marigold" data-money>
                {formatRupees(scaledSample.income)}
                <span className="text-sm text-muted-foreground"> a month</span>
              </p>
              <div className="h-px w-full bg-line" />
              <p className="text-[13px] leading-snug text-muted-foreground">
                Fixed costs{" "}
                <span className="font-mono text-chalk">{formatRupees(scaledSample.fixed)}</span>. Every
                amount in the story scales with you — month 3&apos;s budget phone becomes{" "}
                <span className="text-chalk">{scaledSample.phoneLabel.toLowerCase()}</span>.
              </p>
            </div>
          </>
        )}

        {step === "context" && (
          <>
            <StepHeading eyebrow="Step 4 of 7" title="A couple of details" />
            <label className="flex flex-col gap-2">
              <span className="text-sm text-muted-foreground">Where do you live?</span>
              <input
                value={profile.location}
                onChange={(e) => updateProfile({ location: e.target.value })}
                className="h-12 w-full rounded-lg border border-line bg-surface px-4 text-chalk focus:border-marigold focus:outline-none"
              />
            </label>

            <div className="flex flex-col gap-2">
              <span className="text-sm text-muted-foreground">
                How many people depend on your income?
              </span>
              <div className="flex gap-2">
                {[0, 1, 2, 3].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => updateProfile({ dependents: n })}
                    aria-pressed={profile.dependents === n}
                    className={cn(
                      "touch-target flex-1 rounded-lg border font-mono text-base transition-colors",
                      profile.dependents === n
                        ? "border-marigold bg-surface2 text-chalk"
                        : "border-line bg-surface text-muted-foreground hover:bg-surface2",
                    )}
                  >
                    {n === 3 ? "3+" : n}
                  </button>
                ))}
              </div>
            </div>

            <OptionCard
              selected={profile.supportsParents}
              onClick={() => updateProfile({ supportsParents: !profile.supportsParents })}
              title="I send money home"
              blurb="Changes how tight the months feel."
              trailing={
                <span
                  className={cn(
                    "flex h-6 w-11 shrink-0 items-center rounded-full border p-0.5 transition-colors",
                    profile.supportsParents ? "border-marigold bg-marigold/25" : "border-line bg-surface2",
                  )}
                >
                  <span
                    className={cn(
                      "size-4 rounded-full transition-transform",
                      profile.supportsParents
                        ? "translate-x-5 bg-marigold"
                        : "translate-x-0 bg-muted-foreground",
                    )}
                  />
                </span>
              }
            />
          </>
        )}

        {step.startsWith("q") &&
          (() => {
            const qIndex = Number(step.slice(1));
            const q = DIAGNOSTIC[qIndex];
            return (
              <>
                <StepHeading
                  eyebrow={`Quick check · ${qIndex + 1} of ${DIAGNOSTIC.length}`}
                  title={q.prompt}
                />
                {qIndex === 0 ? (
                  <p className="-mt-2 text-sm text-muted-foreground">{DIAGNOSTIC_INTRO}</p>
                ) : null}
                {q.helper ? (
                  <p className="-mt-2 text-sm text-muted-foreground">{q.helper}</p>
                ) : null}
                <div className="flex flex-col gap-2">
                  {q.options.map((o) => (
                    <OptionCard
                      key={o.id}
                      selected={answers[q.id] === o.id}
                      onClick={() => pickAnswer(q.id, o.id)}
                      title={o.label}
                    />
                  ))}
                </div>
              </>
            );
          })()}
      </div>

      {/* controls */}
      <div className="flex items-center gap-3 py-6">
        <button
          type="button"
          onClick={back}
          className="touch-target rounded-lg border border-line px-4 text-sm text-muted-foreground transition-colors hover:bg-surface2 hover:text-chalk"
        >
          Back
        </button>
        <button
          type="button"
          onClick={next}
          disabled={!canContinue}
          className={cn(
            "touch-target flex-1 rounded-lg px-6 text-base font-medium transition-colors",
            canContinue
              ? "bg-marigold text-ink hover:bg-marigold/90"
              : "cursor-not-allowed bg-surface2 text-muted-foreground",
          )}
        >
          {index === STEPS.length - 1 ? "Done" : "Continue"}
        </button>
      </div>

      <Link
        href="/"
        className="pb-4 text-center text-sm text-muted-foreground hover:text-chalk"
      >
        Skip for now
      </Link>
    </main>
  );
}
