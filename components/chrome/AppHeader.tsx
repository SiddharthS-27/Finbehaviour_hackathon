"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useLedgerStore } from "@/lib/store";

/**
 * The bar at the top of every signed-in screen.
 *
 * Three jobs, in order of how often they matter: get back, know where you are,
 * reach your profile. Everything else on a screen can be surprising; this
 * cannot be.
 *
 * The back control is a real navigation, not `history.back()`. A player who
 * arrived from a redirect would otherwise be sent somewhere they never chose,
 * and mid-run that reads as the app losing their progress.
 */

export function Brand({ className }: { className?: string }) {
  return (
    <span className={cn("font-display text-lg leading-none font-bold text-chalk", className)}>
      Life<span className="text-marigold">Ledger</span>
    </span>
  );
}

export function AppHeader({
  /** Where "back" goes. Omit for a screen that is already the top of a stack. */
  backHref,
  backLabel = "Back",
  /** Shown next to the wordmark — which screen this is. */
  eyebrow,
  /** Extra controls on the right, before the profile link. */
  actions,
  showProfile = true,
}: {
  backHref?: string;
  backLabel?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  showProfile?: boolean;
}) {
  const router = useRouter();
  const profile = useLedgerStore((s) => s.profile);
  const account = useLedgerStore((s) => s.account);

  const initial = (profile.name || account?.username || "?").trim().charAt(0).toUpperCase();

  return (
    <header className="flex items-center gap-3 pb-4">
      {backHref ? (
        <button
          type="button"
          data-testid="back"
          aria-label={backLabel}
          onClick={() => router.push(backHref)}
          className="touch-target -ml-2 flex shrink-0 items-center gap-1.5 rounded-sm px-2 text-muted-foreground transition-colors hover:text-chalk"
        >
          <span aria-hidden className="text-lg leading-none">
            ←
          </span>
          <span className="text-sm">{backLabel}</span>
        </button>
      ) : (
        <Link href="/home" className="flex shrink-0 items-baseline gap-2">
          <Brand />
        </Link>
      )}

      {eyebrow ? (
        <span className="min-w-0 flex-1 truncate font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
          {eyebrow}
        </span>
      ) : (
        <span className="flex-1" />
      )}

      {actions}

      {showProfile ? (
        <Link
          href="/profile"
          aria-label="Your profile"
          className="flex size-9 shrink-0 items-center justify-center rounded-full border border-line bg-surface font-mono text-[13px] text-chalk transition-colors hover:border-marigold hover:text-marigold"
        >
          {initial}
        </Link>
      ) : null}
    </header>
  );
}
