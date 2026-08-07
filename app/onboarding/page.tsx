import { Placeholder } from "@/components/dev/Placeholder";

export default function OnboardingPage() {
  return (
    <Placeholder
      eyebrow="Onboarding"
      title="Profile and diagnostic"
      phase="Phase 3"
    >
      <p className="text-sm text-muted-foreground">
        Name, life stage, income band, location, dependents, then three
        questions that infer literacy level without ever asking about it.
      </p>
    </Placeholder>
  );
}
