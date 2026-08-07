import Link from "next/link";

/** Start / mode select. The mode cards land in Phase 3. */
export default function StartPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col justify-between gap-10 px-5 pt-16 pb-safe">
      <div className="flex flex-col gap-5">
        <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
          FinBehaviour · Problem Statement #4
        </p>

        <h1 className="font-display text-6xl leading-[0.95] font-bold text-chalk sm:text-7xl">
          Compound
        </h1>

        <p className="max-w-md font-display text-xl leading-snug text-marigold sm:text-2xl">
          Two years of your money, in twenty minutes.
        </p>

        <div className="h-px w-full bg-line" />

        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          You are 23, first job in Chennai,{" "}
          <span className="font-mono text-chalk">₹42,000</span> a month. You have
          twelve months. Every month you decide what to do with your salary, life
          throws something at you, and the consequences of month 2 arrive in month
          11.
        </p>
      </div>

      <div className="flex flex-col gap-3 pb-4">
        <Link
          href="/onboarding"
          className="touch-target inline-flex items-center justify-center rounded-lg bg-marigold px-6 text-base font-medium text-ink transition-colors hover:bg-marigold/90"
        >
          Start
        </Link>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <Link href="/explainer" className="hover:text-chalk">
            Explainer
          </Link>
          <Link href="/swatch" className="hover:text-chalk">
            Design tokens
          </Link>
        </div>
      </div>
    </main>
  );
}
