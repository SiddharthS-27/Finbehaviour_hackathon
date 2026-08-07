"use client";

import { useEffect } from "react";

/**
 * Registers the hand-rolled service worker in `public/sw.js`.
 *
 * Deliberately minimal. Game state lives in localStorage via Zustand persist,
 * so refresh and offline reopen already work with zero service-worker
 * involvement — the SW only caches the app shell so a cold offline load paints.
 *
 * Registration is skipped in development: an app-shell cache fights HMR.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // A failed registration costs nothing — the app is fully functional
        // without it. Never surface this to the player.
      });
    };

    if (document.readyState === "complete") register();
    else {
      window.addEventListener("load", register);
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
