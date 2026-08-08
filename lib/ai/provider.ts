import "server-only";

/**
 * The one file that talks to a model.
 *
 * Swapping providers means editing this and nothing else — Groq, OpenRouter and
 * Anthropic all fit the same shape. Everything upstream deals in `string | null`
 * and treats `null` as "use the authored fallback", never as an error.
 *
 * ★ With no key it **makes no network call at all** and returns null on the
 * first line. Not a failed request, not a timeout, not a caught exception — no
 * request. That is what makes the no-key path instant rather than merely
 * working, and it is the path that ships. (CLAUDE.md rule 4.)
 */

export const AI_MODEL = "gemini-2.5-flash";

/**
 * Six seconds. Past that the player has already read the fallback and moved on,
 * so a late answer is worse than none — it would replace text they have already
 * absorbed with different text.
 */
export const AI_TIMEOUT_MS = 6000;

/**
 * Overridable so the end-to-end gate can point the real code path at a local
 * fake rather than testing a stub branch that never ships. Also the seam for an
 * OpenAI-compatible proxy.
 */
const BASE_URL = process.env.GEMINI_BASE_URL ?? "https://generativelanguage.googleapis.com";

function apiKey(): string | null {
  const key = process.env.GEMINI_API_KEY?.trim();
  return key ? key : null;
}

/** True when a key is configured. Nothing else in the app may read the env. */
export function aiEnabled(): boolean {
  return apiKey() !== null;
}

export interface GenerateOptions {
  system: string;
  user: string;
  maxTokens: number;
  temperature: number;
  /** The caller's own abort — a player who advanced past this month. */
  signal?: AbortSignal;
}

/**
 * Returns the model's text, or null if it is unavailable for any reason at all.
 *
 * Every failure mode collapses to the same answer: no key, a timeout, a 429, a
 * 500, malformed JSON, an empty candidate, a network drop. The caller has one
 * branch to write and there is no error path to design.
 */
export async function generate(opts: GenerateOptions): Promise<string | null> {
  const key = apiKey();
  if (!key) return null; // ★ no key, no request

  const timeout = AbortSignal.timeout(AI_TIMEOUT_MS);
  const signal = opts.signal ? AbortSignal.any([opts.signal, timeout]) : timeout;

  try {
    const res = await fetch(
      `${BASE_URL}/v1beta/models/${AI_MODEL}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: opts.system }] },
          contents: [{ role: "user", parts: [{ text: opts.user }] }],
          generationConfig: {
            maxOutputTokens: opts.maxTokens,
            temperature: opts.temperature,
            responseMimeType: "text/plain",
          },
        }),
      },
    );

    if (!res.ok) return null;

    const json: unknown = await res.json();
    const text = firstCandidateText(json);
    return text && text.trim().length > 0 ? text.trim() : null;
  } catch {
    // Timeout, abort, DNS, TLS, malformed body — all the same answer.
    return null;
  }
}

/** Dig the text out of a Gemini response without trusting a single field. */
function firstCandidateText(json: unknown): string | null {
  if (typeof json !== "object" || json === null) return null;
  const candidates = (json as { candidates?: unknown }).candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return null;

  const parts = (candidates[0] as { content?: { parts?: unknown } })?.content?.parts;
  if (!Array.isArray(parts)) return null;

  const text = parts
    .map((p) => (typeof p === "object" && p !== null ? (p as { text?: unknown }).text : null))
    .filter((t): t is string => typeof t === "string")
    .join("");

  return text.length > 0 ? text : null;
}
