import { Button } from "@repo/ui/components/button";
import { FormInput } from "@repo/ui/components/input";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { useAppSelector, useAppDispatch } from "@/redux/hooks";
import { updateOnboardingData } from "@/redux/slice/authSlice";
import { resendOtp, verifyOtp } from "@/lib/server/auth";
import { OnboardingHeader, OnboardingWrapper } from "./_components/-onboarding";
import { FormError } from "./_components/-form-error";
import OTPIcon from "@repo/ui/icons/onboarding/otp-icon";
import { APP_URL } from "@/lib/config";
import { getPageHeader } from "@/lib/shared/meta";

export const Route = createFileRoute("/auth/verify-otp")({
  head: () => getPageHeader({title: "Verify otp sent to you", robotsAllowed: "no"}),
  validateSearch: (search) => {
    const flow = search.flow

    return {
      flow: typeof flow === "string" && flow === "signup" ? "signup" : "login",
    };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { flow } = Route.useSearch();
  const {dateTimeOtpSent, phoneNumber, fakeId, otpVerified} = useAppSelector((state) => state.auth.onboardingData) ?? {};
  const [otp, setOtp] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // checks if the user is allowed to see this page
  useEffect(() => {
    // redirect back to signup page if onboarding data is not available
    if (!fakeId || `${fakeId}`.length < 6) {
      navigate({ to: APP_URL.auth.signup });
      return;
    }

    // if otp already verified, then forward the user to the onboarding phase
    if (otpVerified == "yes") {
      navigate({ to: APP_URL.auth.onboarding });
      return;
    }
  }, [fakeId, otpVerified, navigate])

  // calculate time left for otp expiry
  const calculateTimeLeft = useCallback(() => {
    if (!dateTimeOtpSent) return 0;
    const sentTime = new Date(dateTimeOtpSent).getTime();
    const now = new Date().getTime();
    const expiryTime = sentTime + 10 * 60 * 1000; // 10 minutes, but in milliseconds
    return Math.max(0, Math.floor((expiryTime - now) / 1000)); // convert to seconds, but if lower than 0, we return 0
  }, [dateTimeOtpSent]);

  // set time left for otp expiry
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  // Sync initial state when dateTimeOtpSent becomes available,
  // and set up a timer to update the time left every second
  useEffect(() => {
    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [calculateTimeLeft]);

  // format time for display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    let secs = seconds % 60;
    secs = parseInt(secs.toString().padStart(2, "0"));
    return `${mins}:${secs}`;
  };

  // handle resend otp, makes the request for a new otp
  const handleResend = async () => {
    if (!phoneNumber || !fakeId || timeLeft > 0) return;

    setIsResending(true);
    setServerError(null);
    const result = await resendOtp({
      data: { phoneNumber, fakeId }
    });
    setIsResending(false);

    if (result.status === "success") {
      dispatch(updateOnboardingData({ dateTimeOtpSent: result.dateTimeOtpSent }));
    } else {
      setServerError(result.message || "An error occurred during request for another OTP");
    }
  };

  // handle verify otp, submits the otp code to the server
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!phoneNumber || isVerifying) return;

    if (otp.length !== 6) {
      setServerError("Please enter a valid 6-digit OTP code");
      return;
    }

    setServerError(null);
    setIsVerifying(true);

    // makes the request for a new otp  
    const result = await verifyOtp({
      data: { phoneNumber, otp }
    });

    setIsVerifying(false);

    if (result.status === "success") {
      dispatch(updateOnboardingData({ otpVerified: "yes" }));
      navigate({ to: APP_URL.auth.onboarding });
    } else {
      setServerError(result.message || "An error occurred during verification");
    }
  };

  // go back to previous page
  const goBack = () => navigate({ to: flow === "signup" ? APP_URL.auth.signup : APP_URL.auth.login });

  return (
    <OnboardingWrapper>
      <OnboardingHeader
        icon={<OTPIcon className="size-6 text-primary" strokeWidth={1.8} />}
        title={"Enter OTP"}
        subtitle={`OTP was sent to whatsapp ${phoneNumber || "your phone number"}`}
        onBack={goBack}
      />

      <FormError message={serverError} />

      <form onSubmit={handleSubmit} className="flex flex-col">
        <FormInput
          placeholder="- - - - - -"
          value={otp}
          inputMode="numeric"
          maxLength={6}
          className="border border-primary bg-transparent tracking-[0.7em] placeholder:tracking-[0.4em] md:text-center mt-4"
          onChange={(event) => setOtp(event.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
        />

      <div className="mt-8 flex flex-col items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-c-70">
          <span>Didn't receive the code?</span>
          <button
            type="button"
            disabled={timeLeft > 0 || isResending}
            onClick={handleResend}
            className={`font-bold transition-all duration-200 ${
              timeLeft > 0 || isResending
                ? "text-c-30 cursor-not-allowed opacity-50"  : "text-primary cursor-pointer hover:text-primary/80"
            }`}
          >
            {isResending ? "Resending..." : "Resend"}
          </button>
        </div>

        {/* every time the timeLeft is updated, the component below will re-render with the timeLeft*/}
        {timeLeft > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-c-10/30 rounded-full border border-c-10/50">
            <div className="size-1.5 rounded-full bg-primary animate-pulse" />
            <p className="text-xs text-c-50 font-medium">
              Wait <span className="font-mono text-primary">{formatTime(timeLeft)}</span> to resend
            </p>
          </div>
        )}
      </div>

      <div className="pt-10 md:pt-12">
        <Button
          type="submit"
          variant="secondary"
          disabled={otp.length < 6 || isVerifying}
          loading={isVerifying}
          className="h-14 w-full rounded-[18px] font-bold mb-4"
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
      </form>
    </OnboardingWrapper>
  );
}
