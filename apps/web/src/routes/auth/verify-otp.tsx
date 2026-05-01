import { Button } from "@repo/ui/components/button";
import { FormInput } from "@repo/ui/components/input";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { OnboardingHeader, OnboardingWrapper } from "./_components/onboarding";
import OTPIcon from "@repo/ui/icons/onboarding/otp-icon";

export const Route = createFileRoute("/auth/verify-otp")({
  validateSearch: (search) => {
    const flow = typeof search.flow === "string" ? search.flow : "login";

    return {
      flow: flow === "signup" ? "signup" : "login",
    };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const { flow } = Route.useSearch();
  const [otp, setOtp] = useState("");
  const goBack = () =>
    navigate({ to: flow === "signup" ? "/auth/signup" : "/auth/login" });

  return (
    <OnboardingWrapper>
      <OnboardingHeader
        icon={<OTPIcon className="size-6 text-primary" strokeWidth={1.8} />}
        title={"Enter OTP"}
        subtitle={"We sent you an OTP to stanley@gmail.com."}
        onBack={goBack}
      />

      <FormInput
        placeholder="- - - - - -"
        value={otp}
        inputMode="numeric"
        maxLength={6}
        className="border border-primary bg-transparent tracking-[0.7em] placeholder:tracking-[0.4em] md:text-center"
        onChange={(event) =>
          setOtp(event.target.value.replace(/[^0-9]/g, "").slice(0, 6))
        }
      />

      <div className="pt-10 md:pt-12">
        <Button
          type="button"
          variant="secondary"
          disabled={otp.length < 6}
          onClick={() =>
            navigate({
              to: flow === "signup" ? "/auth/onboarding" : "/dashboard",
              search: flow === "signup" ? { step: "details" } : undefined,
            })
          }
          className="h-14 w-full rounded-[18px] font-bold"
        >
          Continue
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={goBack}
          className="h-14 w-full rounded-[18px] font-bold"
        >
          Go back
        </Button>
      </div>
    </OnboardingWrapper>
  );
}
