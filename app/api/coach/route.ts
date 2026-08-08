import { NextResponse } from "next/server";
import { generate } from "@/lib/ai/provider";
import { acceptIfHonest, allowedFrom } from "@/lib/ai/numbers";
import { COACH_SYSTEM, coachUser } from "@/lib/ai/prompts";
import { coachRequestSchema, type CoachResponse } from "@/lib/ai/schemas";

/**
 * The coach line for a month that has just resolved.
 *
 * ★ This route never fails. Every path — no key, bad request, timeout, a model
 * that invented a figure — returns 200 with `text: null`, because the caller
 * already has an authored fallback on screen and the correct behaviour is to
 * leave it there. An error status would invite an error toast, and a missing
 * coach line is not an error. (CLAUDE.md rule 4.)
 */

export const runtime = "nodejs";
/** Nothing here is cacheable; every request is a different month of a run. */
export const dynamic = "force-dynamic";

const NONE: CoachResponse = { text: null, source: "fallback" };

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(NONE);
  }

  const parsed = coachRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json(NONE);

  const raw = await generate({
    system: COACH_SYSTEM,
    user: coachUser(parsed.data),
    maxTokens: 200,
    temperature: 0.7,
    signal: request.signal,
  });

  // ★ Rule 3, enforced. Any rupee figure that was not in the payload throws the
  // whole response away — a wrong number is worse than no generated text.
  const { text, invented } = acceptIfHonest(raw, allowedFrom(parsed.data));

  if (invented.length > 0 && process.env.NODE_ENV !== "production") {
    console.warn(`[coach] discarded — invented ${invented.join(", ")}`);
  }

  return NextResponse.json(
    text ? ({ text, source: "ai" } satisfies CoachResponse) : NONE,
  );
}
