"use client";

import { cn } from "@/lib/utils";

/**
 * The coach's voice. Violet, and violet is never used for data.
 *
 * ★ The fallback ships first. Right now this always renders
 * `choice.fallbackNote`, which is authored on every single choice — so the app
 * is fully playable and fully reportable with no API key.
 *
 * Phase 9 layers `/api/coach` on top: when a generated line arrives it replaces
 * the fallback, and when it does not, nothing happens and nobody is told. A
 * missing coach line is never an error state.
 */
export function CoachBubble({
  text,
  pending,
  className,
}: {
  text: string;
  pending?: boolean;
  className?: string;
}) {
  return (
    <div
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
        <span className="font-mono text-[10px] tracking-widest text-violet uppercase">
          Coach
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
