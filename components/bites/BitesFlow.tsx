"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useDragControls,
  useMotionValue,
  useTransform,
  type PanInfo,
} from "framer-motion";
import { XIcon, SparklesIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { fireCelebration } from "@/lib/confetti";
import { BITE_XP_REWARD } from "@/lib/bites";
import type { Bite } from "@/content/bites";
import { BiteFace, BiteDetail } from "./BiteCard";

/**
 * ★ The swipe flow — a full-viewport overlay over the dashboard.
 *
 * Left/right moves through the day's five. Up opens the detail sheet. That is
 * the whole interaction, and every one of those three has a button behind it
 * as well: a gesture-only interface is unusable with a keyboard, unusable with
 * a screen reader, and unusable for anyone who does not already know it is
 * there. The gestures are the delight; the buttons are the product.
 *
 * Motion is honoured — under `prefers-reduced-motion` the cards cross-fade,
 * the sheet appears rather than slides, and no confetti fires. Dragging still
 * works, because dragging is an input, not an animation.
 */

/** Pixels of travel that count as a swipe rather than a wobble. */
const SWIPE_DISTANCE = 78;
/** Or this much flick, for a fast short drag. */
const SWIPE_VELOCITY = 420;
/** Downward drag on the sheet that dismisses it. */
const SHEET_DISMISS = 110;

/* ─────────────────────────── the top bar ────────────────────────────── */

function ProgressSegments({ total, index }: { total: number; index: number }) {
  return (
    <div className="flex flex-1 items-center gap-1.5" aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-1 flex-1 rounded-full transition-colors duration-300",
            i < index ? "bg-marigold" : i === index ? "bg-marigold/55" : "bg-line",
          )}
        />
      ))}
    </div>
  );
}

/* ──────────────────────────── one card ──────────────────────────────── */

/**
 * The draggable card. Keyed on the bite id by its parent, so every motion
 * value here is born and dies with the card it belongs to — no stale offsets
 * carried into the next one.
 */
function SwipeCard({
  bite,
  direction,
  reducedMotion,
  onNext,
  onPrev,
  onExpand,
}: {
  bite: Bite;
  /** 1 = moving forward through the deck, -1 = back. Sets which way it flies. */
  direction: number;
  reducedMotion: boolean;
  onNext: () => void;
  onPrev: () => void;
  onExpand: () => void;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  // A little tilt into the drag. Purely physical feedback — it carries no data.
  const rotate = useTransform(x, [-220, 0, 220], [-7, 0, 7]);
  // The hint has done its job the moment they touch the card.
  const [dragging, setDragging] = useState(false);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    setDragging(false);
    const { offset, velocity } = info;
    const vertical = Math.abs(offset.y) > Math.abs(offset.x);

    if (vertical && (offset.y < -SWIPE_DISTANCE || velocity.y < -SWIPE_VELOCITY)) {
      onExpand();
      return;
    }
    if (!vertical) {
      if (offset.x < -SWIPE_DISTANCE || velocity.x < -SWIPE_VELOCITY) return onNext();
      if (offset.x > SWIPE_DISTANCE || velocity.x > SWIPE_VELOCITY) return onPrev();
    }
    // Anything else springs back on its own — dragConstraints are all zero.
  };

  return (
    <motion.div
      className="absolute inset-0"
      custom={direction}
      initial={
        reducedMotion
          ? { opacity: 0 }
          : { opacity: 0, x: direction > 0 ? 180 : -180, scale: 0.97 }
      }
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={
        reducedMotion
          ? { opacity: 0 }
          : { opacity: 0, x: direction > 0 ? -220 : 220, scale: 0.97 }
      }
      transition={{ type: "spring", stiffness: 420, damping: 38, mass: 0.7 }}
    >
      <motion.div
        className="h-full touch-none"
        drag
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.55}
        dragMomentum={false}
        style={{ x, y, rotate }}
        whileDrag={{ scale: 1.015 }}
        onDragStart={() => setDragging(true)}
        onDragEnd={handleDragEnd}
        data-testid="bite-card"
        data-bite={bite.id}
      >
        <BiteFace bite={bite} hintVisible={!dragging} />
      </motion.div>
    </motion.div>
  );
}

/* ─────────────────────── the completion screen ──────────────────────── */

