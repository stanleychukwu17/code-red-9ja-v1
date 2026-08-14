import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAppContext } from "#/hooks/useAppContext";
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
  // nin: "Onboarding: Add your NIN",
  origin: "Onboarding: Where are you from?",
  location: "Onboarding: Add your location",
  referral: "Onboarding: Referral code",
  // security: "Onboarding: Security questions",
};

export const Route = createFileRoute("/auth/onboarding")({
  beforeLoad: async () => {
    // If needed, check authentication status here
    // Currently allowing access so users can complete onboarding after signup
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
  const { step } = Route.useSearch();
  const { user } = useAppContext();
  const navigate = useNavigate();

  useEffect(() => {
    // If the user has already provided these required details, they are done with onboarding.
    // They shouldn't be here. Redirect to home.
    if (user?.username && user?.first_name && user?.current_state) {
      navigate({ to: APP_URL.home, replace: true });
    }
  }, [user, navigate]);

  return <OnboardingFlow step={step} />;
}
