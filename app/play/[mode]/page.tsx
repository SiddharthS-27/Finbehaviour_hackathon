import { PlayScreen } from "@/components/game/PlayScreen";

/**
 * ★ ONE game screen, all three modes. Next 15 hands `params` in as a promise.
 */
export default async function PlayPage({
  params,
}: {
  params: Promise<{ mode: string }>;
}) {
  const { mode } = await params;
  return <PlayScreen mode={mode} />;
}
