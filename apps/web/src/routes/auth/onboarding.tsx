import { createFileRoute, redirect } from "@tanstack/react-router";
import { OnboardingFlow, type OnboardingStep } from "./_components/-onboarding-flow";
import { APP_URL } from "#/lib/config";
import { getPageHeader } from "#/lib/shared/meta";
import { checkIfRefreshTokenInCookie } from "#/lib/server/auth/auth";

const STEPS : readonly OnboardingStep[] = ["details", "nin", "location"] as const;

const STEP_TITLES: Record<OnboardingStep, string> = {
  details: "Onboarding: Add your details",
  nin: "Onboarding: Add your NIN",
  location: "Onboarding: Add your location",
};

export const Route = createFileRoute("/auth/onboarding")({
  // Check if user is already authenticated, if so redirect to home page
  beforeLoad: async () => {
    const response = await checkIfRefreshTokenInCookie({});
    const isAuthed = (response.status === "success") ? true : false
    if (isAuthed) {
      throw redirect({ to: APP_URL.homePage });
    }
  },

  // Validate search params
  validateSearch: (search) => {
    const step = typeof search.step === "string" ? search.step : "details";

    return {
      step: STEPS.includes(step as OnboardingStep) ? (step as OnboardingStep) : "details",
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

  return (
    <OnboardingFlow step={step} />
  );
}
