import type { CaseFaq, CaseStudy } from "@/content/case-studies";

/**
 * The follow-up box, with no model behind it.
 *
 * CLAUDE.md rule 4: the fallback ships first. Every case study carries authored
 * answers to the questions people actually ask, and this is what picks one.
 * With `GEMINI_API_KEY` absent the box still answers — the generated path is an
 * enhancement layered on top, never the thing that makes the feature work.
 *
 * Pure: no clock, no randomness, no IO. Tested directly.
 */

/** Words too common to carry any signal. Matching on these would match everything. */
const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "but", "by", "can", "did", "do", "does",
  "for", "from", "had", "has", "have", "how", "i", "if", "in", "is", "it", "its", "me",
  "my", "of", "on", "or", "so", "that", "the", "their", "them", "then", "there", "these",
  "they", "this", "to", "was", "were", "what", "when", "which", "who", "why", "will",
  "with", "would", "you", "your",
]);

export function tokenise(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9$%\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

/**
 * Score one authored answer against a question.
 *
 * Multi-word keywords ("short sell", "buy button") score double when the whole
 * phrase is present — a phrase hit is far stronger evidence than two loose word
 * hits, and without the bonus "short" alone would out-vote it.
 */
export function scoreFaq(faq: CaseFaq, question: string): number {
  const asked = question.toLowerCase();
  const words = new Set(tokenise(question));
  let score = 0;

  for (const keyword of faq.keywords) {
    const key = keyword.toLowerCase();
    if (key.includes(" ")) {
      if (asked.includes(key)) score += 2;
      continue;
    }
    if (words.has(key)) score += 1;
  }

  // The authored question itself is signal — somebody typing something close to
  // it should land on it even if none of the keywords were anticipated.
  for (const word of tokenise(faq.question)) {
    if (words.has(word)) score += 0.5;
  }

  return score;
}

export interface CaseAnswer {
  text: string;
  /** `authored` when a specific FAQ matched; `general` when nothing did. */
  kind: "authored" | "general";
  /** The FAQ that matched, so the UI can show which question it answered. */
  matched: CaseFaq | null;
}

/**
 * The best authored answer, or an honest general one.
 *
 * A weak match is worse than no match: answering "how do I spot a decoy" with
 * the sample-size paragraph reads as a machine that did not listen. Below the
 * threshold this falls back to the case's own key lesson and says so, which is
 * true, useful, and never pretends to have understood.
 */
export function fallbackAnswer(study: CaseStudy, question: string): CaseAnswer {
  const trimmed = question.trim();

  if (trimmed.length === 0) {
    return { text: study.keyLesson, kind: "general", matched: null };
  }

  let best: CaseFaq | null = null;
  let bestScore = 0;

  for (const faq of study.faq) {
    const score = scoreFaq(faq, trimmed);
    if (score > bestScore) {
      best = faq;
      bestScore = score;
    }
  }

  if (best && bestScore >= 1) {
    return { text: best.answer, kind: "authored", matched: best };
  }

  return {
    text: `That one is not in the notes for this case. Here is what the case does establish: ${study.keyLesson}`,
    kind: "general",
    matched: null,
  };
}
