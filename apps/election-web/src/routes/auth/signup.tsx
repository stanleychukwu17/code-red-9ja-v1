import { useAppSelector } from "@/redux/hooks";
import { useQuery, useMutation } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "@tanstack/react-form";
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
    const isLoggedIn = await checkIfRefreshTokenInCookie();
    if (isLoggedIn.success) {
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

  // Fetch countries list to populate the country code dropdown
  const { data: countriesRes } = useQuery({
    queryKey: ["countries"],
    queryFn: () => getAllCountries() as Promise<countriesType>,
    staleTime: Infinity,
  });
  const countries = (
    countriesRes?.success ? countriesRes.data.countries : []
  ) as { id: number; name: string; iso2: string; phonecode: string }[];

  // Local state for handling form progression, OTP, and errors
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

  // Mutation to request an OTP code to be sent to the user's email
  const sendOtpMutation = useMutation({
    mutationFn: sendSignupEmailOtp,
    onSuccess: (result) => {
      if (result.success) {
        setOtpSent(true);
        setResendSeconds(60);
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

  // Mutation to verify the OTP code entered by the user
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

  // Mutation for the final signup step (after OTP verification)
  const signupMutation = useMutation({
    mutationFn: signupUser,
    onSuccess: (result) => {
      if (result.success) {
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

  // Initialize form using TanStack Form
  const form = useForm({
    defaultValues: {
      country: "",
      phoneNumber: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    onSubmit: async ({ value }) => {
      setServerError(null);

      const matchedCountry = countries.find(
        (c) => c.name.toLowerCase() === value.country.toLowerCase(),
      );

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
    },
  });

  // Timer effect to handle the OTP resend cool-down
  useEffect(() => {
    if (!otpSent || resendSeconds <= 0) return;

    const interval = setInterval(() => {
      setResendSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [otpSent, resendSeconds]);

  // Auto-select the country where the user is browsing from
  useEffect(() => {
    if (!visitorCountry) return;

    const timeoutId = setTimeout(() => {
      const matchedCountry = countries.find(
        (c) => c.name.toLowerCase() === visitorCountry,
      );

      if (!matchedCountry) return;

      form.setFieldValue("country", matchedCountry.name.toLowerCase());
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [visitorCountry, countries, form]);

  return (
    <AuthWrapper
      type={otpSent ? "verify-otp" : "signup"}
      email={otpSent ? (pendingSignup?.email || form.getFieldValue("email")) : undefined}
    >
      <FormError message={serverError} />
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        {!otpSent ? (
          <>
            <form.Field
              name="phoneNumber"
              validators={{
                onChange: ({ value }) => {
                  if (!value) return "Phone number is required";
                  const phoneRegex = /^[\d\s-]{10,}$/;
                  if (!phoneRegex.test(value))
                    return "Enter a valid phone number";
                  return undefined;
                },
              }}
              children={(field) => (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <form.Field
                      name="country"
                      validators={{
                        onChange: ({ value }) =>
                          !value ? "Country is required" : undefined,
                      }}
                      children={(countryField) => (
                        <div className="w-30 shrink-0">
                          <SelectCountryCode
                            countries={countries}
                            selectedId={countryField.state.value}
                            update={(val) => countryField.handleChange(val)}
                            errorMsg={
                              countryField.state.meta.errors?.[0]
                            }
                          />
                        </div>
                      )}
                    />
                    <div className="w-full">
                      <FormInput
                        placeholder="Phone number (whatsapp)"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        maxLength={12}
                      />
                    </div>
                  </div>
                  <InputErrorText
                    text={field.state.meta.errors?.[0]}
                  />
                </div>
              )}
            />

            <form.Field
              name="email"
              validators={{
                onChange: ({ value }) => {
                  if (!value) return "Email is required";
                  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                  if (!emailRegex.test(value)) {
                    return "Enter a valid email address";
                  }
                  return undefined;
                },
              }}
              children={(field) => (
                <FormInput
                  type="email"
                  placeholder="Email"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  errorMsg={field.state.meta.errors?.[0]}
                />
              )}
            />

            <form.Field
              name="password"
              validators={{
                onChange: ({ value }) => {
                  if (!value) return "Password is required";
                  if (value.length < 5)
                    return "Password must be at least 5 characters";
                  return undefined;
                },
              }}
              children={(field) => (
                <PasswordInput
                  placeholder="Password"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  errorMsg={field.state.meta.errors?.[0]}
                />
              )}
            />

            <form.Field
              name="confirmPassword"
              validators={{
                onChangeListenTo: ["password"],
                onChange: ({ value, fieldApi }) => {
                  if (!value) return "Please confirm your password";
                  if (value !== fieldApi.form.getFieldValue("password")) {
                    return "Passwords do not match";
                  }
                  return undefined;
                },
              }}
              children={(field) => (
                <PasswordInput
                  placeholder="Confirm Password"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  errorMsg={field.state.meta.errors?.[0]}
                />
              )}
            />

            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
              children={([canSubmit, isSubmitting]) => (
                <Button
                  type="submit"
                  size="2xl"
                  variant="secondary"
                  disabled={!canSubmit || sendOtpMutation.isPending}
                  loading={isSubmitting || sendOtpMutation.isPending}
                >
                  Sign up
                </Button>
              )}
            />
          </>
        ) : (
          <div className="space-y-5 pt-2">
            {/* OTP Input field */}
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
                const email = form.getFieldValue("email").trim();
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
              {/* Resend OTP button */}
              <button
                type="button"
                className="h-10 flex-items-center pr-5 font-medium text-c-80 hover:text-green cursor-pointer disabled:opacity-50 transition-all duration-300"
                disabled={resendSeconds > 0 || sendOtpMutation.isPending}
                onClick={() => {
                  const email = form.getFieldValue("email").trim();
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

              {/* Change email button */}
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
