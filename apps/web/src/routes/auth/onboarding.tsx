import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { OnboardingFlow, type OnboardingStep } from "../../components/onboarding/onboarding-flow";

const STEPS = ["details", "nin", "location", "role"] as const;

export const Route = createFileRoute("/auth/onboarding")({
  validateSearch: (search) => {
    const step = typeof search.step === "string" ? search.step : "details";

    return {
      step: STEPS.includes(step as OnboardingStep) ? (step as OnboardingStep) : "details",
    };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const { step } = Route.useSearch();

  return (
    <OnboardingFlow
      step={step}
      onStepChange={(nextStep) =>
        navigate({
          to: "/auth/onboarding",
          search: { step: nextStep },
          replace: true,
        })
      }
      onExit={() =>
        navigate({
          to: "/auth/verify-otp",
          search: { flow: "signup" },
        })
      }
      onFinish={() => navigate({ to: "/dashboard" })}
    />
  );
}
