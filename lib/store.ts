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
import {
  createAccount,
  normaliseUsername,
  validatePassword,
  validateUsername,
  verifyPassword,
  type Account,
} from "@/lib/auth/account";
import { advanceMonth, createInitialState } from "@/lib/sim/engine";
import { eventForMonth, marketForRun } from "@/lib/sim/deck";
import { runOptimal, type OptimalRun } from "@/lib/sim/agent";
import { scalePack } from "@/lib/profile";
import { packForMode, packById } from "@/content/packs";
import { BITE_XP_REWARD, DAILY_BITE_COUNT, nextStreak } from "@/lib/bites";

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
 * v3 — added the account slice, and renamed the storage key with the product.
 *
 * The Quick Bites slice was added at v3 *without* a bump, deliberately. It is
 * purely additive: zustand's merge is shallow, so a v3 save written before it
 * existed simply has no `bites` key and falls back to the default. Bumping
 * would have wiped every account on the device to add a streak counter.
 */
export const SCHEMA_VERSION = 3;
export const STORAGE_KEY = "lifeledger";

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

export type AuthResult = { ok: true } | { ok: false; error: string };

/**
 * Quick Bites — the daily learning habit, persisted.
 *
 * `cursor` is the only piece that has to survive: it is how far through the
 * ordered deck this person has read, and it is what makes tomorrow's five
 * different from today's. Everything else is the streak, which is a promise
 * the app made and therefore has to keep across a reload.
 *
 * Deliberately *not* folded into `run.state.xp`. Bite XP is knowledge, not a
 * simulated decision, and mixing it into engine state would mean a player's
 * net worth stopped being derivable from their choices. It is banked here and
 * shown as its own number.
 */
export interface BitesSlice {
  /** How many cards have been consumed in total. Drives the daily deck. */
  cursor: number;
  /** The day `seen` refers to. A new day resets progress to zero. */
  day: string | null;
  /** How many of today's five have been swiped through. */
  seen: number;
  streak: number;
  lastCompletedDay: string | null;
  /** Total XP banked from bites, across every day. */
  xp: number;
}

export const EMPTY_BITES: BitesSlice = {
  cursor: 0,
  day: null,
  seen: 0,
  streak: 0,
  lastCompletedDay: null,
  xp: 0,
};

interface LedgerState {
  /**
   * One account per device.
   *
   * There is no server, so a user directory would be a fiction. What this is
   * instead: a real credential check against a salted, stretched hash, which is
   * what makes "sign in" mean something rather than being a doorway.
   */
  account: Account | null;
  /** Lowercased username of whoever is signed in. Persisted, so a refresh holds. */
  sessionUser: string | null;

  profile: Profile;
  diagnosticAnswers: Record<string, string>;
  onboardingComplete: boolean;
  run: RunState | null;
  bites: BitesSlice;

  /** Transient — never persisted. */
  staleSaveCleared: boolean;
  isResolving: boolean;

  signUp: (username: string, password: string) => AuthResult;
  signIn: (username: string, password: string) => AuthResult;
  signOut: () => void;

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

  /** Records how far into today's five they have got. Never goes backwards. */
  recordBiteProgress: (day: string, seen: number) => void;
  /**
   * Bank the day. Returns true only when XP was newly awarded, so the
   * completion screen can say "+50" once and "already banked" on a review.
   */
  completeDailyBites: (day: string) => boolean;
}

