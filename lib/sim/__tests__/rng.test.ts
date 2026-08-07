import { describe, it, expect } from "vitest";
import { clamp, gaussian, mulberry32, rollMarket } from "../rng";

describe("mulberry32", () => {
  it("is deterministic for a seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = Array.from({ length: 50 }, () => a());
    const seqB = Array.from({ length: 50 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it("diverges for different seeds", () => {
    const a = Array.from({ length: 20 }, mulberry32(1));
    const b = Array.from({ length: 20 }, mulberry32(2));
    expect(a).not.toEqual(b);
  });

  it("stays inside [0, 1)", () => {
    const r = mulberry32(7);
    for (let i = 0; i < 5000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("handles a zero seed without collapsing", () => {
    const r = mulberry32(0);
    const draws = Array.from({ length: 10 }, () => r());
    expect(new Set(draws).size).toBe(10);
  });
});

describe("gaussian", () => {
  it("lands near the requested mean and spread", () => {
    const r = mulberry32(99);
    const n = 20000;
    let sum = 0;
    const values: number[] = [];
    for (let i = 0; i < n; i++) {
      const v = gaussian(r, 0.009, 0.04);
      values.push(v);
      sum += v;
    }
    const mean = sum / n;
    const sd = Math.sqrt(values.reduce((a, v) => a + (v - mean) ** 2, 0) / n);

    expect(mean).toBeCloseTo(0.009, 2);
    expect(sd).toBeGreaterThan(0.035);
    expect(sd).toBeLessThan(0.045);
  });

  it("never returns a non-finite value", () => {
    const r = mulberry32(3);
    for (let i = 0; i < 5000; i++) {
      expect(Number.isFinite(gaussian(r, 0, 1))).toBe(true);
    }
  });
});

describe("rollMarket", () => {
  it("returns one return per month", () => {
    expect(rollMarket(1, 12)).toHaveLength(12);
    expect(rollMarket(1, 6)).toHaveLength(6);
    expect(rollMarket(1, 4)).toHaveLength(4);
  });

  it("is deterministic and seed-dependent", () => {
    expect(rollMarket(555, 12)).toEqual(rollMarket(555, 12));
    expect(rollMarket(555, 12)).not.toEqual(rollMarket(556, 12));
  });

  it("scripts a correction into month 8 or 9 of every 12-month run", () => {
    // This is the point: every run — including the one on stage — contains a
    // moment where the player panics.
    for (let seed = 1; seed <= 200; seed++) {
      const market = rollMarket(seed, 12);
      const worst = Math.min(...market);
      expect(worst, `seed ${seed}`).toBeLessThanOrEqual(-0.14);
      const crashMonth = market.indexOf(worst) + 1;
      expect([7, 8, 9], `seed ${seed} crashed in month ${crashMonth}`).toContain(crashMonth);
    }
  });

  it("follows the correction with a bounce", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const market = rollMarket(seed, 12);
      const crashIdx = market.indexOf(Math.min(...market));
      expect(market[crashIdx + 1], `seed ${seed}`).toBeGreaterThan(0);
    }
  });

  it("keeps ordinary months inside the clamp", () => {
    for (let seed = 1; seed <= 100; seed++) {
      for (const r of rollMarket(seed, 12)) {
        expect(r).toBeGreaterThanOrEqual(-0.18);
        expect(r).toBeLessThanOrEqual(0.18);
      }
    }
  });

  it("does not crash a short run that ends before the scripted correction", () => {
    // Short Bites is 4 months — the crash index falls outside it entirely.
    const bites = rollMarket(42, 4);
    expect(bites).toHaveLength(4);
    expect(bites.every(Number.isFinite)).toBe(true);
  });
});

describe("clamp", () => {
  it("bounds on both sides and passes through in between", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });
});
