"use client";

import { cn } from "@/lib/utils";

/**
 * The coach's voice. Violet, and violet is never used for data.
 *
 * ★ The fallback ships first. `choice.fallbackNote` is authored on every single
 * choice, renders immediately, and is what the app runs on with no API key.
 *
 * `/api/coach` sits on top: when a generated line arrives it replaces the
 * fallback, and when it does not, nothing happens and nobody is told. There is
 * no error state, no retry button and no toast — a missing coach line is not a
 * failure, it is the normal case. (CLAUDE.md rule 4.)
 *
 * `pending` is a whisper, not a spinner. The player already has a complete,
 * useful line in front of them; making them wait on a better one would be
 * strictly worse than letting it swap in quietly if it turns up.
 */
export function CoachBubble({
  text,
  pending,
  source = "fallback",
  className,
}: {
  text: string;
  pending?: boolean;
  /** Which line this is. Exposed for the end-to-end gate, and honest labelling. */
  source?: "ai" | "fallback";
  className?: string;
}) {
  return (
    <div
      data-testid="coach"
      data-coach-source={source}
      data-coach-pending={pending ? "1" : "0"}
      className={cn(
        "flex gap-3 rounded-lg border border-violet/40 bg-violet/10 p-3.5",
        className,
      )}
    >
      <span
        aria-hidden
        className="mt-0.5 size-6 shrink-0 rounded-full border border-violet/60 bg-violet/20"
      />
      <div className="flex min-w-0 flex-col gap-1">
        <span className="flex items-center gap-1.5 font-mono text-[10px] tracking-widest text-violet uppercase">
          Coach
          {pending ? (
            <span className="text-violet/60 normal-case tracking-normal">thinking…</span>
          ) : null}
        </span>
        {/* Long AI text is clamped rather than allowed to push the layout. */}
        <p
          className={cn(
            "line-clamp-6 max-h-40 overflow-hidden text-[14px] leading-relaxed text-chalk/90",
            pending && "opacity-60",
          )}
        >
          {text}
        </p>
      </div>
    </div>
  );
}
