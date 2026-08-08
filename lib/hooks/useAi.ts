"use client";

import { useEffect, useRef, useState } from "react";
import { coachResponseSchema, reportResponseSchema } from "@/lib/ai/schemas";
import type { CoachRequest, ReportAi, ReportRequest } from "@/lib/ai/schemas";

/**
 * Fetching the optional half of the app.
 *
 * Two rules govern everything here:
 *
 *   **Nothing is ever an error.** A failure returns null and the caller keeps
 *   the authored fallback it already had on screen. There is no error state to
 *   design and no toast to suppress. (CLAUDE.md rule 4.)
 *
 *   **★ Stale answers are dropped, not rendered.** A player who advances
 *   through five months in ten seconds must never see month 2's coach line
 *   under month 5's result. Each request aborts the last, and any response that
 *   comes back against a key that is no longer current is discarded even if it
 *   arrives intact. (Edge case 15.)
 */

interface AiState<T> {
  data: T | null;
  pending: boolean;
}

/**
 * One in-flight request at a time, keyed. When `key` changes the previous
 * request is aborted and its result becomes unusable.
 */
function useKeyedFetch<TBody, TData>(
  url: string,
  key: string | null,
  body: TBody | null,
  parse: (json: unknown) => TData | null,
): AiState<TData> {
  const [state, setState] = useState<AiState<TData>>({ data: null, pending: false });
  // The key this hook is currently willing to accept an answer for.
  const live = useRef<string | null>(null);
  // Serialised body, so an unstable object identity does not refire the effect.
  const payload = body === null ? null : JSON.stringify(body);

  useEffect(() => {
    live.current = key;
    if (key === null || payload === null) {
      setState({ data: null, pending: false });
      return;
    }

    const controller = new AbortController();
    setState({ data: null, pending: true });

    fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: payload,
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        // ★ The stale check. Aborting is not enough on its own — a response can
        // already be in flight through the parse when the key moves on.
        if (live.current !== key) return;
        setState({ data: json === null ? null : parse(json), pending: false });
      })
      .catch(() => {
        if (live.current !== key) return;
        // Offline, aborted, 500, garbage — all the same, and all silent.
        setState({ data: null, pending: false });
      });

    return () => controller.abort();
  }, [url, key, payload, parse]);

  return state;
}

/** Parsers live outside the hook so their identity is stable across renders. */
const parseCoach = (json: unknown): string | null => {
  const parsed = coachResponseSchema.safeParse(json);
  return parsed.success ? parsed.data.text : null;
};

const parseReport = (json: unknown): ReportAi | null => {
  const parsed = reportResponseSchema.safeParse(json);
  return parsed.success ? parsed.data.report : null;
};

/**
 * The coach line for one resolved month.
 *
 * `key` is the identity of the thing being commented on. It must change when
 * the month does, or a stale line will look current.
 */
export function useCoachLine(key: string | null, request: CoachRequest | null) {
  const { data, pending } = useKeyedFetch("/api/coach", key, request, parseCoach);
  return { text: data, pending };
}

export function useAiReport(key: string | null, request: ReportRequest | null) {
  const { data, pending } = useKeyedFetch("/api/report", key, request, parseReport);
  return { report: data, pending };
}
