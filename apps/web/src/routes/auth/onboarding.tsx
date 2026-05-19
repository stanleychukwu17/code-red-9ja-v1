import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { OnboardingFlow, type OnboardingStep } from "./_components/-onboarding-flow";
import { useAppSelector } from "#/redux/hooks";
import { APP_URL } from "#/lib/config";
import { getPageHeader } from "#/lib/shared/meta";

const STEPS : readonly OnboardingStep[] = ["details", "nin", "location"] as const;

const STEP_TITLES: Record<OnboardingStep, string> = {
  details: "Onboarding: Add your details",
  nin: "Onboarding: Add your NIN",
  location: "Onboarding: Add your location",
};

export const Route = createFileRoute("/auth/onboarding")({
  validateSearch: (search) => {
    const step = typeof search.step === "string" ? search.step : "details";

    return {
      step: STEPS.includes(step as OnboardingStep) ? (step as OnboardingStep) : "details",
    };
  },
  loaderDeps: ({ search: { step } }) => ({ step }),
  loader: ({ deps: { step } }) => ({ step }),
  head: ({ loaderData }) => {
    const step = loaderData?.step;
    const title = (step && STEP_TITLES[step]) || "Onboarding";
    return getPageHeader({ title, robotsAllowed: "no" });
  },
  component: RouteComponent,
});

function RouteComponent() {
  const {otpVerified} = useAppSelector((state) => state.auth.onboardingData) ?? {};
  const navigate = useNavigate();
  const { step } = Route.useSearch();

  useEffect(() => {
    if (otpVerified !== "yes") {
      navigate({
        to: APP_URL.auth.signup,
        replace: true,
      });
    }
  }, [otpVerified, navigate]);

  return (
    <OnboardingFlow step={step} />
  );
}
