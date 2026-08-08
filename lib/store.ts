import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useEffect, useState } from "react";
import type {
  Allocation,
  ContentPack,
  IncomeTier,
  LiteracyLevel,
  MonthRecord,
  Profile,
  SimState,
} from "@/lib/sim/types";
import { scoreDiagnostic, type DiagnosticResult } from "@/content/diagnostic";
import { advanceMonth, createInitialState } from "@/lib/sim/engine";
import { eventForMonth, marketForRun } from "@/lib/sim/deck";
import { scalePack } from "@/lib/profile";
import { packForMode, packById } from "@/content/packs";

/**
 * The only stateful thing in the project.
 *
 * Everything else — the engine, the packs, the metrics — is pure and derives
 * from what lives here. There is no database and there will not be one.
 *
 * Bump SCHEMA_VERSION whenever the persisted shape changes. On mismatch the
 * save is cleared and the player is told, rather than being handed a state the
 * current engine cannot read. (Edge case 19.)
 *
 * v2 — added the run slice.
 */
export const SCHEMA_VERSION = 2;
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

export const EMPTY_ALLOCATION: Allocation = {
  discretionarySpend: 0,
  toEmergencyFund: 0,
  toInvest: 0,
  extraDebtPayment: 0,
  extraDebtTargetId: null,
};

/** Where we are inside the current month. */
export type MonthPhase = "allocate" | "event" | "resolved";

/**
 * What a run persists.
 *
 * Deliberately *not* stored: the scaled pack and the market path. Both are
 * recomputed from `packId` + `incomeTier` + `seed` on rehydrate, so a stale
 * save can never disagree with the current engine. Same reasoning the plan
 * gives for never persisting the optimal run.
 */
export interface RunState {
  mode: string;
  packId: string;
  seed: number;
  incomeTier: IncomeTier;
  state: SimState;
  phase: MonthPhase;
  allocation: Allocation;
  choiceId: string | null;
}

interface CompoundState {
  profile: Profile;
  diagnosticAnswers: Record<string, string>;
  onboardingComplete: boolean;
  run: RunState | null;

  /** Transient — never persisted. */
  staleSaveCleared: boolean;
  isResolving: boolean;

  updateProfile: (patch: Partial<Profile>) => void;
  answerDiagnostic: (questionId: string, optionId: string) => void;
  completeOnboarding: () => DiagnosticResult;
  diagnosticResult: () => DiagnosticResult;
  resetAll: () => void;
  acknowledgeStaleSave: () => void;

  startRun: (mode: string, seed?: number) => void;
  setAllocation: (patch: Partial<Allocation>) => void;
  setChoice: (choiceId: string | null) => void;
  goToEventPhase: () => void;
  resolveMonth: () => void;
  nextMonth: () => void;
  abandonRun: () => void;
  /** Development only — the Phase 6 gate needs to force critical states. */
  devForce: (patch: Partial<SimState>) => void;
}

const INITIAL = {
  profile: DEFAULT_PROFILE,
  diagnosticAnswers: {} as Record<string, string>,
  onboardingComplete: false,
  run: null as RunState | null,
  staleSaveCleared: false,
  isResolving: false,
};

const safeStorage = createJSONStorage(() => {
  if (typeof window === "undefined") {
    return { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  }
  return window.localStorage;
});

/**
 * A run's deck, rebuilt from what was persisted.
 *
 * Pure and cheap enough to call on every render that needs it — scaling walks
 * the deck once, and there are twelve events.
 */
export function packForRun(run: RunState): ContentPack {
  const base = packById(run.packId);
  if (!base) throw new Error(`unknown pack: ${run.packId}`);
  return scalePack(base, run.incomeTier);
}

export function marketFor(run: RunState): number[] {
  return marketForRun(packForRun(run), run.seed);
}

export const useCompoundStore = create<CompoundState>()(
  persist(
    (set, get) => ({
      ...INITIAL,

      /* ───────────────────────── profile ───────────────────────── */

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

      /* ─────────────────────────── run ─────────────────────────── */

      startRun: (mode, seed) => {
        const base = packForMode(mode);
        if (!base) return;

        const tier = get().profile.incomeTier;
        const pack = scalePack(base, tier);
        // Seeded from the clock only at the moment a run begins — never inside
        // the engine, which stays pure. A fixed seed can be passed for demos.
        const runSeed = seed ?? Math.floor(Date.now() % 2147483647);

        set({
          run: {
            mode,
            packId: base.id,
            seed: runSeed,
            incomeTier: tier,
            state: createInitialState(pack, runSeed),
            phase: "allocate",
            allocation: { ...EMPTY_ALLOCATION },
            choiceId: null,
          },
          isResolving: false,
        });
      },

      setAllocation: (patch) =>
        set((s) =>
          s.run ? { run: { ...s.run, allocation: { ...s.run.allocation, ...patch } } } : {},
        ),

      setChoice: (choiceId) => set((s) => (s.run ? { run: { ...s.run, choiceId } } : {})),

      goToEventPhase: () => set((s) => (s.run ? { run: { ...s.run, phase: "event" } } : {})),

      /**
       * Run the engine for this month.
       *
       * Guarded on `isResolving` as well as phase, so a double-tap on Advance
       * cannot run the month twice. The UI disables the button too — this is
       * the belt to that pair of braces. (Edge case 16.)
       */
      resolveMonth: () => {
        const { run, isResolving } = get();
        if (!run || isResolving) return;
        if (run.phase === "resolved") return;
        if (run.state.month > run.state.totalMonths) return;

        set({ isResolving: true });
        try {
          const pack = packForRun(run);
          const market = marketFor(run);
          const event = eventForMonth(pack, run.state.month, run.state);

          const { state } = advanceMonth(
            run.state,
            run.allocation,
            event,
            event ? run.choiceId : null,
            market[run.state.month - 1] ?? 0,
          );

          set({ run: { ...run, state, phase: "resolved" } });
        } finally {
          set({ isResolving: false });
        }
      },

      nextMonth: () =>
        set((s) =>
          s.run
            ? {
                run: {
                  ...s.run,
                  phase: "allocate",
                  allocation: { ...EMPTY_ALLOCATION },
                  choiceId: null,
                },
              }
            : {},
        ),

      abandonRun: () => set({ run: null, isResolving: false }),

      /**
       * Forces engine state directly. Guarded so it cannot fire in production
       * even if a caller slips through — the run would stop being reproducible
       * from its seed, which is the one property everything else rests on.
       */
      devForce: (patch) => {
        if (process.env.NODE_ENV === "production") return;
        set((s) => (s.run ? { run: { ...s.run, state: { ...s.run.state, ...patch } } } : {}));
      },
    }),
    {
      name: STORAGE_KEY,
      version: SCHEMA_VERSION,
      storage: safeStorage,

      partialize: (s) => ({
        profile: s.profile,
        diagnosticAnswers: s.diagnosticAnswers,
        onboardingComplete: s.onboardingComplete,
        run: s.run,
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
    if (useCompoundStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    return useCompoundStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  return hydrated;
}

/* ───────────────────────────── selectors ───────────────────────────── */

export const selectProfile = (s: CompoundState) => s.profile;
export const selectOnboardingComplete = (s: CompoundState) => s.onboardingComplete;
export const selectRun = (s: CompoundState) => s.run;

/** The run is over once the engine has stepped past the final month. */
export function isRunComplete(run: RunState | null): boolean {
  return Boolean(run && run.state.month > run.state.totalMonths);
}

export function lastRecord(run: RunState | null): MonthRecord | null {
  if (!run) return null;
  return run.state.history[run.state.history.length - 1] ?? null;
}
