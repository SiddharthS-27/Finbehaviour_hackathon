import type { ContentPack } from "@/lib/sim/types";
import { storyFirstEarner } from "./story-first-earner";

/**
 * The pack registry.
 *
 * One engine, several decks. `historical-covid` (Phase 10) and `bites-car`
 * (Phase 11) register here and need no new game loop — see CLAUDE.md rule 5.
 */
export const PACKS: ContentPack[] = [storyFirstEarner];

export const PACKS_BY_ID: Record<string, ContentPack> = Object.fromEntries(
  PACKS.map((p) => [p.id, p]),
);

export function packById(id: string): ContentPack | undefined {
  return PACKS_BY_ID[id];
}

/** The pack a given `[mode]` route should play. */
export function packForMode(mode: string): ContentPack | undefined {
  return PACKS.find((p) => p.mode === mode);
}

export { storyFirstEarner };