function Completion({
  awarded,
  streak,
  reducedMotion,
  onExit,
  onReview,
}: {
  /** True only when this session was the one that banked the XP. */
  awarded: boolean;
  streak: number;
  reducedMotion: boolean;
  onExit: () => void;
  onReview: () => void;
}) {
  useEffect(() => {
    if (awarded) void fireCelebration({ reducedMotion });
  }, [awarded, reducedMotion]);

  return (
    <motion.div
      data-testid="bites-complete"
      className="flex h-full flex-col items-center justify-center gap-6 px-2 text-center"
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
    >
      <div className="flex size-16 items-center justify-center rounded-full border border-mint/60 bg-mint/12">
        <SparklesIcon className="size-7 text-mint" aria-hidden />
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="font-display text-3xl leading-tight font-bold text-chalk">
          Brain expanded.
        </h2>
        <p className="text-[15px] leading-snug text-chalk/80">
          You have unlocked today&apos;s knowledge.
        </p>
      </div>

      {/* ★ The tie-in. Bite XP is banked to the ledger rather than poured into
          a live run — a run's numbers have to stay derivable from its own
          decisions, or the shadow-agent comparison stops being honest. */}
      <div className="flex flex-col items-center gap-1 rounded-lg border border-marigold/50 bg-marigold/10 px-5 py-3">
        <span className="font-mono text-[20px] text-marigold tabular-nums">
          {awarded ? `+${BITE_XP_REWARD} XP` : "Already banked"}
        </span>
        <span className="text-[12px] text-muted-foreground">
          {awarded
            ? "Banked to your ledger for the simulation."
            : "You finished these earlier today."}
        </span>
      </div>

      {streak > 0 ? (
        <p className="font-mono text-[12px] text-muted-foreground">
          {streak}-day streak
        </p>
      ) : null}

      <div className="flex w-full max-w-xs flex-col gap-2">
        <button
          type="button"
          onClick={onExit}
          className="touch-target w-full rounded-lg bg-marigold px-5 font-medium text-ink transition-colors hover:bg-marigold/90"
        >
          Return to simulation
        </button>
        <button
          type="button"
          onClick={onReview}
          className="touch-target w-full rounded-lg border border-line px-5 text-chalk transition-colors hover:border-marigold"
        >
          Review today&apos;s cards
        </button>
      </div>
    </motion.div>
  );
}

/* ──────────────────────────── the flow ──────────────────────────────── */

