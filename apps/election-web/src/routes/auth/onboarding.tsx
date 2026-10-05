import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useUser } from "#/hooks/useUser";
import { OnboardingFlow, ONBOARDING_STEPS, type OnboardingStep } from "./_components/-onboarding-flow";
import { APP_URL } from "#/lib/config";
import { getPageHeader } from "#/lib/shared/meta";
import { checkIfRefreshTokenInCookie } from "#/lib/server/auth/auth";

/**
 * Step title mapping for search engine and browser tab titles during onboarding.
 */
const STEP_TITLES: Record<OnboardingStep, string> = {
  username: "Onboarding: Choose your username",
  details: "Onboarding: Add your details",
  // nin: "Onboarding: Add your NIN",
  origin: "Onboarding: Where are you from?",
  location: "Onboarding: Add your location",
  referral: "Onboarding: Referral code",
  // security: "Onboarding: Security questions",
};

/**
 * Onboarding Route Definition
 * Enforces authenticated session check and guards against re-onboarding completed accounts.
 * Syncs the current wizard step via URL search params (?step=...).
 */
export const Route = createFileRoute("/auth/onboarding")({
  beforeLoad: async ({ context }) => {
    const res = await checkIfRefreshTokenInCookie();

    // Must be logged in to access onboarding
    if (!res.success) {
      throw redirect({ to: APP_URL.auth.login });
    }

    // If account already has a username, skip onboarding to home
    if (context.userDetails?.username) {
      throw redirect({ to: APP_URL.home });
    }
  },

  // Validate search params against known onboarding steps
  validateSearch: (search): { step: OnboardingStep } => {
    const step = typeof search.step === "string" ? search.step : "details";

    return {
      step: ONBOARDING_STEPS.includes(step as OnboardingStep)
        ? (step as OnboardingStep)
        : "details",
    };
  },

  // Loader deps tracking query param changes
  loaderDeps: ({ search }: { search: { step?: OnboardingStep } }) => ({
    step: search?.step || "details",
  }),

  // Pass active step into route loader data
  loader: ({ deps: { step } }) => ({ step }),

  // Dynamic browser title per step
  head: ({ loaderData }) => {
    const step = loaderData?.step;
    const title = (step && STEP_TITLES[step]) || "Onboarding";
    return getPageHeader({ title, robotsAllowed: "no" });
  },

  component: RouteComponent,
});

/**
 * RouteComponent
 * Top-level route container that coordinates onboarding step transitions.
 * Redirects completed users back to the home dashboard.
 */
function RouteComponent() {

  const { step } = Route.useSearch() as { step: OnboardingStep };
  const user = useUser();
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