const INITIAL = {
  account: null as Account | null,
  sessionUser: null as string | null,
  profile: DEFAULT_PROFILE,
  diagnosticAnswers: {} as Record<string, string>,
  onboardingComplete: false,
  run: null as RunState | null,
  bites: EMPTY_BITES,
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

/**
 * ★ The shadow agent's run — recomputed, never persisted.
 *
 * A stale save that disagreed with the current engine would quietly poison
 * every number in the report, so this is derived from `packId` + `incomeTier` +
 * `seed` exactly like the deck and the market are. (Edge case 17.)
 *
 * Memoised on those three keys because the play screen asks for it on every
 * render and twelve engine steps, while cheap, are not free. The cache is a
 * plain module-level Map: it lives as long as the tab does, which is precisely
 * the lifetime of the thing it describes.
 */
const optimalCache = new Map<string, OptimalRun>();
const OPTIMAL_CACHE_LIMIT = 8;

export function optimalForRun(run: RunState): OptimalRun {
  const key = `${run.packId}:${run.incomeTier}:${run.seed}`;
  const hit = optimalCache.get(key);
  if (hit) return hit;

  const pack = packForRun(run);
  const label = `optimal-run ${key}`;
  const timed = process.env.NODE_ENV !== "production";

  // Phase 7's gate asks for this on the console. It is also the honest place
  // to notice if the benchmark ever stops being cheap enough to run on mount.
  if (timed) console.time(label);
  const result = runOptimal(pack, run.seed, marketForRun(pack, run.seed));
  if (timed) console.timeEnd(label);

  if (optimalCache.size >= OPTIMAL_CACHE_LIMIT) {
    optimalCache.delete(optimalCache.keys().next().value as string);
  }
  optimalCache.set(key, result);
  return result;
}

export const useLedgerStore = create<LedgerState>()(
  persist(
    (set, get) => ({
      ...INITIAL,

      /* ───────────────────────── account ───────────────────────── */

      /**
       * Creating an account replaces any previous one, along with its profile
       * and its run. Handing a new person the last person's twelve months would
       * be worse than losing them.
       */
      signUp: (username, password) => {
        const name = validateUsername(username);
        if (!name.ok) return name;
        const secret = validatePassword(password);
        if (!secret.ok) return secret;

        const account = createAccount(username, password, Date.now());
        set({
          ...INITIAL,
          account,
          sessionUser: account.key,
          profile: { ...DEFAULT_PROFILE, name: account.username },
        });
        return { ok: true };
      },

      /**
       * One deliberately vague error for both a wrong username and a wrong
       * password: naming which half was wrong tells anyone holding the phone
       * whether an account exists.
       */
      signIn: (username, password) => {
        const account = get().account;
        const wrong: AuthResult = { ok: false, error: "That username and password do not match." };
        if (!account) return { ok: false, error: "No account on this device yet. Create one." };
        if (account.key !== normaliseUsername(username)) return wrong;
        if (!verifyPassword(account, password)) return wrong;

        set({ sessionUser: account.key });
        return { ok: true };
      },

      /** Signs out without touching the account, the profile or the run. */
      signOut: () => set({ sessionUser: null, isResolving: false }),

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

      /* ────────────────────────── quick bites ───────────────────────── */

      recordBiteProgress: (day, seen) =>
        set((s) => {
          // A new day wipes yesterday's progress. Within a day the count only
          // ever climbs, so swiping back to card 2 does not undo the bar.
          const sameDay = s.bites.day === day;
          const next = Math.min(
            DAILY_BITE_COUNT,
            Math.max(0, sameDay ? Math.max(s.bites.seen, seen) : seen),
          );
          if (sameDay && next === s.bites.seen) return {};
          return { bites: { ...s.bites, day, seen: next } };
        }),

      /**
       * ★ Idempotent, on purpose.
       *
       * "Review today's cards" runs the deck a second time and reaches this
       * again. Awarding the XP twice — or bumping the streak twice — would make
       * the flame a number the app cannot defend.
       */
      completeDailyBites: (day) => {
        const { bites } = get();
        const alreadyBanked = bites.lastCompletedDay === day;

        set({
          bites: {
            ...bites,
            day,
            seen: DAILY_BITE_COUNT,
            streak: nextStreak(bites, day),
            lastCompletedDay: day,
            // The cursor only advances the first time. Reviewing today's five
            // must not skip tomorrow's.
            cursor: alreadyBanked ? bites.cursor : bites.cursor + DAILY_BITE_COUNT,
            xp: alreadyBanked ? bites.xp : bites.xp + BITE_XP_REWARD,
          },
        });

        return !alreadyBanked;
      },
    }),
    {
      name: STORAGE_KEY,
      version: SCHEMA_VERSION,
      storage: safeStorage,

      partialize: (s) => ({
        account: s.account,
        sessionUser: s.sessionUser,
        profile: s.profile,
        diagnosticAnswers: s.diagnosticAnswers,
        onboardingComplete: s.onboardingComplete,
        run: s.run,
        bites: s.bites,
      }),

      migrate: (persisted, version) => {
        if (version !== SCHEMA_VERSION) {
          // No migration path is worth writing during a hackathon. Clear it,
          // say so, and let them start again.
          return { ...INITIAL, staleSaveCleared: true };
        }
        return persisted as Partial<LedgerState>;
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
    if (useLedgerStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    return useLedgerStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  return hydrated;
}

/* ───────────────────────────── selectors ───────────────────────────── */

export const selectProfile = (s: LedgerState) => s.profile;
export const selectAccount = (s: LedgerState) => s.account;
export const selectOnboardingComplete = (s: LedgerState) => s.onboardingComplete;
export const selectRun = (s: LedgerState) => s.run;

/** True only when an account exists and its session is live. */
export function isSignedIn(s: Pick<LedgerState, "account" | "sessionUser">): boolean {
  return Boolean(s.account && s.sessionUser === s.account.key);
}

/** The run is over once the engine has stepped past the final month. */
export function isRunComplete(run: RunState | null): boolean {
  return Boolean(run && run.state.month > run.state.totalMonths);
}

export function lastRecord(run: RunState | null): MonthRecord | null {
  if (!run) return null;
  return run.state.history[run.state.history.length - 1] ?? null;
}
