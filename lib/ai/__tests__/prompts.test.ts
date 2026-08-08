import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { COACH_SYSTEM, REPORT_SYSTEM, coachUser, reportUser } from "../prompts";
import { mergeAiReport } from "../merge";
import { reportAiSchema, coachRequestSchema, reportRequestSchema } from "../schemas";
import { stripFences, parseJson } from "../parse";
import { auditNumbers, factsIn } from "../numbers";
import type { CoachRequest, ReportRequest } from "../schemas";
import type { ReportData } from "../fallbacks";

/**
 * The prompt layer.
 *
 * CLAUDE.md rule 3 says a prompt containing "calculate", "estimate", "work out"
 * or "figure out how much" is a bug. That is checked mechanically here rather
 * than left to memory, because it is exactly the kind of line that gets added
 * later by someone trying to be helpful.
 */

const COACH: CoachRequest = {
  month: 6,
  eventTitle: "The raise",
  choiceLabel: "Better flat and the car — you've earned it",
  wasOptimal: false,
  optimalChoiceLabel: "Bank the whole raise. Nothing else changes.",
  netWorthDelta: -3723,
  runwayMonths: 0.4,
  healthBand: "Shaky",
  highInterestDebt: 107309,
  stress: 24,
  literacyLevel: 2,
  recentPattern: "spent the whole discretionary budget 3 months running",
};

const REPORT: ReportRequest = {
  archetypeName: "The Present-Tense Spender",
  gapRupees: 796329,
  playerNetWorth: -743823,
  optimalNetWorth: 52506,
  beatTheAgent: false,
  health: 14,
  healthBand: "Fragile",
  optimalChoices: 0,
  eventsFaced: 12,
  literacyLevel: 2,
  costliest: [
    {
      month: 6,
      eventTitle: "The raise",
      yourChoiceLabel: "Better flat and the car",
      betterChoiceLabel: "Bank the whole raise",
      costRupees: 438289,
    },
  ],
  strengths: [],
  conceptOptions: [{ id: "budgeting", name: "Budgeting" }],
};

const BANNED = /\b(calculate|estimate|work out|figure out how much|compute)\b/i;

describe("★ no prompt asks the model to do arithmetic", () => {
  it("not in the system prompts", () => {
    expect(COACH_SYSTEM, "coach system").not.toMatch(BANNED);
    expect(REPORT_SYSTEM, "report system").not.toMatch(BANNED);
  });

  it("not in the user messages", () => {
    expect(coachUser(COACH)).not.toMatch(BANNED);
    expect(reportUser(REPORT)).not.toMatch(BANNED);
  });

  it("not anywhere in the prompts file", () => {
    const src = readFileSync(join(process.cwd(), "lib", "ai", "prompts.ts"), "utf8");
    // Strip the comments that *discuss* the rule.
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
    expect(code).not.toMatch(BANNED);
  });

  it("both system prompts state the rule explicitly", () => {
    for (const prompt of [COACH_SYSTEM, REPORT_SYSTEM]) {
      expect(prompt).toMatch(/ONLY the figures given/i);
    }
  });
});

describe("prompts carry pre-computed, pre-formatted facts", () => {
  it("★ every figure reaches the model already rendered", () => {
    const user = coachUser(COACH);
    expect(user).toContain("₹3,723"); // netWorthDelta, formatted
    expect(user).toContain("₹1,07,309"); // Indian grouping, not ₹107,309
    expect(user).not.toContain("107309");
  });

  it("★ a compliant reply quoting only those figures passes the audit", () => {
    const reply =
      "You took the flat and the car, and your net worth moved ₹3,723 the wrong way. Banking the whole raise would have kept your ₹1,07,309 of expensive debt shrinking instead of growing.";
    expect(auditNumbers(reply, factsIn(COACH)).ok).toBe(true);
  });

  it("names the better option when the choice was wrong", () => {
    expect(coachUser(COACH)).toContain("The better option was: Bank the whole raise");
  });

  it("says nothing about a better option when the choice was right", () => {
    const user = coachUser({ ...COACH, wasOptimal: true, optimalChoiceLabel: null });
    expect(user).not.toMatch(/better option was/);
  });

  it("hands the report the exact integer it must return", () => {
    expect(reportUser(REPORT)).toContain("better by exactly 438289 rupees");
  });

  it("tells the report to say so plainly when the player is ahead", () => {
    expect(reportUser({ ...REPORT, beatTheAgent: true })).toMatch(/AHEAD of the benchmark/);
  });

  it("pitches to literacy level without touching a number", () => {
    const plain = coachUser({ ...COACH, literacyLevel: 1 });
    const fluent = coachUser({ ...COACH, literacyLevel: 3 });
    expect(plain).toMatch(/No jargon/);
    expect(fluent).toMatch(/assume fluency/);
    // Same facts either way.
    expect(plain).toContain("₹1,07,309");
    expect(fluent).toContain("₹1,07,309");
  });
});

