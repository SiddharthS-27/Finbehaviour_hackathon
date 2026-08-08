"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { isSignedIn, useHasHydrated, useLedgerStore } from "@/lib/store";

/**
 * The title screen. One name, one line, one way forward.
 *
 * It exists to be the thing on screen when someone hands the phone over. No
 * statistics, no mode grid, no roadmap — the whole job is that the product has
 * a name and that name is the first thing you read.
 *
 * The single control changes with who you are: create an account, sign back in,
 * or carry on. Never more than one primary action.
 */

function Skeleton() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-6 px-6">
      <div className="h-20 w-72 rounded-sm bg-surface2" />
      <div className="h-5 w-64 rounded-sm bg-surface2" />
    </main>
  );
}

export function TitleScreen() {
  const router = useRouter();
  const hydrated = useHasHydrated();

  const account = useLedgerStore((s) => s.account);
  const sessionUser = useLedgerStore((s) => s.sessionUser);
  const onboarded = useLedgerStore((s) => s.onboardingComplete);

  if (!hydrated) return <Skeleton />;

  const signedIn = isSignedIn({ account, sessionUser });

  const primary = signedIn
    ? { label: "Continue", href: onboarded ? "/home" : "/onboarding" }
    : account
      ? { label: `Sign in as ${account.username}`, href: "/signin" }
      : { label: "Create an account", href: "/signup" };

  return (
    <main
      data-testid="title-screen"
      data-signed-in={signedIn ? "1" : "0"}
      className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-6 pb-safe"
    >
      {/* The name sits on the optical third, not dead centre — centred type in a
          tall viewport reads as a loading screen. */}
      <div className="flex flex-1 flex-col justify-center gap-5 pt-24 pb-10">
        <h1 className="font-display text-[clamp(3.5rem,18vw,5.5rem)] leading-[0.9] font-bold tracking-tight text-chalk">
          Life
          <span className="text-marigold">Ledger</span>
        </h1>

        <div className="h-px w-24 bg-marigold" />

        <p className="max-w-sm font-display text-xl leading-snug text-chalk/85 sm:text-2xl">
          Two years of your money, in twenty minutes.
        </p>
      </div>

      <div className="flex flex-col gap-3 pb-10">
        <button
          type="button"
          data-testid="title-primary"
          onClick={() => router.push(primary.href)}
          className="touch-target w-full rounded-lg bg-marigold px-6 text-base font-medium text-ink transition-colors hover:bg-marigold/90"
        >
          {primary.label}
        </button>

        {!signedIn ? (
          <Link
            href={account ? "/signup" : "/signin"}
            className="touch-target flex w-full items-center justify-center rounded-lg border border-line px-6 text-base text-chalk transition-colors hover:border-marigold hover:text-marigold"
          >
            {account ? "Use a different account" : "I already have an account"}
          </Link>
        ) : null}
      </div>
    </main>
  );
}
