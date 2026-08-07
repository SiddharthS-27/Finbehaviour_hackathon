import { Placeholder } from "@/components/dev/Placeholder";

/** ★ ONE report screen, all three modes. */
export default async function ReportPage({
  params,
}: {
  params: Promise<{ mode: string }>;
}) {
  const { mode } = await params;

  return (
    <Placeholder
      eyebrow={`Report · ${mode}`}
      title="What it cost you"
      phase="Phase 8"
    >
      <p className="text-sm text-muted-foreground">
        Archetype, the gap against the shadow agent in rupees, the three
        costliest decisions, and a tappable ribbon that replays any month with a
        different choice.
      </p>
    </Placeholder>
  );
}
