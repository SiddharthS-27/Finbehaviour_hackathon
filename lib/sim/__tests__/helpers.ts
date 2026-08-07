/** Shared assertions and a tiny deck runner for the engine tests. */

import { expect } from "vitest";
import { advanceMonth, createInitialState } from "../engine";
import { evaluateGate } from "../effects";
import type {
  Allocation,
  ContentPack,
  EventCard,
  MonthRecord,
  SimState,
} from "../types";
import { ZERO_ALLOC } from "./fixtures";

/** Every field that holds money. Each one must be an integer, always. */
export function moneyFields(s: SimState): [string, number][] {
  const fields: [string, number][] = [
    ["cash", s.cash],
    ["emergencyFund", s.emergencyFund],
    ["portfolio.value", s.portfolio.value],
    ["portfolio.invested", s.portfolio.invested],
    ["monthlyIncome", s.monthlyIncome],
    ["fixedExpenses", s.fixedExpenses],
    ["insuranceHealthPremium", s.insuranceHealthPremium],
    ["insuranceTermPremium", s.insuranceTermPremium],
    ["xp", s.xp],
  ];
  for (const d of s.debts) {
    fields.push([`debt(${d.id}).principal`, d.principal]);
    fields.push([`debt(${d.id}).minPaymentFloor`, d.minPaymentFloor]);
  }
  for (const sub of s.subscriptions) {
    fields.push([`sub(${sub.id}).monthlyCost`, sub.monthlyCost]);
  }
  if (s.incomeBeforeBurnout !== null) {
    fields.push(["incomeBeforeBurnout", s.incomeBeforeBurnout]);
  }
  return fields;
}

export function expectIntegerMoney(s: SimState, label: string): void {
  for (const [name, value] of moneyFields(s)) {
    expect(
      Number.isInteger(value),
      `${label}: ${name} is ${value}, which is not an integer rupee`,
    ).toBe(true);
  }
}

/** Walk everything reachable and report any NaN or Infinity by path. */
export function findNonFinite(value: unknown, path = "root"): string[] {
  if (typeof value === "number") {
    return Number.isFinite(value) ? [] : [`${path} = ${value}`];
  }
  if (Array.isArray(value)) {
    return value.flatMap((v, i) => findNonFinite(v, `${path}[${i}]`));
  }
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([k, v]) => findNonFinite(v, `${path}.${k}`));
  }
  return [];
}

export function expectAllFinite(value: unknown, label: string): void {
  const bad = findNonFinite(value, label);
  expect(bad, `non-finite numbers found: ${bad.join(", ")}`).toEqual([]);
}

export function expectClamped(s: SimState, label: string): void {
  expect(s.stress, `${label}: stress`).toBeGreaterThanOrEqual(0);
  expect(s.stress, `${label}: stress`).toBeLessThanOrEqual(100);
  expect(s.creditScore, `${label}: CIBIL`).toBeGreaterThanOrEqual(300);
  expect(s.creditScore, `${label}: CIBIL`).toBeLessThanOrEqual(900);
  expect(s.portfolio.value, `${label}: portfolio`).toBeGreaterThanOrEqual(0);
}

/* ──────────────────────────── the runner ─────────────────────── */

/** Stand-in for Phase 2's deck.ts: the month's event, if its gate is met. */
export function eventForMonth(
  pack: ContentPack,
  month: number,
  state: SimState,
): EventCard | null {
  const event = pack.events.find((e) => e.month === month);
  if (!event) return null;
  return evaluateGate(state, event.gate) ? event : null;
}

export interface RunOptions {
  pack: ContentPack;
  seed?: number;
  months?: number;
  market: number[];
  /** which choice to take; defaults to the correct one */
  choose?: (event: EventCard, state: SimState) => string | null;
  /** what to allocate; defaults to nothing */
  allocate?: (state: SimState, month: number) => Allocation;
  /** called after every month, for per-step assertions */
  onMonth?: (state: SimState, record: MonthRecord) => void;
}

export interface RunResult {
  state: SimState;
  records: MonthRecord[];
  states: SimState[];
}

/** Play a run start to finish, deterministically. */
export function playRun(opts: RunOptions): RunResult {
  const {
    pack,
    seed = 12345,
    months = pack.totalMonths,
    market,
    choose = (e) => e.correctChoiceId,
    allocate = () => ZERO_ALLOC,
    onMonth,
  } = opts;

  let state = createInitialState(pack, seed);
  const records: MonthRecord[] = [];
  const states: SimState[] = [structuredClone(state)];

  for (let m = 1; m <= months; m++) {
    const event = eventForMonth(pack, m, state);
    const choiceId = event ? choose(event, state) : null;
    const result = advanceMonth(state, allocate(state, m), event, choiceId, market[m - 1] ?? 0);
    state = result.state;
    records.push(result.record);
    states.push(structuredClone(state));
    onMonth?.(state, result.record);
  }

  return { state, records, states };
}
