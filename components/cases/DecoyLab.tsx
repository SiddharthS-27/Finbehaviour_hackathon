"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * ★ The Economist experiment, run on you first.
 *
 * The finding is about what a menu does to a person reading it, so a paragraph
 * describing the finding is the one format guaranteed not to demonstrate it.
 * You pick from the three-option menu, then from the two-option menu, and only
 * then does the case explain what the third option was for.
 *
 * ── The honesty constraint ────────────────────────────────────────────────
 * Ariely ran two separate groups of 100. One person seeing both menus in
 * sequence is not that experiment, and the reveal says so out loud rather than
 * claiming you were caught. Overstating what just happened to you would be the
 * same manipulation the case is about, pointed at the reader.
 *
 * Percentages below are quoted from the source, not measured here.
 */

interface Option {
  id: string;
  label: string;
  price: string;
  detail: string;
}

const DIGITAL: Option = {
  id: "digital",
  label: "Digital only",
  price: "$59",
  detail: "One year of the online edition.",
};
const PRINT: Option = {
  id: "print",
  label: "Print only",
  price: "$125",
  detail: "One year of the printed magazine.",
};
const COMBO: Option = {
  id: "combo",
  label: "Print and digital",
  price: "$125",
  detail: "One year of both, together.",
};

const MENU_A: Option[] = [DIGITAL, PRINT, COMBO];
const MENU_B: Option[] = [DIGITAL, COMBO];

/** Ariely (2008), 100 business students per trial. Authored, never computed. */
const TRIAL_A: Record<string, number> = { digital: 16, print: 0, combo: 84 };
const TRIAL_B: Record<string, number> = { digital: 68, combo: 32 };

