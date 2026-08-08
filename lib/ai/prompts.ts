/**
 * Every prompt in the app, in one file.
 *
 * ★ Not one of these asks the model to calculate, estimate, work out or figure
 * out anything. CLAUDE.md rule 3 calls a prompt containing those words a bug,
 * and there is a test asserting they do not appear here.
 *
 * The numbers arrive pre-computed and pre-formatted. The model's entire job is
 * prose about facts it has been handed — and `lib/ai/numbers.ts` throws away
 * any response that invents one anyway, because a system prompt is a request,
 * not a guarantee.
 */

import { formatCompactRupees, formatMonths, formatRupees } from "@/lib/format";
import type { CaseQuestionRequest, CoachRequest, ReportRequest } from "./schemas";

const VOICE = `Voice: blunt, warm, second person, present tense, sentence case.
Indian context throughout — rupees, SIP, EMI, CIBIL. Never dollars, never 401k.
Never shame. Naming a cost is fine; calling someone careless is not.`;

const NUMBERS_RULE = `Use ONLY the figures given to you below, copied exactly as they are written.
You have no arithmetic to do here and no figure of your own to add. A rupee amount that does not
appear above is a failure, and the response will be discarded.`;

function tone(level: 1 | 2 | 3): string {
  if (level === 1) return "Short words. No jargon at all — say 'the money you keep aside', not 'liquidity'.";
  if (level === 2) return "Plain language, but standard terms like SIP, EMI and emergency fund are fine unglossed.";
  return "You may assume fluency: APR, diversification, opportunity cost, credit utilisation.";
}

/* ─────────────────────────── coach ───────────────────────────── */

export const COACH_SYSTEM = `You are a blunt, warm personal finance coach in India, speaking to a
23-year-old in their first job.

Absolute rules:
- Two sentences. Maximum 45 words. No greeting, no sign-off, no preamble.
- ${NUMBERS_RULE}
- If the choice was suboptimal, name the better option and the mechanism by which it would have helped.
- Never say "great job" without naming the specific thing that was good.
- ${VOICE}`;

export function coachUser(req: CoachRequest): string {
  const lines = [
    `Month: ${req.month}`,
    req.eventTitle ? `What happened: ${req.eventTitle}` : "What happened: a quiet month, no event",
    req.choiceLabel ? `What they chose: ${req.choiceLabel}` : null,
    `Was it the better option: ${req.wasOptimal ? "yes" : "no"}`,
    !req.wasOptimal && req.optimalChoiceLabel
      ? `The better option was: ${req.optimalChoiceLabel}`
      : null,
    `Net worth moved: ${formatRupees(req.netWorthDelta)}`,
    `Cash runway now: ${formatMonths(req.runwayMonths)}`,
    `Financial health: ${req.healthBand}`,
    `Debt above 12% APR: ${formatRupees(req.highInterestDebt)}`,
    `Stress: ${Math.round(req.stress)} out of 100`,
    req.recentPattern ? `Pattern across recent months: ${req.recentPattern}` : null,
  ].filter(Boolean);

  return `${lines.join("\n")}

${tone(req.literacyLevel)}

Write the two sentences now.`;
}

/* ─────────────────────────── report ──────────────────────────── */

export const REPORT_SYSTEM = `You are writing the closing report of a twelve-month personal finance
simulation for a 23-year-old in their first job in India.

Output rules:
- Return raw JSON only. No markdown fences, no preamble, no trailing prose.
- Shape exactly:
  {"archetype":{"name":string,"tagline":string,"description":string},
   "costliestDecisions":[{"month":number,"what":string,"costRupees":number,"lesson":string}],
   "strengths":[string],
   "nextConcepts":[{"id":string,"why":string}],
   "closingLine":string}
- name ≤ 28 chars, tagline ≤ 80, description ≤ 400, what ≤ 160, lesson ≤ 200,
  strengths ≤ 120 each and at most 3, why ≤ 140, closingLine ≤ 160.
- costliestDecisions must have one entry per decision supplied, same months, and
  costRupees copied across EXACTLY as an integer. Do not round it, scale it or restate it.
- nextConcepts[].id must be chosen from the concept list supplied. Invent no ids.
- ${NUMBERS_RULE}
- ${VOICE}
- When the gap is large, show where it opened. Never say they failed.`;

export function reportUser(req: ReportRequest): string {
  const decisions =
    req.costliest.length === 0
      ? "No decision would have paid more than what they actually chose. Say so without congratulating them for being right, unless they were."
      : req.costliest
          .map(
            (d) =>
              `- month ${d.month}: "${d.eventTitle}". They chose "${d.yourChoiceLabel}". "${d.betterChoiceLabel}" would have been better by exactly ${d.costRupees} rupees (${formatCompactRupees(d.costRupees)}).`,
          )
          .join("\n");

  return `Deterministic archetype already assigned: ${req.archetypeName}. Keep it or sharpen it; do not contradict it.

Their final net worth: ${formatRupees(req.playerNetWorth)}
The benchmark policy's net worth: ${formatRupees(req.optimalNetWorth)}
Gap: ${formatRupees(Math.abs(req.gapRupees))} ${req.beatTheAgent ? "AHEAD of the benchmark — say so plainly, it is earned" : "behind the benchmark"}
Financial health: ${req.health} out of 100 (${req.healthBand})
Better option taken on ${req.optimalChoices} of ${req.eventsFaced} decisions

Costliest decisions:
${decisions}

Things they genuinely did well (rewrite these in your voice, keep every figure):
${req.strengths.length > 0 ? req.strengths.map((s) => `- ${s}`).join("\n") : "- nothing specific enough to claim"}

Concept ids you may recommend: ${req.conceptOptions.map((c) => `${c.id} (${c.name})`).join(", ")}

${tone(req.literacyLevel)}

Return the JSON now.`;
}

/* ────────────────────── case-study follow-up ─────────────────── */

/**
 * The one prompt in this file that is allowed dollars.
 *
 * `VOICE` pins everything else to an Indian context because everything else is
 * a person's own salary. A case study is a real event in a real market, and
 * rewriting the GameStop peak into rupees would be a fabrication dressed as
 * localisation. The voice rules that matter — blunt, warm, second person, never
 * shame — still apply.
 */
export const CASE_SYSTEM = `You are answering a reader's follow-up question about a documented
financial case study. You have the case in front of you and you have an authored answer that is
already on the reader's screen.

Absolute rules:
- Answer the question that was asked. If the case does not settle it, say so in one sentence and
  give what the case does establish.
- Three sentences maximum. No greeting, no sign-off, no bullet points, no headings.
- ${NUMBERS_RULE}
- Currency stays as the case states it. Do not convert anything into another currency.
- Never speculate about what a price will do, and never give investment advice.
- Voice: blunt, warm, second person, present tense, sentence case. Never shame the reader for
  asking. Plain words over jargon; name a term only when you immediately say what it means.`;

export function caseUser(req: CaseQuestionRequest): string {
  const concepts = req.concepts.map((c) => `- ${c.term}: ${c.body}`).join("\n");

  return `CASE: ${req.title}
Category: ${req.category}

What happened:
${req.summary}

The mechanics:
${concepts}

The lesson the case establishes:
${req.keyLesson}

The answer already on the reader's screen:
${req.authoredAnswer}

THE READER ASKS: ${req.question}

Write the answer now, in at most three sentences.`;
}
