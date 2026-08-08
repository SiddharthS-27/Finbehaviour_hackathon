"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { isRunComplete, useLedgerStore } from "@/lib/store";
import { useGuard } from "@/lib/hooks/useGuard";
import { INCOME_BANDS, lifeStageLabel, previewIncome } from "@/lib/profile";
import { storyFirstEarner } from "@/content/packs";
import { BADGES } from "@/lib/sim/gamify";
import { formatRupees } from "@/lib/format";
import { AppHeader } from "./AppHeader";
import type { IncomeTier } from "@/lib/sim/types";

/**
 * Profile. Who you are, what you have played, and the way out.
 *
 * Edits land immediately — there is no save button, because there is nothing to
 * save to. The one thing that does need confirming is destroying a run, so that
 * asks twice.
 *
 * Changing the income band while a run is live does **not** rescale it: the run
 * carries the tier it started with, so its numbers stay internally consistent
 * and the shadow agent still played the same world.
 */

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line py-2.5 last:border-b-0">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className="text-right text-[14px] text-chalk">{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
        {title}
      </h2>
      <div className="rounded-lg border border-line bg-surface px-4 py-1">{children}</div>
    </section>
  );
}

function Skeleton() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-4 px-5 pt-6">
      <div className="h-9 w-full rounded-sm bg-surface2" />
      <div className="h-24 w-full rounded-lg bg-surface" />
      <div className="h-40 w-full rounded-lg bg-surface" />
    </main>
  );
}