function Menu({
  options,
  picked,
  onPick,
  disabled,
}: {
  options: Option[];
  picked: string | null;
  onPick: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      {options.map((o) => {
        const chosen = picked === o.id;
        return (
          <button
            key={o.id}
            type="button"
            disabled={disabled}
            onClick={() => onPick(o.id)}
            className={cn(
              "flex items-center justify-between gap-4 rounded-lg border px-4 py-3 text-left transition-colors",
              chosen
                ? "border-marigold bg-marigold/12"
                : "border-line bg-surface hover:border-marigold/50 hover:bg-surface2",
              disabled && !chosen && "opacity-55",
            )}
          >
            <span className="flex min-w-0 flex-col">
              <span className="text-[15px] text-chalk">{o.label}</span>
              <span className="text-[12px] text-muted-foreground">{o.detail}</span>
            </span>
            <span className="shrink-0 font-mono text-[17px] text-chalk tabular-nums">
              {o.price}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** One trial's result. Marigold marks the row the reader picked — marigold is you. */
function ResultBars({
  options,
  data,
  yours,
  caption,
}: {
  options: Option[];
  data: Record<string, number>;
  yours: string | null;
  caption: string;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
        {caption}
      </span>
      {options.map((o) => {
        const pct = data[o.id] ?? 0;
        const mine = yours === o.id;
        return (
          <div key={o.id} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3 text-[13px]">
              <span className={mine ? "text-marigold" : "text-chalk/80"}>
                {o.label} {o.price}
                {mine ? (
                  <span className="ml-2 font-mono text-[10px] tracking-widest uppercase">you</span>
                ) : null}
              </span>
              <span
                className={cn(
                  "font-mono tabular-nums",
                  mine ? "text-marigold" : "text-muted-foreground",
                )}
              >
                {pct}%
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
              <div
                className={cn("h-full rounded-full", mine ? "bg-marigold" : "bg-chalk/35")}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * What to say about the reader's own two picks.
 *
 * Never claims more than happened. The switch is the interesting case; not
 * switching is a perfectly reasonable thing to have done and is not a failure.
 */
function verdict(a: string | null, b: string | null): string {
  if (a === "combo" && b === "digital") {
    return "You took the combined offer while the $125 print-only option was on the table, and dropped to digital once it left. That is the shape of the effect: the option you did not choose was the one changing your mind.";
  }
  if (a === "combo" && b === "combo") {
    return "You wanted print and digital both times, decoy or no decoy. Plenty of people genuinely do — the effect is about the share of a crowd that moves, not about any one person being fooled.";
  }
  if (a === "digital" && b === "digital") {
    return "You priced digital on its own merits and the third option did not move you. That is exactly the defence: you had already decided what it was worth before the menu argued with you.";
  }
  if (a === "print") {
    return "You picked the option that got 0% in Ariely's trial — same price as the combined offer, strictly less in the box. Worth sitting with why it appealed, because the menu was built assuming nobody would take it.";
  }
  return "Your two picks went the other way from the sample. One person is not an experiment, and the direction of a crowd is what the finding is about.";
}

export function DecoyLab() {
  const [pickA, setPickA] = useState<string | null>(null);
  const [pickB, setPickB] = useState<string | null>(null);
  const [stage, setStage] = useState<"a" | "b" | "reveal">("a");

  const restart = () => {
    setPickA(null);
    setPickB(null);
    setStage("a");
  };

  return (
    <section
      data-testid="decoy-lab"
      data-decoy-stage={stage}
      className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-4"
    >
      <header className="flex flex-col gap-1">
        <span className="font-mono text-[10px] tracking-widest text-marigold uppercase">
          Run it on yourself first
        </span>
        <h2 className="font-display text-xl leading-tight font-bold text-chalk">
          {stage === "a"
            ? "Pick a subscription"
            : stage === "b"
              ? "Same magazine. One option removed."
              : "What the menu did"}
        </h2>
      </header>

      {stage === "a" ? (
        <>
          <p className="text-[14px] leading-snug text-chalk/85">
            You are subscribing to The Economist for a year. Three options.
          </p>
          <Menu options={MENU_A} picked={pickA} onPick={setPickA} />
          <button
            type="button"
            disabled={!pickA}
            onClick={() => setStage("b")}
            className={cn(
              "touch-target rounded-lg px-5 font-medium transition-colors",
              pickA
                ? "bg-marigold text-ink hover:bg-marigold/90"
                : "cursor-not-allowed bg-surface2 text-muted-foreground",
            )}
          >
            {pickA ? "Continue" : "Pick one to continue"}
          </button>
        </>
      ) : null}

      {stage === "b" ? (
        <>
          <p className="text-[14px] leading-snug text-chalk/85">
            Nothing else has changed — same magazine, same two prices. Choose again.
          </p>
          <Menu options={MENU_B} picked={pickB} onPick={setPickB} />
          <button
            type="button"
            disabled={!pickB}
            onClick={() => setStage("reveal")}
            className={cn(
              "touch-target rounded-lg px-5 font-medium transition-colors",
              pickB
                ? "bg-marigold text-ink hover:bg-marigold/90"
                : "cursor-not-allowed bg-surface2 text-muted-foreground",
            )}
          >
            {pickB ? "Show me what that was" : "Pick one to continue"}
          </button>
        </>
      ) : null}

      {stage === "reveal" ? (
        <div className="flex flex-col gap-5">
          <ResultBars
            options={MENU_A}
            data={TRIAL_A}
            yours={pickA}
            caption="Trial 1 · 100 students · three options"
          />
          <ResultBars
            options={MENU_B}
            data={TRIAL_B}
            yours={pickB}
            caption="Trial 2 · 100 students · print-only removed"
          />

          <div className="flex flex-col gap-2 rounded-lg border border-marigold/50 bg-marigold/10 p-4">
            <span className="font-mono text-[10px] tracking-widest text-marigold uppercase">
              Your two picks
            </span>
            <p className="text-[14px] leading-snug text-chalk">{verdict(pickA, pickB)}</p>
          </div>

          {/* The named mechanism. Mint, because this is the thing to take away. */}
          <div className="flex flex-col gap-2 rounded-lg border border-mint/60 bg-mint/10 p-4">
            <span className="font-mono text-[10px] tracking-widest text-mint uppercase">
              The decoy
            </span>
            <p className="text-[14px] leading-snug text-chalk">
              Print-only at $125 is worse than print-and-digital at $125 in every way and better in
              none. Nobody picks it. Its job is to stand next to the combined offer so that offer
              wins an easy comparison — and $59, which is never compared to anything, starts to look
              like the lesser thing rather than the cheaper one.
            </p>
          </div>

          <p className="text-[13px] leading-snug text-muted-foreground">
            One reader seeing both menus is not the experiment. Ariely ran two separate groups of a
            hundred, which is why the percentages above are theirs and not yours.
          </p>

          <button
            type="button"
            onClick={restart}
            className="touch-target self-start rounded-lg border border-line px-5 text-[14px] text-chalk transition-colors hover:border-marigold"
          >
            Run it again
          </button>
        </div>
      ) : null}
    </section>
  );
}
