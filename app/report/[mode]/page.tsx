import { ReportScreen } from "@/components/report/ReportScreen";

/** ★ ONE report screen, all three modes. See CLAUDE.md rule 5. */
export default async function ReportPage({
  params,
}: {
  params: Promise<{ mode: string }>;
}) {
  const { mode } = await params;
  return <ReportScreen mode={mode} />;
}
