import { describe, it, expect } from "vitest";
import { advanceMonth, createInitialState } from "@/lib/sim/engine";
import { choiceById, eventForMonth, isChoiceTakeable, marketForRun, takeableChoices } from "@/lib/sim/deck";
import {
  availableDiscretionary,
  healthBand,
  healthScore,
  netWorth,
  runwayMonths,
} from "@/lib/sim/metrics";
import type { Allocation, SimState } from "@/lib/sim/types";
import { storyFirstEarner } from "../packs/story-first-earner";

/**
 * The demo, played end to end, with the numbers printed.
 *
 * Run with SMOKE_LOG=1 to see the tables:
 *   SMOKE_LOG=1 npx vitest run content/__tests__/story-smoke.test.ts --disable-console-intercept
 *
 * These assertions guard the figures that get said out loud on stage. If the
 * pack is retuned and the ₹2,15,000 stops landing, this goes red.
 */

const PACK = storyFirstEarner;
const SEED = 20260807;
const MARKET = marketForRun(PACK, SEED);
const log = (...a: unknown[]) => {
  if (process.env.SMOKE_LOG) console.log(...a);
};

function saveHard(s: SimState): Allocation {
  const avail = availableDiscretionary(s);
  const spend = Math.min(2000, avail);
  return {
    discretionarySpend: spend,
    toEmergencyFund: avail - spend,
    toInvest: 0,
    extraDebtPayment: 0,
    extraDebtTargetId: null,
  };
}

function play(label: string, choices: Record<number, string> = {}) {
  let state = createInitialState(PACK, SEED);
  const rows: string[] = [];
  const chosen: (string | null)[] = [];
  const blocked: string[] = [];

  for (let m = 1; m <= 12; m++) {
    const event = eventForMonth(PACK, m, state);
    let choiceId: string | null = null;

    if (event) {
      const wanted = choices[m] ?? event.correctChoiceId;
      const choice = choiceById(event, wanted);
      if (choice && isChoiceTakeable(state, choice)) {
        choiceId = wanted;
      } else {
        choiceId = takeableChoices(state, event)[0]?.id ?? null;
        blocked.push(`m${m}: wanted ${wanted}, blocked → took ${choiceId}`);
      }
    }

    const r = advanceMonth(state, saveHard(state), event, choiceId, MARKET[m - 1]);
    state = r.state;
    chosen.push(choiceId);

    const debt = state.debts.reduce((x, d) => x + d.principal, 0);
    rows.push(
      `  ${String(m).padStart(2)}  ${String(choiceId ?? "— quiet —").padEnd(16)}` +
        `${String(r.record.netWorthEnd).padStart(10)} ${String(state.emergencyFund).padStart(8)} ` +
        `${String(state.portfolio.value).padStart(9)} ${String(debt).padStart(9)} ` +
        `${runwayMonths(state).toFixed(1).padStart(6)} ${String(r.record.healthScoreEnd).padStart(4)} ` +
        `${String(state.creditScore).padStart(5)} ${String(Math.round(state.stress)).padStart(4)}`,
    );
  }

  log(`\n── ${label} ──`);
  log("   m  choice            netWorth       EF portfolio      debt runway  hp  cibil  str");
  for (const row of rows) log(row);
  log(
    `  → net worth ${netWorth(state)} · health ${healthScore(state)} (${healthBand(healthScore(state))}) · xp ${state.xp} · badges ${state.badges.join(", ") || "none"}`,
  );
  if (blocked.length) log(`  blocked: ${blocked.join(" | ")}`);

  return { state, chosen, blocked };
}

describe("the demo path", () => {
  it("insured versus uninsured is the number that gets said on stage", () => {
    const insured = play("insured (M2 top-up, M7 opened)", { 2: "top_up", 7: "open_all" });
    const uninsured = play("uninsured (M2 skipped)", { 2: "skip", 7: "open_all", 11: "personal_loan" });

    expect(insured.chosen[10]).toBe("cashless");
    expect(uninsured.chosen[10]).toBe("personal_loan");

    const gap = netWorth(insured.state) - netWorth(uninsured.state);
    log(`\n  ★ the gap: ₹${gap.toLocaleString("en-IN")}`);
    expect(gap).toBeGreaterThan(150000);
  });

  it("the lapse path pays premiums and is still turned away", () => {
    const lapsed = play("paid, then lapsed (M2 top-up, M7 sealed)", { 2: "top_up", 7: "all_sealed" });
    expect(lapsed.chosen[10]).not.toBe("cashless");
  });

  it("the all-wrong run survives twelve months", () => {
    const worst = play("every tempting choice", {
      1: "celebrate",
      2: "skip",
      3: "emi",
      4: "all_seven",
      5: "all_in",
      6: "flat_and_car",
      7: "all_sealed",
      8: "minimum_only",
      9: "sell_all",
      10: "otp",
      11: "credit_card",
      12: "keep_saving",
    });
    expect(worst.state.month).toBe(13);
    expect(netWorth(worst.state)).toBeLessThan(0);
  });

  it("the all-correct run is reachable without anything being blocked", () => {
    const best = play("every correct choice", { 2: "top_up", 7: "open_all" });
    // If the "correct" answer is unaffordable the lesson never lands, so this
    // is the assertion that keeps the pack honest about its own arithmetic.
    expect(best.blocked, `blocked on: ${best.blocked.join(" | ")}`).toEqual([]);
  });

  it("month 8 is quiet on the cash-phone path and loud on the EMI path", () => {
    const cashPath = play("paid cash for the phone", { 3: "budget_cash" });
    const emiPath = play("took the EMI", { 3: "emi", 8: "minimum_only" });
    expect(cashPath.chosen[7]).toBeNull();
    expect(emiPath.chosen[7]).toBe("minimum_only");
  });
});
