import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useEffect, useState } from "react";
import type { LiteracyLevel, Profile } from "@/lib/sim/types";
import { scoreDiagnostic, type DiagnosticResult } from "@/content/diagnostic";

/**
 * The only stateful thing in the project.
 *
 * Everything else — the engine, the packs, the metrics — is pure and derives
 * from what lives here. There is no database and there will not be one.
 *
 * Bump SCHEMA_VERSION whenever the persisted shape changes. On mismatch the
 * save is cleared and the player is told, rather than being handed a state the
 * current engine cannot read. (Edge case 19.)
 */
export const SCHEMA_VERSION = 1;
export const STORAGE_KEY = "compound";

export const DEFAULT_PROFILE: Profile = {
  name: "",
  lifeStage: "first_earner",
  incomeTier: "mid",
  literacyLevel: 1,
  location: "Chennai",
  dependents: 0,
  supportsParents: false,
};

interface CompoundState {
  profile: Profile;
  diagnosticAnswers: Record<string, string>;
  onboardingComplete: boolean;

  /** Transient — never persisted. Set when a stale save was discarded. */
  staleSaveCleared: boolean;

  updateProfile: (patch: Partial<Profile>) => void;
  answerDiagnostic: (questionId: string, optionId: string) => void;
  /** Scores the diagnostic, writes literacyLevel, and marks onboarding done. */
  completeOnboarding: () => DiagnosticResult;
  diagnosticResult: () => DiagnosticResult;
  resetAll: () => void;
  acknowledgeStaleSave: () => void;
}

const INITIAL = {
  profile: DEFAULT_PROFILE,
  diagnosticAnswers: {} as Record<string, string>,
  onboardingComplete: false,
  staleSaveCleared: false,
};

/**
 * localStorage is not there during SSR. Returning a no-op store rather than
 * throwing lets the module import cleanly on the server; the real values
 * arrive at hydration, which `useHasHydrated` gates on.
 */
const safeStorage = createJSONStorage(() => {
  if (typeof window === "undefined") {
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
  }
  return window.localStorage;
});

export const useCompoundStore = create<CompoundState>()(
  persist(
    (set, get) => ({
      ...INITIAL,

      updateProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),

      answerDiagnostic: (questionId, optionId) =>
        set((s) => ({ diagnosticAnswers: { ...s.diagnosticAnswers, [questionId]: optionId } })),

      diagnosticResult: () => scoreDiagnostic(get().diagnosticAnswers),

      completeOnboarding: () => {
        const result = scoreDiagnostic(get().diagnosticAnswers);
        set((s) => ({
          profile: { ...s.profile, literacyLevel: result.literacyLevel as LiteracyLevel },
          onboardingComplete: true,
        }));
        return result;
      },

      resetAll: () => set({ ...INITIAL }),

      acknowledgeStaleSave: () => set({ staleSaveCleared: false }),
    }),
    {
      name: STORAGE_KEY,
      version: SCHEMA_VERSION,
      storage: safeStorage,

      // staleSaveCleared is a signal about this session, not part of the save.
      partialize: (s) => ({
        profile: s.profile,
        diagnosticAnswers: s.diagnosticAnswers,
        onboardingComplete: s.onboardingComplete,
      }),

      migrate: (persisted, version) => {
        if (version !== SCHEMA_VERSION) {
          // No migration path is worth writing during a hackathon. Clear it,
          // say so, and let them start again.
          return { ...INITIAL, staleSaveCleared: true };
        }
        return persisted as Partial<CompoundState>;
      },
    },
  ),
);

/**
 * ★ Zustand `persist` + SSR needs this guard, or the first paint renders the
 * default state and then swaps — React logs a hydration mismatch and the UI
 * flickers. Render a skeleton until it returns true. (Edge case 18.)
 */
export function useHasHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Hydration may already have finished before this effect runs.
    if (useCompoundStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    return useCompoundStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  return hydrated;
}

/** Selector helpers — keep components from subscribing to the whole store. */
export const selectProfile = (s: CompoundState) => s.profile;
export const selectOnboardingComplete = (s: CompoundState) => s.onboardingComplete;
