/**
 * Seeded randomness. The only source of it in the entire project.
 *
 * `Math.random()` is banned under `lib/sim/` (CLAUDE.md rule 1) because the
 * shadow agent must face a byte-identical market to the player, and the stage
 * demo must be reproducible from a seed.
 */

/** Clamp helper — used everywhere, defined once. */
export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/**
 * mulberry32 — small, fast, and good enough for a 12-month simulation.
 * Returns a generator of floats in [0, 1).
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Box–Muller. Consumes exactly two draws per call, so the consumption order —
 * and therefore the whole sequence — stays deterministic.
 */
export function gaussian(rand: () => number, mean: number, sd: number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rand(); // log(0) is -Infinity; reject it
  while (v === 0) v = rand();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * A month-by-month market path.
 *
 * The scripted correction in month 8 or 9 is deliberate: it guarantees that
 * every run — including the one on stage — contains a moment where the player
 * panics. That moment is the whole point of the volatility lesson.
 *
 * Historical mode overrides this entirely with real returns from its pack.
 */
export function rollMarket(seed: number, months: number): number[] {
  const r = mulberry32(seed ^ 0x9e3779b9);

  // Array.from's callback runs 0..n-1 in order, so RNG consumption is stable.
  const out = Array.from({ length: months }, () =>
    clamp(gaussian(r, 0.009, 0.04), -0.18, 0.18),
  );

  const crash = 8 + Math.floor(r() * 2); // month 8 or 9
  if (crash < months) out[crash - 1] = -0.14 - r() * 0.04;
  if (crash < months - 1) out[crash] = 0.03 + r() * 0.04;

  return out;
}
