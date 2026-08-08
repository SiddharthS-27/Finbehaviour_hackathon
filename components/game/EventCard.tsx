"use client";

import { cn } from "@/lib/utils";
import type { EventCard as EventCardData, SimState } from "@/lib/sim/types";
import { choiceAvailability } from "@/lib/sim/deck";

/**
 * The life event and its choices.
 *
 * `visualWeight` is the manipulation, encoded: the wrong choice is often the
 * prettiest button. That is deliberate and it is the point of the whole mode —
 * an event that neutrally lists options tests knowledge, an event that presses
 * tests behaviour.
 *
 * Pressure beats (headlines, tickers, countdowns) arrive in Phase 5 and render
 * above this. This is the quiet version.
 */

const CATEGORY_LABEL: Record<string, string> = {
  emergency: "Emergency",
  opportunity: "Opportunity",
  social: "Social",
  career: "Career",
  market: "Market",
  temptation: "Temptation",
  digital: "Digital",
};

export function EventCardView({
  event,
  state,
  selectedChoiceId,
  onSelect,
  disabled,
}: {
  event: EventCardData;
  state: SimState;
  selectedChoiceId: string | null;
  onSelect: (choiceId: string) => void;
  disabled?: boolean;
}) {
  const options = choiceAvailability(state, event);

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-4">
      <header className="flex flex-col gap-2">
        <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
          {CATEGORY_LABEL[event.category] ?? event.category} · Month {event.month}
        </span>
        <h2 className="font-display text-2xl leading-tight font-bold text-chalk">{event.title}</h2>
        <p className="text-[15px] leading-relaxed text-chalk/90">{event.body}</p>
      </header>

      <div className="h-px w-full bg-line" />

      <div className="flex flex-col gap-2">
        {options.map(({ choice, available, reason }) => {
          const selected = selectedChoiceId === choice.id;
          const isDisabled = !available || disabled;

          return (
            <div key={choice.id} className="flex flex-col gap-1">
              <button
                type="button"
                disabled={isDisabled}
                aria-pressed={selected}
                onClick={() => onSelect(choice.id)}
                className={cn(
                  "flex min-h-[56px] w-full flex-col items-start gap-1 rounded-lg border px-4 py-3 text-left transition-colors",
                  !available
                    ? "cursor-not-allowed border-line/60 bg-surface/40"
                    : selected
                      ? "border-marigold bg-marigold/20"
                      : choice.visualWeight === "primary"
                        ? // The tempting one. Bright, confident, usually wrong.
                          "border-marigold bg-marigold text-ink hover:bg-marigold/90"
                        : choice.visualWeight === "muted"
                          ? "border-line/70 bg-transparent hover:bg-surface2"
                          : "border-line bg-surface2 hover:border-marigold/60",
                )}
              >
                <span
                  className={cn(
                    "text-[15px] leading-snug font-medium",
                    !available
                      ? "text-muted-foreground"
                      : selected
                        ? "text-chalk"
                        : choice.visualWeight === "primary"
                          ? "text-ink"
                          : "text-chalk",
                  )}
                >
                  {choice.label}
                </span>
                {choice.hint ? (
                  <span
                    className={cn(
                      "text-[12px] leading-snug",
                      !available
                        ? "text-muted-foreground/70"
                        : choice.visualWeight === "primary" && !selected
                          ? "text-ink/70"
                          : "text-muted-foreground",
                    )}
                  >
                    {choice.hint}
                  </span>
                ) : null}
              </button>

              {/* Never hide a blocked option — *why you cannot* is the lesson. */}
              {!available && reason ? (
                <p className="px-1 text-[12px] leading-snug text-rust">{reason}</p>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/**
 * A month whose event gate was unmet, or which the pack left empty.
 *
 * Deliberately not blank space: a quiet month is information. If you paid cash
 * for the phone in month 3, there is no card statement in month 8 — and that
 * absence is the reward. (Edge case 8.)
 */
export function QuietMonthCard({ month }: { month: number }) {
  return (
    <section className="flex flex-col gap-2 rounded-lg border border-dashed border-line bg-surface/50 p-5">
      <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
        Month {month}
      </span>
      <h2 className="font-display text-2xl font-bold text-chalk">A quiet month.</h2>
      <p className="text-[14px] leading-relaxed text-muted-foreground">
        Nothing landed. Salary in, bills out, and whatever you decided to do with the rest. Quiet
        months are where the compounding actually happens.
      </p>
    </section>
  );
}
