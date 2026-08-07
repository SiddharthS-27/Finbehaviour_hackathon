import { describe, it, expect } from "vitest";
import { rollMarket } from "../rng";
import { availableDiscretionary, healthBand, healthScore, netWorth, runwayMonths } from "../metrics";
import type { SimState } from "../types";
import { alloc, testPack } from "./fixtures";
import { playRun } from "./helpers";

/**
 * Plausibility, not just internal consistency. An engine can be perfectly
 * self-consistent and still produce economics that make no sense — a saver
 * ending poorer than a spender, or twelve months of ₹42,000 producing lakhs.
 *
 * Set SMOKE_LOG=1 to print the month-by-month tables.
 */

const PACK = testPack();
const SEED = 20260807;
const MARKET = rollMarket(SEED, 12);
const log = (...args: unknown[]) => {
  if (process.env.SMOKE_LOG) console.log(...args);
};

/** Textbook policy: emergency fund until 3 months, then avalanche, then invest. */
function sensibleAllocation(s: SimState) {
  const avail = Math.max(0, availableDiscretionary(s) - 3000);
  if (avail <= 0) return alloc({ discretionarySpend: Math.min(3000, availableDiscretionary(s)) });

  const spend = Math.min(3000, availableDiscretionary(s) - avail);
  if (runwayMonths(s) < 3) return alloc({ discretionarySpend: spend, toEmergencyFund: avail });
  if (s.debts.some((d) => d.apr > 0.12)) {
    return alloc({ discretionarySpend: spend, extraDebtPayment: avail });
  }
  return alloc({
    discretionarySpend: spend,
    toEmergencyFund: Math.round(avail * 0.2),
    toInvest: avail - Math.round(avail * 0.2),
  });
}

/** Spends every rupee it is allowed to spend. */
function spendEverything(s: SimState) {
  return alloc({ discretionarySpend: availableDiscretionary(s) });
}

function summarise(label: string, allocate: (s: SimState) => ReturnType<typeof alloc>, choose?: (e: { correctChoiceId: string; choices: { id: string }[] }) => string) {
  const run = playRun({
    pack: PACK,
    seed: SEED,
    market: MARKET,
    allocate,
    choose: choose ?? ((e) => e.correctChoiceId),
  });

  log(`\n── ${label} ──`);
  log("  m   netWorth      cash    EF   portfolio    debt  runway  health  CIBIL  stress");
  for (const r of run.records) {
    const s = run.states[r.month];
    const debt = s.debts.reduce((x, d) => x + d.principal, 0);
    log(
      `  ${String(r.month).padStart(2)} ${String(r.netWorthEnd).padStart(10)} ` +
        `${String(s.cash).padStart(9)} ${String(s.emergencyFund).padStart(6)} ` +
        `${String(s.portfolio.value).padStart(10)} ${String(debt).padStart(8)} ` +
        `${runwayMonths(s).toFixed(1).padStart(6)} ${String(r.healthScoreEnd).padStart(6)} ` +
        `${String(s.creditScore).padStart(6)} ${String(Math.round(s.stress)).padStart(6)}`,
    );
  }
  const final = run.state;
  log(
    `  → net worth ${netWorth(final)}, health ${healthScore(final)} (${healthBand(healthScore(final))})`,
  );
  return run;
}

describe("plausibility", () => {
  it("a sensible saver ends the year better off than they started", () => {
    const run = summarise("sensible saver", sensibleAllocation);
    const final = run.state;

    // Started at ₹12,000 cash against a ₹1,80,000 education loan.
    expect(netWorth(final)).toBeGreaterThan(netWorth(run.states[0]));
    // Twelve months of ₹42,000 cannot produce lakhs of net worth.
    expect(netWorth(final)).toBeLessThan(42000 * 12);
    expect(final.month).toBe(13);
    expect(final.history).toHaveLength(12);
  });

  it("a saver beats a spender over the same twelve months and the same market", () => {
    const saver = summarise("sensible saver", sensibleAllocation);
    const spender = summarise("spends everything", spendEverything);

    expect(netWorth(saver.state)).toBeGreaterThan(netWorth(spender.state));
    expect(healthScore(saver.state)).toBeGreaterThan(healthScore(spender.state));
  });

  it("spending everything still never ends the run early", () => {
    const spender = playRun({
      pack: PACK,
      seed: SEED,
      market: MARKET,
      allocate: spendEverything,
      choose: (e) => e.correctChoiceId,
    });
    expect(spender.records).toHaveLength(12);
  });

  it("keeps CIBIL and stress in a believable band for a careful player", () => {
    const run = playRun({
      pack: PACK,
      seed: SEED,
      market: MARKET,
      allocate: sensibleAllocation,
      choose: (e) => e.correctChoiceId,
    });
    // Never missing a payment should leave credit better than it started.
    expect(run.state.creditScore).toBeGreaterThanOrEqual(720);
    expect(run.records.every((r) => !r.missedPayment)).toBe(true);
    expect(run.state.stress).toBeLessThan(70);
  });

  it("the scripted correction shows up in the portfolio", () => {
    // The textbook policy spends its first eight months filling the emergency
    // fund (this fixture's only debt is a 9% education loan, so the avalanche
    // never triggers) and owns nothing when the correction lands. Use a
    // SIP-from-month-one player instead — that is who the lesson is aimed at.
    const run = summarise("invests from month 1", (s) =>
      alloc({ toInvest: Math.max(0, availableDiscretionary(s) - 3000), discretionarySpend: 3000 }),
    );

    const crashMonth = MARKET.indexOf(Math.min(...MARKET)) + 1;
    const before = run.states[crashMonth - 1].portfolio.value;
    const after = run.states[crashMonth].portfolio.value;
    const contribution = run.records[crashMonth - 1].allocation.toInvest;

    expect(before).toBeGreaterThan(0);
    // The month's own contribution softens the fall, so compare against what
    // the portfolio would have been worth had the market not moved.
    expect(after).toBeLessThan(before + contribution);
    expect(MARKET[crashMonth - 1]).toBeLessThanOrEqual(-0.14);
    log(
      `\n  correction in month ${crashMonth} (${(MARKET[crashMonth - 1] * 100).toFixed(1)}%): ` +
        `${before} + ${contribution} contributed → ${after}`,
    );
  });

  it("runs a full 12-month counterfactual-style replay in well under 50ms", () => {
    const start = performance.now();
    for (let i = 0; i < 20; i++) {
      playRun({ pack: PACK, seed: SEED, market: MARKET, allocate: sensibleAllocation });
    }
    const perRun = (performance.now() - start) / 20;
    log(`\n  ${perRun.toFixed(2)}ms per 12-month run`);
    expect(perRun).toBeLessThan(50);
  });
});
