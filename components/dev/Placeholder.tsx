import Link from "next/link";

/**
 * Phase 0 route skeleton. Every one of these is replaced by a real screen in a
 * later phase — the directory name is the reminder. Delete when empty.
 */
export function Placeholder({
  eyebrow,
  title,
  phase,
  children,
}: {
  eyebrow: string;
  title: string;
  phase: string;
  children?: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col justify-center gap-6 px-5 py-16 pb-safe">
      <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
        {eyebrow}
      </p>
      <h1 className="font-display text-4xl leading-[1.05] font-bold text-chalk sm:text-5xl">
        {title}
      </h1>
      <div className="h-px w-full bg-line" />
      <p className="text-sm text-muted-foreground">
        Route skeleton. Built in{" "}
        <span className="font-mono text-marigold">{phase}</span>.
      </p>
      {children}
      <Link
        href="/"
        className="touch-target inline-flex w-fit items-center text-sm text-marigold underline-offset-4 hover:underline"
      >
        ← Back to start
      </Link>
    </main>
  );
}
