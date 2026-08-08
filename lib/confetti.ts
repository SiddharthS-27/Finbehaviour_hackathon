/**
 * Instant dopamine, fired on the *tempting* choice.
 *
 * This is the most powerful and most underused manipulation vector in the
 * catalogue: reward the wrong decision immediately, then let the consequence
 * arrive three months later. That single asymmetry teaches present bias better
 * than any lecture — see STORY_MODE_EVENTS §1.
 *
 * Loaded lazily so `canvas-confetti` never lands in the initial bundle, and
 * skipped entirely under reduced motion.
 */

const PALETTE = ["#E9A63C", "#E8E2D4", "#6FC79A"];

export async function fireDopamine(opts?: { reducedMotion?: boolean }): Promise<void> {
  if (opts?.reducedMotion) return;
  if (typeof window === "undefined") return;

  try {
    const { default: confetti } = await import("canvas-confetti");
    confetti({
      particleCount: 70,
      spread: 62,
      startVelocity: 34,
      gravity: 1.1,
      ticks: 160,
      // Just below centre, so it reads as bursting out of the button.
      origin: { y: 0.62 },
      colors: PALETTE,
      disableForReducedMotion: true,
      scalar: 0.9,
    });
  } catch {
    // A missing confetti bundle must never break a decision. Silent by design.
  }
}