describe("request schemas reject junk before it reaches a model", () => {
  it("accepts a well-formed coach request", () => {
    expect(coachRequestSchema.safeParse(COACH).success).toBe(true);
  });

  it("rejects a month outside any pack", () => {
    expect(coachRequestSchema.safeParse({ ...COACH, month: 99 }).success).toBe(false);
  });

  it("rejects a literacy level that does not exist", () => {
    expect(coachRequestSchema.safeParse({ ...COACH, literacyLevel: 7 }).success).toBe(false);
  });

  it("accepts a well-formed report request", () => {
    expect(reportRequestSchema.safeParse(REPORT).success).toBe(true);
  });
});

describe("parsing a model reply", () => {
  it("★ strips markdown fences the model was told not to use", () => {
    expect(stripFences('```json\n{"a":1}\n```')).toBe('{"a":1}');
    expect(stripFences('```\n{"a":1}\n```')).toBe('{"a":1}');
    expect(stripFences('  {"a":1}  ')).toBe('{"a":1}');
  });

  it("returns null instead of throwing on garbage", () => {
    expect(parseJson("Sure! Here is your report:")).toBeNull();
    expect(parseJson("")).toBeNull();
    expect(parseJson("{unclosed")).toBeNull();
  });

  it("rejects a reply that busts a length cap", () => {
    const tooLong = {
      archetype: { name: "x".repeat(40), tagline: "t", description: "d" },
      costliestDecisions: [],
      strengths: [],
      nextConcepts: [],
      closingLine: "c",
    };
    expect(reportAiSchema.safeParse(tooLong).success).toBe(false);
  });
});

describe("★ merging generated prose never moves a number", () => {
  const base = {
    archetype: { id: "present_tense_spender", name: "The Present-Tense Spender", tagline: "t", description: "d" },
    summary: { gapRupees: 796329, finalNetWorth: -743823 },
    costliest: [
      { month: 6, costRupees: 438289, eventTitle: "The raise", lesson: "Authored lesson." },
    ],
    decisions: [],
    mastery: [],
    badges: [],
    strengths: ["authored strength"],
    nextConcepts: [{ id: "budgeting", name: "Budgeting", why: "authored why" }],
    theoryPracticeGap: null,
    closingLine: "Authored closing.",
    beatTheAgent: false,
    nothingCostlyReason: null,
    source: "fallback",
  } as unknown as ReportData;

  const ai = {
    archetype: { name: "Generated name", tagline: "Generated tagline", description: "Generated description" },
    costliestDecisions: [{ month: 6, what: "w", costRupees: 438289, lesson: "Generated lesson." }],
    strengths: ["generated strength"],
    nextConcepts: [{ id: "budgeting", why: "generated why" }],
    closingLine: "Generated closing.",
  };

  it("swaps the words", () => {
    const merged = mergeAiReport(base, reportAiSchema.parse(ai));
    expect(merged.archetype.name).toBe("Generated name");
    expect(merged.costliest[0].lesson).toBe("Generated lesson.");
    expect(merged.closingLine).toBe("Generated closing.");
    expect(merged.source).toBe("ai");
  });

  it("★ leaves every figure exactly where the engine put it", () => {
    const merged = mergeAiReport(base, reportAiSchema.parse(ai));
    expect(merged.costliest[0].costRupees).toBe(438289);
    expect(merged.summary.gapRupees).toBe(796329);
    expect(merged.summary.finalNetWorth).toBe(-743823);
    // The archetype id drives styling and the gate; only its copy is generated.
    expect(merged.archetype.id).toBe("present_tense_spender");
  });

  it("is the identity when nothing came back", () => {
    expect(mergeAiReport(base, null)).toBe(base);
    expect(mergeAiReport(base, null).source).toBe("fallback");
  });

  it("keeps the authored version of any field the model left empty", () => {
    const sparse = reportAiSchema.parse({ ...ai, strengths: [], nextConcepts: [] });
    const merged = mergeAiReport(base, sparse);
    expect(merged.strengths).toEqual(["authored strength"]);
    expect(merged.nextConcepts[0].why).toBe("authored why");
  });

  it("drops a concept id that does not exist rather than rendering a dead chip", () => {
    const bogus = reportAiSchema.parse({ ...ai, nextConcepts: [{ id: "not_a_concept", why: "w" }] });
    expect(mergeAiReport(base, bogus).nextConcepts).toEqual([]);
  });
});
