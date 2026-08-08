import { NextResponse } from "next/server";
import { generate } from "@/lib/ai/provider";
import { parseJson } from "@/lib/ai/parse";
import { auditNumbers, allowedFrom } from "@/lib/ai/numbers";
import { REPORT_SYSTEM, reportUser } from "@/lib/ai/prompts";
import {
  reportAiSchema,
  reportRequestSchema,
  type ReportAi,
  type ReportResponse,
} from "@/lib/ai/schemas";

/**
 * One call, strict JSON, and four independent chances to reject it.
 *
 *   1. it parses at all (after fences are stripped)
 *   2. it matches the Zod shape and every length cap
 *   3. every `costRupees` came back **verbatim** for the right month
 *   4. no rupee figure anywhere that was not in the request
 *
 * Failing any of them returns `report: null` and the deterministic template —
 * which is already complete, already on screen, and already good. The AI is an
 * enhancement layered on a finished product, never a dependency of it.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NONE: ReportResponse = { report: null, source: "fallback" };

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(NONE);
  }

  const parsed = reportRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json(NONE);

  const raw = await generate({
    system: REPORT_SYSTEM,
    user: reportUser(parsed.data),
    maxTokens: 1400,
    temperature: 0.6,
    signal: request.signal,
  });
  if (!raw) return NextResponse.json(NONE);

  const reject = (why: string) => {
    if (process.env.NODE_ENV !== "production") console.warn(`[report] discarded — ${why}`);
    return NextResponse.json(NONE);
  };

  // 1 + 2. Fences stripped, parsed, shape-checked. Edge case 14.
  const json = parseJson(raw);
  if (json === null) return reject("not JSON");

  const shaped = reportAiSchema.safeParse(json);
  if (!shaped.success) return reject(shaped.error.issues.map((i) => i.path.join(".")).join(", "));

  const report: ReportAi = shaped.data;

  // 3. ★ costRupees was passed in and is required back verbatim. The model
  //    writes prose about the number; it does not get to restate it.
  const supplied = new Map(parsed.data.costliest.map((d) => [d.month, d.costRupees]));
  if (report.costliestDecisions.length !== parsed.data.costliest.length) {
    return reject("wrong number of costliest decisions");
  }
  for (const d of report.costliestDecisions) {
    if (supplied.get(d.month) !== d.costRupees) {
      return reject(`costRupees changed for month ${d.month}`);
    }
  }

  // Concept ids must come from the list supplied — an invented id would render
  // as a chip pointing at nothing.
  const validIds = new Set(parsed.data.conceptOptions.map((c) => c.id));
  if (report.nextConcepts.some((c) => !validIds.has(c.id))) return reject("invented a concept id");

  // 4. Every figure in the prose was in the payload.
  const audit = auditNumbers(
    [
      report.archetype.name,
      report.archetype.tagline,
      report.archetype.description,
      ...report.costliestDecisions.flatMap((d) => [d.what, d.lesson]),
      ...report.strengths,
      ...report.nextConcepts.map((c) => c.why),
      report.closingLine,
    ].join("\n"),
    allowedFrom(parsed.data),
  );
  if (!audit.ok) return reject(`invented ${audit.invented.join(", ")}`);

  return NextResponse.json({ report, source: "ai" } satisfies ReportResponse);
}
