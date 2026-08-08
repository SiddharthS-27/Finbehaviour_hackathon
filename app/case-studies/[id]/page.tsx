import { CaseStudyScreen } from "@/components/cases/CaseStudyScreen";
import { CASE_STUDIES } from "@/content/case-studies";

/** The library is authored and finite, so every case is a static route. */
export function generateStaticParams() {
  return CASE_STUDIES.map((c) => ({ id: c.id }));
}

export default async function CaseStudyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CaseStudyScreen id={id} />;
}