export function BitesFlow({
  deck,
  startIndex = 0,
  streak,
  reducedMotion,
  onProgress,
  onComplete,
  onClose,
}: {
  deck: Bite[];
  /** Resume where they left off today. */
  startIndex?: number;
  streak: number;
  reducedMotion: boolean;
  /** Called with how many cards have been got through. */
  onProgress: (seen: number) => void;
  /** Called once at the end. Returns true when XP was newly awarded. */
  onComplete: () => boolean;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(() => Math.min(startIndex, Math.max(0, deck.length - 1)));
  const [direction, setDirection] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const [done, setDone] = useState(false);
  const [awarded, setAwarded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const sheetDrag = useDragControls();

  const bite = deck[index];
  const finish = useCallback(() => {
    setDone(true);
    setAwarded(onComplete());
  }, [onComplete]);

  /* Side effects stay out of the state updater — React invokes updaters twice
     in development, and banking the day twice is exactly the bug that would
     produce. */
  const next = useCallback(() => {
    setExpanded(false);
    setDirection(1);
    const at = index + 1;
    onProgress(at);
    if (at >= deck.length) finish();
    else setIndex(at);
  }, [index, deck.length, finish, onProgress]);

  const prev = useCallback(() => {
    setExpanded(false);
    setDirection(-1);
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  /* Escape closes the sheet first, then the flow. Anything else would make the
     key feel like it sometimes throws away the whole session. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (expanded) setExpanded(false);
        else onClose();
        return;
      }
      if (done) return;
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowUp") setExpanded(true);
      if (e.key === "ArrowDown") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded, done, next, prev, onClose]);

  /* The overlay owns the viewport while it is open. */
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    containerRef.current?.focus();
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  /* An empty deck should close rather than render a blank overlay. */
  useEffect(() => {
    if (deck.length === 0) onClose();
  }, [deck.length, onClose]);

  if (deck.length === 0) return null;

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Quick bites"
      data-testid="bites-flow"
      data-bite-index={index}
      data-bite-expanded={expanded ? "1" : "0"}
      data-bite-done={done ? "1" : "0"}
      className="fixed inset-0 z-50 flex flex-col bg-ink pt-safe outline-none"
    >
      {/* ── top bar ── */}
      <div className="flex shrink-0 items-center gap-3 px-4 pt-4 pb-3">
        <ProgressSegments total={deck.length} index={done ? deck.length : index} />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close quick bites"
          data-testid="bites-close"
          className="touch-target -mr-2 flex shrink-0 items-center justify-center rounded-sm px-2 text-muted-foreground transition-colors hover:text-chalk"
        >
          <XIcon className="size-5" aria-hidden />
        </button>
      </div>

      {/* ── the deck ── */}
      <div className="relative mx-auto w-full max-w-md flex-1 px-4 pb-3">
        {done ? (
          <Completion
            awarded={awarded}
            streak={streak}
            reducedMotion={reducedMotion}
            onExit={onClose}
            onReview={() => {
              setDone(false);
              setDirection(-1);
              setIndex(0);
            }}
          />
        ) : (
          <>
            {/* A second card peeking behind, so the stack reads as a stack. */}
            {index + 1 < deck.length ? (
              <div
                aria-hidden
                className="absolute inset-x-4 top-2 bottom-0 scale-[0.965] rounded-lg border border-line bg-surface/70"
              />
            ) : null}

            <AnimatePresence custom={direction} initial={false}>
              <SwipeCard
                key={bite.id}
                bite={bite}
                direction={direction}
                reducedMotion={reducedMotion}
                onNext={next}
                onPrev={prev}
                onExpand={() => setExpanded(true)}
              />
            </AnimatePresence>
          </>
        )}
      </div>

      {/* ── the buttons behind the gestures ── */}
      {!done ? (
        <div className="mx-auto flex w-full max-w-md shrink-0 items-center gap-2 px-4 pb-safe">
          <button
            type="button"
            onClick={prev}
            disabled={index === 0}
            className={cn(
              "touch-target rounded-lg border border-line px-4 text-[14px] transition-colors",
              index === 0
                ? "cursor-not-allowed text-muted-foreground/50"
                : "text-chalk hover:border-marigold",
            )}
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="touch-target flex-1 rounded-lg border border-marigold/60 bg-marigold/10 px-4 text-[14px] font-medium text-marigold transition-colors hover:bg-marigold/20"
          >
            Reveal the truth
          </button>
          <button
            type="button"
            onClick={next}
            data-testid="bite-next"
            className="touch-target rounded-lg bg-marigold px-4 text-[14px] font-medium text-ink transition-colors hover:bg-marigold/90"
          >
            {index === deck.length - 1 ? "Finish" : "Next →"}
          </button>
        </div>
      ) : null}

      {/* ── the expanded sheet ── */}
      <AnimatePresence>
        {expanded && !done ? (
          <>
            <motion.button
              type="button"
              aria-label="Close details"
              className="absolute inset-0 z-10 cursor-default bg-ink/70"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setExpanded(false)}
            />
            <motion.div
              data-testid="bite-sheet"
              className="absolute inset-x-0 bottom-0 z-20 h-[80dvh] rounded-t-lg border-t border-line bg-surface"
              initial={reducedMotion ? { opacity: 0 } : { y: "100%" }}
              animate={reducedMotion ? { opacity: 1 } : { y: 0 }}
              exit={reducedMotion ? { opacity: 0 } : { y: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 40, mass: 0.8 }}
              drag="y"
              // Only the handle starts a drag. The body scrolls.
              dragListener={false}
              dragControls={sheetDrag}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.5 }}
              onDragEnd={(_, info: PanInfo) => {
                if (info.offset.y > SHEET_DISMISS || info.velocity.y > SWIPE_VELOCITY) {
                  setExpanded(false);
                }
              }}
            >
              <BiteDetail
                bite={bite}
                onClose={() => setExpanded(false)}
                onHandlePointerDown={(e) => sheetDrag.start(e)}
              />
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
