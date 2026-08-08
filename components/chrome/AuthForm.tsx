"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useLedgerStore } from "@/lib/store";
import { useGuard } from "@/lib/hooks/useGuard";
import { PASSWORD_MIN } from "@/lib/auth/account";
import { Brand } from "./AppHeader";

/**
 * Sign in and sign up, one component.
 *
 * The two screens differ by a confirm field and a verb; splitting them into two
 * files would mean maintaining the same focus handling, the same error surface
 * and the same keyboard behaviour twice.
 *
 * Errors state what happened and what to do next, and they appear next to the
 * control that caused them rather than as a toast that has already gone by the
 * time you look up.
 */

function Field({
  label,
  type,
  value,
  onChange,
  autoFocus,
  autoComplete,
  placeholder,
  hint,
  onEnter,
  testId,
}: {
  label: string;
  type: "text" | "password";
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
  autoComplete?: string;
  placeholder?: string;
  hint?: string;
  onEnter?: () => void;
  testId: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
        {label}
      </span>
      <input
        data-testid={testId}
        type={type}
        value={value}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        placeholder={placeholder}
        spellCheck={false}
        autoCapitalize="none"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onEnter?.();
        }}
        className="h-13 w-full rounded-lg border border-line bg-surface px-4 py-3 text-[16px] text-chalk placeholder:text-muted-foreground/50 focus:border-marigold focus:outline-none"
      />
      {hint ? <span className="text-[12px] text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

export function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const router = useRouter();
  const { ready } = useGuard({ redirectIfSignedIn: "/home" });

  const signIn = useLedgerStore((s) => s.signIn);
  const signUp = useLedgerStore((s) => s.signUp);
  const account = useLedgerStore((s) => s.account);
  const onboarded = useLedgerStore((s) => s.onboardingComplete);

  const isSignUp = mode === "signup";
  const [username, setUsername] = useState(isSignUp ? "" : (account?.username ?? ""));
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = () => {
    if (busy) return;
    setError(null);

    if (isSignUp && password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }

    // Stretching the hash takes a beat on a slow phone. Yielding a frame first
    // lets the button paint its disabled state instead of the tap feeling dead.
    setBusy(true);
    requestAnimationFrame(() => {
      const result = isSignUp ? signUp(username, password) : signIn(username, password);
      if (!result.ok) {
        setError(result.error);
        setBusy(false);
        return;
      }
      router.replace(isSignUp || !onboarded ? "/onboarding" : "/home");
    });
  };

  if (!ready) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-6 px-6 pt-16">
        <div className="h-8 w-40 rounded-sm bg-surface2" />
        <div className="h-13 w-full rounded-lg bg-surface" />
        <div className="h-13 w-full rounded-lg bg-surface" />
      </main>
    );
  }

  return (
    <main
      data-testid={isSignUp ? "signup" : "signin"}
      className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-6 pt-6 pb-safe"
    >
      <div className="flex items-center gap-3 pb-10">
        <button
          type="button"
          data-testid="back"
          onClick={() => router.push("/")}
          className="touch-target -ml-2 flex items-center gap-1.5 rounded-sm px-2 text-muted-foreground transition-colors hover:text-chalk"
        >
          <span aria-hidden className="text-lg leading-none">
            ←
          </span>
          <span className="text-sm">Back</span>
        </button>
        <span className="flex-1" />
        <Brand className="text-base" />
      </div>

      <div className="flex flex-col gap-2 pb-8">
        <h1 className="font-display text-4xl leading-tight font-bold text-chalk">
          {isSignUp ? "Create your account" : "Welcome back"}
        </h1>
        <p className="text-[15px] leading-snug text-muted-foreground">
          {isSignUp
            ? "Pick a username and a password. You will use them to pick your run back up."
            : "Sign in to pick up where you left off."}
        </p>
      </div>

      <div className="flex flex-col gap-5">
        <Field
          testId="username"
          label="Username"
          type="text"
          value={username}
          onChange={setUsername}
          autoFocus
          autoComplete="username"
          placeholder="siddharth"
          onEnter={submit}
        />

        <Field
          testId="password"
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete={isSignUp ? "new-password" : "current-password"}
          placeholder="••••••••"
          hint={isSignUp ? `At least ${PASSWORD_MIN} characters.` : undefined}
          onEnter={submit}
        />

        {isSignUp ? (
          <Field
            testId="confirm"
            label="Confirm password"
            type="password"
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
            placeholder="••••••••"
            onEnter={submit}
          />
        ) : null}

        {error ? (
          <p
            data-testid="auth-error"
            role="alert"
            className="rounded-sm border border-rust/50 bg-rust/10 px-3 py-2 text-[13px] leading-snug text-rust"
          >
            {error}
          </p>
        ) : null}

        <button
          type="button"
          data-testid="auth-submit"
          onClick={submit}
          disabled={busy}
          className={cn(
            "touch-target w-full rounded-lg px-6 text-base font-medium transition-colors",
            busy
              ? "cursor-wait bg-surface2 text-muted-foreground"
              : "bg-marigold text-ink hover:bg-marigold/90",
          )}
        >
          {busy ? "One moment…" : isSignUp ? "Create account" : "Sign in"}
        </button>

        <p className="text-center text-[14px] text-muted-foreground">
          {isSignUp ? (
            <>
              Already have an account?{" "}
              <Link href="/signin" className="text-marigold hover:underline">
                Sign in
              </Link>
            </>
          ) : (
            <>
              Need an account?{" "}
              <Link href="/signup" className="text-marigold hover:underline">
                Create one
              </Link>
            </>
          )}
        </p>
      </div>
    </main>
  );
}
