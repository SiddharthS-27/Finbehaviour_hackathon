import { z } from "zod";

/**
 * The contract with the model.
 *
 * Length caps are not cosmetic. A 900-word archetype description would blow the
 * layout apart on a 390px screen, and there is no way to hand that back to the
 * player gracefully — so anything that misses the shape is rejected wholesale
 * and the deterministic template renders instead.
 *
 * Shared by the route (validating a response) and the client (validating what
 * the route returned). Neither trusts the other.
 */

/* ─────────────────────────── coach ───────────────────────────── */

export const coachRequestSchema = z.object({
  month: z.number().int().min(1).max(24),
  eventTitle: z.string().max(120).nullable(),
  choiceLabel: z.string().max(160).nullable(),
  wasOptimal: z.boolean(),
  optimalChoiceLabel: z.string().max(160).nullable(),
  netWorthDelta: z.number(),
  runwayMonths: z.number(),
  healthBand: z.string().max(24),
  highInterestDebt: z.number(),
  stress: z.number(),
  literacyLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  /** "three months of spending everything" — computed, never inferred by the model. */
  recentPattern: z.string().max(160).nullable(),
});

export type CoachRequest = z.infer<typeof coachRequestSchema>;

export const coachResponseSchema = z.object({
  /** Null means "no generated line" — the caller keeps its fallback. */
  text: z.string().max(400).nullable(),
  source: z.enum(["ai", "fallback"]),
});

export type CoachResponse = z.infer<typeof coachResponseSchema>;

/* ─────────────────────────── report ──────────────────────────── */

export const reportRequestSchema = z.object({
  archetypeName: z.string().max(40),
  gapRupees: z.number(),
  playerNetWorth: z.number(),
  optimalNetWorth: z.number(),
  beatTheAgent: z.boolean(),
  health: z.number(),
  healthBand: z.string().max(24),
  optimalChoices: z.number().int(),
  eventsFaced: z.number().int(),
  literacyLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  costliest: z
    .array(
      z.object({
        month: z.number().int(),
        eventTitle: z.string().max(120),
        yourChoiceLabel: z.string().max(160),
        betterChoiceLabel: z.string().max(160),
        /** ★ Passed in, and required back verbatim. */
        costRupees: z.number(),
      }),
    )
    .max(3),
  strengths: z.array(z.string().max(200)).max(3),
  conceptOptions: z.array(z.object({ id: z.string(), name: z.string() })).max(20),
});

export type ReportRequest = z.infer<typeof reportRequestSchema>;

/**
 * What the model must return. This is the plan's §10 schema verbatim, with two
 * relaxations found while testing: `costliestDecisions` matches however many
 * were supplied rather than always three (a flawless run has none), and
 * `nextConcepts` likewise.
 */
export const reportAiSchema = z.object({
  archetype: z.object({
    name: z.string().min(1).max(28),
    tagline: z.string().min(1).max(80),
    description: z.string().min(1).max(400),
  }),
  costliestDecisions: z.array(
    z.object({
      month: z.number().int(),
      what: z.string().min(1).max(160),
      costRupees: z.number(),
      lesson: z.string().min(1).max(200),
    }),
  ),
  strengths: z.array(z.string().max(120)).max(3),
  nextConcepts: z.array(z.object({ id: z.string(), why: z.string().max(140) })),
  closingLine: z.string().min(1).max(160),
});

export type ReportAi = z.infer<typeof reportAiSchema>;

export const reportResponseSchema = z.object({
  report: reportAiSchema.nullable(),
  source: z.enum(["ai", "fallback"]),
});

export type ReportResponse = z.infer<typeof reportResponseSchema>;

/* ────────────────────── case-study follow-up ─────────────────── */

/**
 * A reader's question about a case study.
 *
 * The whole case travels with the question. That is deliberate on two counts:
 * the model needs the facts in front of it because it is forbidden from
 * supplying its own (rule 3), and `allowedFrom` builds the permitted-number set
 * by scanning this payload — so every figure the case states is quotable and
 * anything else is not.
 */
export const caseQuestionRequestSchema = z.object({
  caseId: z.string().max(64),
  title: z.string().max(200),
  category: z.string().max(60),
  summary: z.string().max(4000),
  keyLesson: z.string().max(800),
  concepts: z
    .array(z.object({ term: z.string().max(80), body: z.string().max(800) }))
    .max(12),
  /** The authored answer already on screen. The model improves on it or is discarded. */
  authoredAnswer: z.string().max(1200),
  question: z.string().min(1).max(300),
});

export type CaseQuestionRequest = z.infer<typeof caseQuestionRequestSchema>;

export const caseQuestionResponseSchema = z.object({
  /** Null means "keep the authored answer" — never an error. */
  text: z.string().max(900).nullable(),
  source: z.enum(["ai", "fallback"]),
});

export type CaseQuestionResponse = z.infer<typeof caseQuestionResponseSchema>;
