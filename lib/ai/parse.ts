/**
 * Reading a model's reply defensively.
 *
 * Split out of `provider.ts` because that file is `server-only` and this is
 * pure string handling — it belongs where it can be imported and tested
 * anywhere, including by the client if it ever needs to.
 */

/**
 * Strip markdown fences before parsing.
 *
 * Models wrap JSON in ```json blocks despite being told not to, roughly one
 * time in twenty. Defensive rather than optimistic — see edge case 14.
 */
export function stripFences(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return (fenced ? fenced[1] : trimmed).trim();
}

/** `stripFences` + `JSON.parse`, returning null instead of throwing. */
export function parseJson(raw: string): unknown {
  try {
    return JSON.parse(stripFences(raw));
  } catch {
    return null;
  }
}