export function ProfileScreen() {
  const router = useRouter();
  const { ready } = useGuard({ requireAuth: true });

  const account = useLedgerStore((s) => s.account);
  const profile = useLedgerStore((s) => s.profile);
  const run = useLedgerStore((s) => s.run);
  const updateProfile = useLedgerStore((s) => s.updateProfile);
  const abandonRun = useLedgerStore((s) => s.abandonRun);
  const signOut = useLedgerStore((s) => s.signOut);
  const diagnosticResult = useLedgerStore((s) => s.diagnosticResult);

  const [confirmDiscard, setConfirmDiscard] = useState(false);

  if (!ready || !account) return <Skeleton />;

  const diagnostic = diagnosticResult();
  const income = previewIncome(storyFirstEarner, profile.incomeTier);
  const earned = run ? run.state.badges : [];
  const live = run && !isRunComplete(run);

  return (
    <main
      data-testid="profile"
      className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-5 pt-5 pb-safe"
    >
      <AppHeader backHref="/home" eyebrow="Profile" showProfile={false} />

      {/* identity */}
      <div className="flex items-center gap-4 pb-7">
        <span className="flex size-16 shrink-0 items-center justify-center rounded-full border border-marigold/50 bg-marigold/12 font-display text-2xl font-bold text-marigold">
          {(profile.name || account.username).trim().charAt(0).toUpperCase()}
        </span>
        <div className="flex min-w-0 flex-col">
          <h1 className="truncate font-display text-3xl leading-tight font-bold text-chalk">
            {profile.name || account.username}
          </h1>
          <p className="truncate font-mono text-[13px] text-muted-foreground">
            @{account.username}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <Section title="You">
          <label className="flex items-center justify-between gap-4 border-b border-line py-2">
            <span className="shrink-0 text-[13px] text-muted-foreground">Display name</span>
            <input
              data-testid="profile-name"
              value={profile.name}
              maxLength={24}
              onChange={(e) => updateProfile({ name: e.target.value })}
              className="min-w-0 flex-1 rounded-sm border border-transparent bg-transparent px-2 py-1.5 text-right text-[14px] text-chalk focus:border-marigold focus:outline-none"
            />
          </label>

          <label className="flex items-center justify-between gap-4 border-b border-line py-2">
            <span className="shrink-0 text-[13px] text-muted-foreground">Where you live</span>
            <input
              data-testid="profile-location"
              value={profile.location}
              maxLength={32}
              onChange={(e) => updateProfile({ location: e.target.value })}
              className="min-w-0 flex-1 rounded-sm border border-transparent bg-transparent px-2 py-1.5 text-right text-[14px] text-chalk focus:border-marigold focus:outline-none"
            />
          </label>

          <Row label="Life stage" value={lifeStageLabel(profile.lifeStage)} />
          <Row
            label="People depending on you"
            value={
              profile.dependents === 0
                ? "None"
                : `${profile.dependents}${profile.dependents >= 3 ? "+" : ""}`
            }
          />
          <Row label="Sends money home" value={profile.supportsParents ? "Yes" : "No"} />
        </Section>

        <Section title="Income band">
          <div className="flex flex-col gap-2 py-3">
            {INCOME_BANDS.map((band) => (
              <button
                key={band.id}
                type="button"
                data-income-band={band.id}
                aria-pressed={profile.incomeTier === band.id}
                onClick={() => updateProfile({ incomeTier: band.id as IncomeTier })}
                className={cn(
                  "flex min-h-[52px] w-full items-center justify-between gap-3 rounded-sm border px-3 text-left transition-colors",
                  profile.incomeTier === band.id
                    ? "border-marigold bg-marigold/10 text-chalk"
                    : "border-line bg-surface2 text-chalk hover:border-marigold/50",
                )}
              >
                <span className="flex flex-col">
                  <span className="text-[14px] leading-tight">{band.label}</span>
                  <span className="text-[12px] leading-tight text-muted-foreground">
                    {band.blurb}
                  </span>
                </span>
              </button>
            ))}
            <p className="text-[12px] leading-snug text-muted-foreground">
              Your next run starts at{" "}
              <span className="font-mono text-chalk">{formatRupees(income)}</span> a month, and every
              amount in the story scales with it.
              {live ? " A run already in progress keeps the band it started on." : ""}
            </p>
          </div>
        </Section>

        <Section title="Progress">
          <Row
            label="Quick check"
            value={
              <>
                <span className="font-mono">{diagnostic.correct}</span> of 3 · explanations pitched
                at level <span className="font-mono">{profile.literacyLevel}</span>
              </>
            }
          />
          <Row
            label="Current run"
            value={
              run
                ? isRunComplete(run)
                  ? `Finished — ${run.state.totalMonths} months`
                  : `Month ${Math.min(run.state.month, run.state.totalMonths)} of ${run.state.totalMonths}`
                : "Not started"
            }
          />
          <Row
            label="Badges"
            value={
              <span className="font-mono">
                {earned.length} of {BADGES.length}
              </span>
            }
          />
          {run ? <Row label="XP" value={<span className="font-mono">{run.state.xp}</span>} /> : null}
        </Section>

        {run ? (
          <Section title="Saved run">
            <div className="flex flex-col gap-2 py-3">
              <p className="text-[13px] leading-snug text-muted-foreground">
                {live
                  ? "Your run is saved on this device. Leaving the game at any point keeps it exactly where it was."
                  : "Your finished run is saved on this device, along with its report."}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => router.push(live ? `/play/${run.mode}` : `/report/${run.mode}`)}
                  className="touch-target rounded-lg border border-line px-4 text-[14px] text-chalk transition-colors hover:border-marigold hover:text-marigold"
                >
                  {live ? "Back to the run" : "Read the report"}
                </button>
                <button
                  type="button"
                  data-testid="discard-run"
                  onClick={() => {
                    if (!confirmDiscard) {
                      setConfirmDiscard(true);
                      return;
                    }
                    abandonRun();
                    setConfirmDiscard(false);
                    toast("Run discarded.", { description: "Start a fresh one whenever you like." });
                  }}
                  className={cn(
                    "touch-target rounded-lg border px-4 text-[14px] transition-colors",
                    confirmDiscard
                      ? "border-rust bg-rust/15 text-rust"
                      : "border-line text-muted-foreground hover:border-rust hover:text-rust",
                  )}
                >
                  {confirmDiscard ? "Tap again to discard" : "Discard run"}
                </button>
              </div>
            </div>
          </Section>
        ) : null}

        <button
          type="button"
          data-testid="sign-out"
          onClick={() => {
            signOut();
            router.replace("/");
          }}
          className="touch-target mt-2 w-full rounded-lg border border-line px-6 text-[15px] text-muted-foreground transition-colors hover:border-rust hover:text-rust"
        >
          Sign out
        </button>
      </div>

      <div className="py-10" />
    </main>
  );
}
