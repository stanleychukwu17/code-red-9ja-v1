import { useAppSelector } from "@/redux/hooks";
import { useQuery, useMutation } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { AuthWrapper } from "./_components/-auth-wrapper";
import { FormError } from "./_components/-form-error";
import { SignupError } from "./_components/-signup-error";

import { APP_NAME, APP_URL } from "@/lib/config";
import {
  checkIfRefreshTokenInCookie,
  sendSignupEmailOtp,
  signupUser,
  verifySignupEmailOtp,
} from "@/lib/server/auth/auth";
import { getAllCountries } from "@/lib/server/countries";
import { getPageHeader } from "@/lib/shared/meta";
import { Button } from "@repo/ui/components/button";
import {
  FormInput,
  InputErrorText,
  PasswordInput,
} from "@repo/ui/components/input";
import { SelectCountryCode } from "@repo/ui/components/selects/country-code-select";
import type { countriesType } from "./login";

export const Route = createFileRoute("/auth/signup")({
  // Check if user is already authenticated, if so redirect to home page
  beforeLoad: async () => {
    const isLoggedIn = await checkIfRefreshTokenInCookie({});
    if (isLoggedIn.status === "success") {
      throw redirect({ to: APP_URL.home });
    }
  },

  // Page metadata
  head: () =>
    getPageHeader({
      title: "Sign up ",
      description: `Create your account to start enjoying premium content on ${APP_NAME}`,
    }),

  // Component to render
  component: RouteComponent,

  // Error component
  errorComponent: SignupError,
});

