import { Placeholder } from "@/components/dev/Placeholder";

/**
 * ★ ONE game screen, all three modes. Story, Historical and Short Bites are
 * three decks fed to the same engine — never a second game loop.
 *
 * Next 15 hands `params` in as a promise.
 */
export default async function PlayPage({
  params,
}: {
  params: Promise<{ mode: string }>;
}) {
  const { mode } = await params;

  return (
    <Placeholder eyebrow={`Play · ${mode}`} title="The game loop" phase="Phase 4">
      <p className="text-sm text-muted-foreground">
        Timeline ribbon, stat bars, allocation sliders, event card, month
        result. One screen serves{" "}
        <span className="font-mono text-marigold">story</span>,{" "}
        <span className="font-mono text-marigold">historical</span> and{" "}
        <span className="font-mono text-marigold">bites</span>.
      </p>
    </Placeholder>
  );
}
