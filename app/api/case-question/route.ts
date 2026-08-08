import { NextResponse } from "next/server";
import { generate } from "@/lib/ai/provider";
import { acceptIfHonest, allowedFrom } from "@/lib/ai/numbers";
import { CASE_SYSTEM, caseUser } from "@/lib/ai/prompts";
import { caseQuestionRequestSchema, type CaseQuestionResponse } from "@/lib/ai/schemas";

/**
 * A reader's follow-up question about a case study.
 *
 * ★ Like `/api/coach`, this route never fails. No key, malformed body, timeout,
 * a model that invented a figure — every one of them returns 200 with
 * `text: null`, because the authored answer is already on screen and the right
 * behaviour is to leave it there. (CLAUDE.md rule 4.)
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NONE: CaseQuestionResponse = { text: null, source: "fallback" };

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(NONE);
  }

  const parsed = caseQuestionRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json(NONE);

  const raw = await generate({
    system: CASE_SYSTEM,
    user: caseUser(parsed.data),
    maxTokens: 320,
    temperature: 0.6,
    signal: request.signal,
  });

  /* ★ Rule 3, enforced. `allowedFrom` walks the whole payload — including the
     numbers sitting inside the summary and the concept bodies — so anything the
     case actually states is quotable and anything else throws the response
     away. The guard is calibrated for rupees, and these cases are quoted in
     dollars and percentages; it still catches an invented large figure, which
     is the failure that would actually mislead somebody. */
  const { text, invented } = acceptIfHonest(raw, allowedFrom(parsed.data));

  if (invented.length > 0 && process.env.NODE_ENV !== "production") {
    console.warn(`[case] discarded — invented ${invented.join(", ")}`);
  }

  return NextResponse.json(
    text ? ({ text, source: "ai" } satisfies CaseQuestionResponse) : NONE,
  );
}
