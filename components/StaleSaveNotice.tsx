"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useLedgerStore, useHasHydrated } from "@/lib/store";

/**
 * Tells the player when a save from an older schema was discarded.
 *
 * Silently resetting someone's run is the kind of thing that looks like a
 * crash. Saying what happened and what to do next costs one toast.
 * (Edge case 19.)
 */
export function StaleSaveNotice() {
  const hydrated = useHasHydrated();
  const cleared = useLedgerStore((s) => s.staleSaveCleared);
  const acknowledge = useLedgerStore((s) => s.acknowledgeStaleSave);

  useEffect(() => {
    if (!hydrated || !cleared) return;
    toast("Your saved run was from an older version.", {
      description: "We cleared it so nothing breaks. Set up again — it takes twenty seconds.",
    });
    acknowledge();
  }, [hydrated, cleared, acknowledge]);

  return null;
}
