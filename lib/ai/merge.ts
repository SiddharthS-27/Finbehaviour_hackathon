/**
 * Where generated prose is allowed to land on a finished report.
 *
 * ★ The rule that governs this file: **the model may replace words, never
 * numbers.** Every rupee figure, every month, every count on the report page
 * stays exactly what the engine computed. The route already rejects a response
 * that restates `costRupees` or invents a figure; this is the second wall, and
 * it works by simply never reading a number out of the model's reply.
 *
 * If any single field is missing or unusable, that field keeps its authored
 * version and the rest still merges. There is no all-or-nothing swap, because a
 * half-generated report is still better than a half-blank one.
 *
 * Pure.
 */

import { conceptById } from "@/content/concepts";
import type { ReportData } from "./fallbacks";
import type { ReportAi } from "./schemas";

export function mergeAiReport(base: ReportData, ai: ReportAi | null): ReportData {
  if (!ai) return base;

  return {
    ...base,
    source: "ai",

    archetype: {
      // The id stays deterministic: it drives the `data-archetype` attribute and
      // any styling keyed off it. Only the words change.
      id: base.archetype.id,
      name: ai.archetype.name || base.archetype.name,
      tagline: ai.archetype.tagline || base.archetype.tagline,
      description: ai.archetype.description || base.archetype.description,
    },

    // Only the *lesson* is swapped. The sentence above it is composed from the
    // computed cost and the authored choice labels, and it is the one place on
    // the page where a figure and its explanation sit together — so it stays
    // deterministic on principle rather than on trust.
    costliest: base.costliest.map((d) => {
      const written = ai.costliestDecisions.find((x) => x.month === d.month);
      return written ? { ...d, lesson: written.lesson || d.lesson } : d;
    }),

    strengths: ai.strengths.length > 0 ? ai.strengths : base.strengths,

    nextConcepts:
      ai.nextConcepts.length > 0
        ? ai.nextConcepts
            .map((c) => {
              const concept = conceptById(c.id);
              return concept ? { id: c.id, name: concept.name, why: c.why } : null;
            })
            .filter((c): c is { id: string; name: string; why: string } => c !== null)
        : base.nextConcepts,

    closingLine: ai.closingLine || base.closingLine,
  };
}
