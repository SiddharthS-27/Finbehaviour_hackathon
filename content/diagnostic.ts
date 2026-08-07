import type { LiteracyLevel } from "@/lib/sim/types";

/**
 * The three-question diagnostic, shown at onboarding.
 *
 * Adapted from Lusardi & Mitchell's "Big Three" — the most replicated
 * instrument in financial literacy research — localised to rupees.
 *
 * It exists to set `literacyLevel`, which selects explanation depth and sets a
 * tone parameter in the AI prompt. It never touches a number in the simulation.
 *
 * Framed as "no wrong answers" because we are **never** asking whether someone
 * is educated. We infer what they already know and pitch to it. That is both
 * more accurate and not insulting.
 *
 * "Not sure" is a deliberate option on every question. Forcing a guess turns a
 * clean signal into noise, and someone who knows they do not know is telling us
 * something useful.
 */

export interface DiagnosticOption {
  id: string;
  label: string;
}

export interface DiagnosticQuestion {
  id: string;
  /** the concept this probes — a miss here seeds the learning path */
  concept: string;
  prompt: string;
  helper?: string;
  options: DiagnosticOption[];
  correctOptionId: string;
  /** shown after answering, whatever they picked */
  explanation: string;
}

export const DIAGNOSTIC_INTRO =
  "Quick check — no wrong answers. This just helps us pitch things at the right level.";

export const DIAGNOSTIC: DiagnosticQuestion[] = [
  {
    id: "compounding",
    concept: "compounding",
    prompt:
      "You put ₹100 in an account that pays 2% a year. You take nothing out. After 5 years, how much is in the account?",
    helper: "Interest is added each year.",
    options: [
      { id: "more", label: "More than ₹110" },
      { id: "exactly", label: "Exactly ₹110" },
      { id: "less", label: "Less than ₹110" },
      { id: "unsure", label: "Not sure" },
    ],
    correctOptionId: "more",
    explanation:
      "More than ₹110. Each year's interest earns interest of its own, so five years of 2% comes to ₹110.41 rather than a flat ₹110. Small gap here — very large gap over thirty years.",
  },
  {
    id: "inflation",
    concept: "budgeting",
    prompt:
      "Your account pays 1% a year. Prices are rising 2% a year. After one year, how much could you buy with the money in that account?",
    options: [
      { id: "more", label: "More than today" },
      { id: "same", label: "About the same" },
      { id: "less", label: "Less than today" },
      { id: "unsure", label: "Not sure" },
    ],
    correctOptionId: "less",
    explanation:
      "Less. The balance grew 1% but everything you would buy with it grew 2%, so you are about 1% poorer in real terms. Money sitting still is quietly losing.",
  },
  {
    id: "diversification",
    concept: "diversification",
    prompt: "True or false: buying one company's stock usually gives a safer return than buying a mutual fund.",
    options: [
      { id: "true", label: "True" },
      { id: "false", label: "False" },
      { id: "unsure", label: "Not sure" },
    ],
    correctOptionId: "false",
    explanation:
      "False. A fund holds many companies, so one failing is cushioned by the rest. A single stock has no cushion at all — it can go to zero on its own.",
  },
];

export interface DiagnosticResult {
  correct: number;
  literacyLevel: LiteracyLevel;
  /** concept ids the player got wrong or was unsure about — seeds the learning path */
  missedConcepts: string[];
  /** ids they answered correctly, for the theory-vs-practice gap in the report */
  knownConcepts: string[];
}

/**
 * 0–1 correct → level 1 · 2 correct → level 2 · 3 correct → level 3.
 *
 * An unanswered question counts as missed, so a skipped diagnostic yields the
 * plainest language — which is the safe direction to be wrong in.
 */
export function scoreDiagnostic(answers: Record<string, string>): DiagnosticResult {
  const knownConcepts: string[] = [];
  const missedConcepts: string[] = [];

  for (const q of DIAGNOSTIC) {
    if (answers[q.id] === q.correctOptionId) knownConcepts.push(q.concept);
    else missedConcepts.push(q.concept);
  }

  const correct = knownConcepts.length;
  const literacyLevel: LiteracyLevel = correct >= 3 ? 3 : correct === 2 ? 2 : 1;

  return { correct, literacyLevel, missedConcepts, knownConcepts };
}
