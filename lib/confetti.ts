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

/**
 * The honest one — fired when something was actually earned.
 *
 * `fireDopamine` above is a manipulation being *demonstrated*: it rewards the
 * tempting choice so the consequence can arrive three months later. This is the
 * opposite and must stay a separate function, or the day somebody reuses it the
 * app will be celebrating a mistake.
 *
 * Wider, slower, mint-led — the colour of the optimal path.
 */
export async function fireCelebration(opts?: { reducedMotion?: boolean }): Promise<void> {
  if (opts?.reducedMotion) return;
  if (typeof window === "undefined") return;

  try {
    const { default: confetti } = await import("canvas-confetti");
    const shared = {
      colors: ["#6FC79A", "#E9A63C", "#E8E2D4"],
      disableForReducedMotion: true,
      ticks: 220,
      gravity: 0.9,
      scalar: 1,
    };
    // Two cones from the lower corners, which reads as the screen itself
    // applauding rather than a single burst out of a button.
    confetti({ ...shared, particleCount: 60, spread: 55, angle: 60, origin: { x: 0, y: 0.7 } });
    confetti({ ...shared, particleCount: 60, spread: 55, angle: 120, origin: { x: 1, y: 0.7 } });
  } catch {
    // Never let a celebration break the screen it is celebrating.
  }
}
