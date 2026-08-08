"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { Choice, EventCard as EventCardData, SimState } from "@/lib/sim/types";
import { choiceAvailability } from "@/lib/sim/deck";
import { fireDopamine } from "@/lib/confetti";
import { useBeatSequence, useCountdown } from "@/lib/hooks/usePressure";
import { PressureCountdown, PressureDim, PressureLayer } from "./PressureLayer";
import { RollingNumber } from "./RollingNumber";

/**
 * The life event, its pressure, and its choices.
 *
 * `visualWeight` is the manipulation, encoded: the wrong choice is often the
 * prettiest button. That is deliberate — and it is reversed occasionally
 * across the deck, so players cannot learn "the big button is always wrong"
 * instead of learning the actual lesson.
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

/**
 * What the tempting choice appears to hand you, right now.
 *
 * Only positive, immediate money counts — the delayed effects are exactly what
 * the player is not being shown yet.
 */
function dopamineAmount(choice: Choice): number {
  let total = 0;
  for (const e of choice.immediate) {
    if (
      (e.kind === "cash" || e.kind === "emergencyFund" || e.kind === "portfolioAdd") &&
      e.amount > 0
    ) {
      total += e.amount;
    }
  }
  return total;
}

export function EventCardView({
  event,
  state,
  selectedChoiceId,
  onSelect,
  disabled,
  reducedMotion = false,
  forcedTimerSeconds = null,
}: {
  event: EventCardData;
  state: SimState;
  selectedChoiceId: string | null;
  onSelect: (choiceId: string) => void;
  disabled?: boolean;
  reducedMotion?: boolean;
  /** ★ Stress above 85 puts a clock on every decision, authored or not. */
  forcedTimerSeconds?: number | null;
}) {
  const options = choiceAvailability(state, event);

  const arrived = useBeatSequence(event.pressure, event.id, reducedMotion);
  const timerBeat = event.pressure.find((b) => b.type === "timer") ?? null;
  const timerArrived = timerBeat !== null && arrived.includes(timerBeat);
  const authoredSeconds =
    timerBeat && typeof timerBeat.meta?.seconds === "number"
      ? (timerBeat.meta.seconds as number)
      : null;

  // A depleted player gets the shorter of the two clocks. Forcing System 1 is
  // the point — that is what the stress threshold is modelling.
  const seconds =
    forcedTimerSeconds !== null
      ? Math.min(forcedTimerSeconds, authoredSeconds ?? forcedTimerSeconds)
      : authoredSeconds;
  const timerActive = forcedTimerSeconds !== null || timerArrived;
  const countdown = useCountdown(seconds, timerActive);
  const timerLabel =
    forcedTimerSeconds !== null && seconds === forcedTimerSeconds
      ? "Stress is over 85. Decide."
      : (timerBeat?.content ?? "Time remaining");
  const dimActive = arrived.some((b) => b.type === "dim");

  /* The reward fires on *selection*, months before the consequence. */
  const [burst, setBurst] = useState<number | null>(null);
  useEffect(() => setBurst(null), [event.id]);

  const handleSelect = (choice: Choice) => {
    onSelect(choice.id);
    if (choice.visualWeight === "primary") {
      void fireDopamine({ reducedMotion });
      const amount = dopamineAmount(choice);
      setBurst(amount > 0 ? amount : null);
    } else {
      setBurst(null);
    }
  };

  return (
    <>
      <PressureDim active={dimActive} />

      <section
        key={event.id}
        className={cn(
          "relative z-50 flex flex-col gap-4 rounded-lg border border-line bg-surface p-4",
          !reducedMotion && "animate-card-deal",
        )}
      >
        <PressureLayer beats={arrived} reducedMotion={reducedMotion} />

        <header className="flex flex-col gap-2">
          <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
            {CATEGORY_LABEL[event.category] ?? event.category} · Month {event.month}
          </span>
          <h2 className="font-display text-2xl leading-tight font-bold text-chalk">
            {event.title}
          </h2>
          <p className="text-[15px] leading-relaxed text-chalk/90">{event.body}</p>
        </header>

        {countdown ? (
          <PressureCountdown label={timerLabel} countdown={countdown} />
        ) : (
          <div className="h-px w-full bg-line" />
        )}

        <div className="flex flex-col gap-2">
          {options.map(({ choice, available, reason }) => {
            const selected = selectedChoiceId === choice.id;
            const isDisabled = !available || disabled;
            const showBurst = selected && burst !== null && choice.visualWeight === "primary";

            return (
              <div key={choice.id} className="flex flex-col gap-1">
                <button
                  type="button"
                  disabled={isDisabled}
                  aria-pressed={selected}
                  onClick={() => handleSelect(choice)}
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
                    selected && !reducedMotion && "animate-pop",
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

                {/* ★ Instant dopamine. Marigold, not mint — this is your money
                    moving, and calling it optimal would be the UI telling the
                    same lie the event is telling. */}
                {showBurst ? (
                  <div
                    data-dopamine
                    className={cn(
                      "flex items-baseline justify-between rounded-sm border border-marigold/50 bg-marigold/10 px-3 py-2",
                      !reducedMotion && "animate-beat-in",
                    )}
                  >
                    <span className="text-[12px] text-muted-foreground">Into your portfolio</span>
                    <RollingNumber
                      value={burst}
                      signed
                      reducedMotion={reducedMotion}
                      className="text-lg text-marigold"
                    />
                  </div>
                ) : null}

                {/* Never hide a blocked option — *why you cannot* is the lesson. */}
                {!available && reason ? (
                  <p className="px-1 text-[12px] leading-snug text-rust">{reason}</p>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>
    </>
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
