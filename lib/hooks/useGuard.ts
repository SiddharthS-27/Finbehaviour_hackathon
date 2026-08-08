"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isSignedIn, useHasHydrated, useLedgerStore } from "@/lib/store";

/**
 * Route guards, in one place.
 *
 * Every guard waits for hydration first. Zustand `persist` fills in after the
 * first paint, so a guard that fires early would bounce a signed-in player back
 * to the title screen on every refresh. (Edge case 18.)
 */

export interface GuardState {
  ready: boolean;
  signedIn: boolean;
  onboarded: boolean;
}

export function useGuard(options: {
  /** Send anyone without a live session to the title screen. */
  requireAuth?: boolean;
  /** Send anyone who has not finished onboarding to finish it. */
  requireOnboarded?: boolean;
  /** Send anyone already signed in away — for the sign-in and sign-up screens. */
  redirectIfSignedIn?: string;
} = {}): GuardState {
  const router = useRouter();
  const hydrated = useHasHydrated();

  const account = useLedgerStore((s) => s.account);
  const sessionUser = useLedgerStore((s) => s.sessionUser);
  const onboarded = useLedgerStore((s) => s.onboardingComplete);

  const signedIn = isSignedIn({ account, sessionUser });
  const { requireAuth, requireOnboarded, redirectIfSignedIn } = options;

  useEffect(() => {
    if (!hydrated) return;
    if (redirectIfSignedIn && signedIn) {
      // ★ Never bounce someone past setup. Signing up sets the session, which
      // makes this guard fire on the auth screen — and sending a brand-new
      // account to the home screen would skip onboarding entirely, leaving the
      // run to start against a default profile they never chose.
      router.replace(onboarded ? redirectIfSignedIn : "/onboarding");
      return;
    }
    if (requireAuth && !signedIn) {
      router.replace("/");
      return;
    }
    if (requireOnboarded && signedIn && !onboarded) {
      router.replace("/onboarding");
    }
  }, [hydrated, signedIn, onboarded, requireAuth, requireOnboarded, redirectIfSignedIn, router]);

  /* `ready` is false while a redirect is pending, so callers render a skeleton
     rather than flashing a screen the player is about to be moved off. */
  const blocked =
    (requireAuth && !signedIn) ||
    (requireOnboarded && !onboarded) ||
    Boolean(redirectIfSignedIn && signedIn);

  return { ready: hydrated && !blocked, signedIn, onboarded };
}