function RouteComponent() {
  const navigate = useNavigate();
  const visitorDetails = useAppSelector((state) => state.site.visitorDetails);
  const visitorCountry = visitorDetails?.location?.country?.toLowerCase();

  const { data: countriesRes } = useQuery({
    queryKey: ["countries"],
    queryFn: () => getAllCountries() as Promise<countriesType>,
    staleTime: Infinity,
  });
  const countries = (
    countriesRes?.success ? countriesRes.data.countries : []
  ) as { id: number; name: string; iso2: string; phonecode: string }[];

  const [serverError, setServerError] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [resendSeconds, setResendSeconds] = useState(0);
  const [pendingSignup, setPendingSignup] = useState<{
    countryId?: number;
    phoneNumber: string;
    email: string;
    password: string;
    countryName: string;
  } | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid, isSubmitting },
  } = useForm({
    mode: "onChange",
    defaultValues: {
      country: "",
      phoneNumber: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const signupMutation = useMutation({
    mutationFn: signupUser,
    onSuccess: (result) => {
      if (result.success) {
        // Cookies are set server-side on signup — navigate to onboarding.
        // The onboarding route will check the authenticated user's fields.
        navigate({ to: APP_URL.auth.onboarding });
      } else {
        setServerError(
          result.error ||
          result.message ||
          "An error occurred during registration",
        );
      }
    },
    onError: () => {
      setServerError("An error occurred during registration");
    },
  });

  const sendOtpMutation = useMutation({
    mutationFn: sendSignupEmailOtp,
    onSuccess: (result) => {
      if (result.success) {
        setOtpSent(true);
        setResendSeconds(60);
        // setServerError(
        //   "We sent a verification code to your email. Enter it below to continue.",
        // );
      } else {
        setServerError(
          result.error ||
          result.message ||
          "An error occurred while sending the verification code",
        );
      }
    },
    onError: () => {
      setServerError("An error occurred while sending the verification code");
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: verifySignupEmailOtp,
    onSuccess: (result) => {
      if (result.success) {
        const token =
          result.data?.emailVerificationToken ||
          result.emailVerificationToken ||
          "";
        if (!pendingSignup) {
          setServerError(
            "Missing signup details. Please submit the form again.",
          );
          return;
        }
        signupMutation.mutate({
          data: {
            ...pendingSignup,
            emailVerificationToken: token,
          },
        });
      } else {
        setServerError(
          result.error ||
          result.message ||
          "An error occurred while verifying the code",
        );
      }
    },
    onError: () => {
      setServerError("An error occurred while verifying the code");
    },
  });

  const onSubmit = async (value: any) => {
    // clear any previous errors
    setServerError(null);

    // find the matched country and add it to the payload
    const matchedCountry = countries.find(
      (c) => c.name.toLowerCase() === value.country.toLowerCase(),
    );

    // create the payload for the server
    const payload = {
      countryId: matchedCountry?.id,
      phoneNumber: value.phoneNumber,
      email: value.email,
      password: value.password,
      countryName: matchedCountry?.name ?? "",
    };

    if (!otpSent) {
      setPendingSignup(payload);
      sendOtpMutation.mutate({ data: { email: value.email } } as any);
      return;
    }

    verifyOtpMutation.mutate({ data: { email: value.email, otp } } as any);
  };

  useEffect(() => {
    if (!otpSent || resendSeconds <= 0) return;

    const interval = setInterval(() => {
      setResendSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [otpSent, resendSeconds]);

  // auto-select the country where the user is browsing from once visitorCountry is available
  useEffect(() => {
    if (!visitorCountry) return;

    const timeoutId = setTimeout(() => {
      // find the matched country
      const matchedCountry = countries.find(
        (c) => c.name.toLowerCase() === visitorCountry,
      );

      // if no matched country, return
      if (!matchedCountry) return;

      // set the country value in the form
      setValue("country", matchedCountry.name.toLowerCase(), {
        shouldValidate: true,
        shouldDirty: true,
      });

      // find the select element for countries and set the value to the matched country
      const selectEl = document.querySelector("div.selectElement select");
      if (selectEl) {
        (selectEl as HTMLSelectElement).value = visitorCountry;
        selectEl.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [visitorCountry, countries, setValue]);

  return (
    <AuthWrapper type={otpSent ? "verify-otp" : "signup"}>
      <FormError message={serverError} />
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
        {!otpSent ? (
          <>
            <Controller
              name="phoneNumber"
              control={control}
              rules={{
                required: "Phone number is required",
                validate: (value) => {
                  if (!value) return "Phone number is required";
                  const phoneRegex = /^[\d\s-]{10,}$/;
                  if (!phoneRegex.test(value))
                    return "Enter a valid phone number";
                  return undefined;
                },
              }}
              render={({ field }) => (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Controller
                      name="country"
                      control={control}
                      rules={{ required: "Country is required" }}
                      render={({ field: countryField }) => (
                        <div className="w-30 shrink-0">
                          <SelectCountryCode
                            countries={countries}
                            selectedId={countryField.value}
                            update={(val) => countryField.onChange(val)}
                            errorMsg={
                              errors.country?.message as string | undefined
                            }
                          />
                        </div>
                      )}
                    />
                    <div className="w-full">
                      <FormInput
                        placeholder="Phone number (whatsapp)"
                        value={field.value}
                        onBlur={field.onBlur}
                        onChange={(e) => field.onChange(e.target.value)}
                        maxLength={12}
                      />
                    </div>
                  </div>
                  <InputErrorText
                    text={errors.phoneNumber?.message as string | undefined}
                  />
                  {/* <div className="flex items-center gap-x-2 text-xs text-grey-500 ml-1 mt-2.5">
                    <PiWhatsappLogoDuotone className="size-6 text-green-600" />
                    We'll send you a code to verify your phone number.
                  </div> */}
                </div>
              )}
            />

            <Controller
              name="email"
              control={control}
              rules={{
                validate: (value) => {
                  if (!value) return "Email is required";
                  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                  if (!emailRegex.test(value)) {
                    return "Enter a valid email address";
                  }
                  return undefined;
                },
              }}
              render={({ field }) => (
                <FormInput
                  type="email"
                  placeholder="Email"
                  value={field.value}
                  onBlur={field.onBlur}
                  onChange={(e) => field.onChange(e.target.value)}
                  errorMsg={errors.email?.message as string | undefined}
                />
              )}
            />

            <Controller
              name="password"
              control={control}
              rules={{
                required: "Password is required",
                minLength: {
                  value: 5,
                  message: "Password must be at least 5 characters",
                },
              }}
              render={({ field }) => (
                <PasswordInput
                  placeholder="Password"
                  value={field.value}
                  onBlur={field.onBlur}
                  onChange={(e) => field.onChange(e.target.value)}
                  errorMsg={errors.password?.message as string | undefined}
                />
              )}
            />

            <Controller
              name="confirmPassword"
              control={control}
              rules={{
                required: "Please confirm your password",
                validate: (value) => {
                  if (value !== watch("password"))
                    return "Passwords do not match";
                  return undefined;
                },
              }}
              render={({ field }) => (
                <PasswordInput
                  placeholder="Confirm Password"
                  value={field.value}
                  onBlur={field.onBlur}
                  onChange={(e) => field.onChange(e.target.value)}
                  errorMsg={
                    errors.confirmPassword?.message as string | undefined
                  }
                />
              )}
            />

            <Button
              type="submit"
              size="2xl"
              variant="secondary"
              disabled={!isValid || sendOtpMutation.isPending}
              loading={isSubmitting || sendOtpMutation.isPending}
            >
              Sign up
            </Button>
          </>
        ) : (
          <div className="space-y-5 pt-2">
            <FormInput
              placeholder="Enter 6-digit code"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              maxLength={6}
            />

            <Button
              type="button"
              size="2xl"
              className="w-full"
              variant="secondary"
              disabled={
                otp.length < 6 ||
                verifyOtpMutation.isPending ||
                signupMutation.isPending
              }
              loading={verifyOtpMutation.isPending || signupMutation.isPending}
              onClick={() => {
                const email = (watch("email") || "").trim();
                if (!email) {
                  setServerError("Email is required");
                  return;
                }
                if (!pendingSignup) {
                  setServerError(
                    "Missing signup details. Please go back and try again.",
                  );
                  return;
                }
                verifyOtpMutation.mutate({ data: { email, otp } } as any);
              }}
            >
              Complete Sign up
            </Button>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                className="h-10 flex-items-center pr-5 font-medium text-c-80 hover:text-green cursor-pointer disabled:opacity-50 transition-all duration-300"
                disabled={resendSeconds > 0 || sendOtpMutation.isPending}
                onClick={() => {
                  const email = (watch("email") || "").trim();
                  if (!email) {
                    setServerError("Email is required");
                    return;
                  }
                  sendOtpMutation.mutate({ data: { email } } as any);
                }}
              >
                {resendSeconds > 0 ? (
                  <>
                    Resend in{" "}
                    <span className="font-semibold text-green">
                      {resendSeconds}s
                    </span>
                  </>
                ) : (
                  <span className="font-medium">Resend code</span>
                )}
              </button>

              <button
                type="button"
                className="h-10 flex-items-center pl-5 text-c-80 hover:text-green cursor-pointer transition-all duration-300"
                onClick={() => {
                  setOtpSent(false);
                  setOtp("");
                  setResendSeconds(0);
                  setPendingSignup(null);
                  setServerError(null);
                }}
              >
                Change email address
              </button>
            </div>
          </div>
        )}
      </form>
    </AuthWrapper>
  );
}
