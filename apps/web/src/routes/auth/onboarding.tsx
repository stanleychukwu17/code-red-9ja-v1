import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAppSelector } from "#/redux/hooks";
import {
  OnboardingFlow,
  ONBOARDING_STEPS,
  type OnboardingStep,
} from "./_components/-onboarding-flow";
import { APP_URL } from "#/lib/config";
import { getPageHeader } from "#/lib/shared/meta";

const STEP_TITLES: Record<OnboardingStep, string> = {
  username: "Onboarding: Choose your username",
  details: "Onboarding: Add your details",
  origin: "Onboarding: Where are you from?",
  location: "Onboarding: Add your location",
  referral: "Onboarding: Referral code",
};

export const Route = createFileRoute("/auth/onboarding")({
  beforeLoad: async () => {
    // Authentication check if needed
  },

  // Validate search params
  validateSearch: (search) => {
    const step = typeof search.step === "string" ? search.step : "details";

    return {
      step: ONBOARDING_STEPS.includes(step as OnboardingStep)
        ? (step as OnboardingStep)
        : "details",
    };
  },

  // Loader deps
  loaderDeps: ({ search: { step } }) => ({ step }),

  // Loader
  loader: ({ deps: { step } }) => ({ step }),

  // Set page meta
  head: ({ loaderData }) => {
    const step = loaderData?.step;
    const title = (step && STEP_TITLES[step]) || "Onboarding";
    return getPageHeader({ title, robotsAllowed: "no" });
  },

  // Component
  component: RouteComponent,
});

function RouteComponent() {
  const { step } = Route.useSearch() as { step: OnboardingStep };
  const user = useAppSelector((state) => state.auth.user);
  const navigate = useNavigate();

  useEffect(() => {
    // If the user has already provided these required details, they are done with onboarding.
    if (user?.username && user?.first_name) {
      navigate({ to: APP_URL.home, replace: true });
    }
  }, [user, navigate]);

  return <OnboardingFlow step={step} />;
}
