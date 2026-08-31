import { useEffect, useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";

import { Button } from "@repo/ui/components/button";
import { FormInput, PasswordInput } from "@repo/ui/components/input";

import { AuthWrapper } from "./_components/-auth-wrapper";
import { FormError } from "./_components/-form-error";
import { getPageHeader } from "#/lib/shared/meta";
import {
  checkIfRefreshTokenInCookie,
  sendForgotPasswordEmailOtp,
  changePasswordByEmail,
} from "#/lib/server/auth/auth";
import { APP_URL } from "#/lib/config";

type Step = "email" | "otp" | "password";

export const Route = createFileRoute("/auth/forgot-password")({
  beforeLoad: async () => {
    const isLoggedIn = await checkIfRefreshTokenInCookie();
    if (isLoggedIn.success) {
      throw redirect({ to: APP_URL.home });
    }
  },
  head: () =>
    getPageHeader({ title: "Reset your password", robotsAllowed: "no" }),
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const [resendSeconds, setResendSeconds] = useState(0);

  // ── Resend countdown ──
  useEffect(() => {
    if (step !== "otp" || resendSeconds <= 0) return;
    const interval = setInterval(() => {
      setResendSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [step, resendSeconds]);

  // ── Step 1: send OTP ──
  const sendOtpMutation = useMutation({
    mutationFn: (emailVal: string) =>
      sendForgotPasswordEmailOtp({ data: { email: emailVal } }),
    onSuccess: (result: any) => {
      if (result.success) {
        setStep("otp");
        setResendSeconds(59);
        setServerError(null);
      } else {
        setServerError(
          result.error || result.message || "Failed to send verification code.",
        );
      }
    },
    onError: () => setServerError("Failed to send verification code."),
  });

  // ── Step 3: change password (atomic verify OTP + set password) ──
  const changePasswordMutation = useMutation({
    mutationFn: (data: { email: string; password: string; otp: string }) =>
      changePasswordByEmail({ data }),
    onSuccess: (result: any) => {
      if (result.success) {
        navigate({ to: APP_URL.auth.login, replace: true });
      } else {
        setServerError(
          result.error || result.message || "Failed to reset password.",
        );
      }
    },
    onError: () => setServerError("An unexpected error occurred."),
  });

  // ── Handlers ──
  const handleSendOtp = () => {
    setServerError(null);
    const trimmed = email.trim();
    if (!trimmed) return setServerError("Please enter your email address.");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed))
      return setServerError("Please enter a valid email address.");
    sendOtpMutation.mutate(trimmed);
  };

  const handleVerifyOtp = () => {
    setServerError(null);
    if (otp.length < 6) return setServerError("Please enter the 6-digit code.");
    setStep("password");
  };

  const handleChangePassword = () => {
    setServerError(null);
    if (!password) return setServerError("Please enter a new password.");
    if (password.length < 5)
      return setServerError("Password must be at least 5 characters.");
    if (password !== confirmPassword)
      return setServerError("Passwords do not match.");
    changePasswordMutation.mutate({ email, password, otp });
  };

  const wrapperType =
    step === "email"
      ? "forgot-password"
      : step === "otp"
        ? "verify-otp"
        : "forgot-password";

  return (
    <AuthWrapper type={wrapperType}>
      <FormError message={serverError} />

      {/* ── Step 1: Email ── */}
      {step === "email" && (
        <div className="flex flex-col gap-4">
          <FormInput
            id="forgot-email-input"
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => {
              setServerError(null);
              setEmail(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSendOtp();
            }}
          />
          <Button
            id="send-otp-btn"
            type="button"
            size="2xl"
            variant="secondary"
            disabled={!email.trim() || sendOtpMutation.isPending}
            loading={sendOtpMutation.isPending}
            onClick={handleSendOtp}
          >
            Send verification code
          </Button>
        </div>
      )}

      {/* ── Step 2: OTP ── */}
      {step === "otp" && (
        <div className="space-y-5 pt-2">
          <FormInput
            id="forgot-otp-input"
            placeholder="Enter 6-digit code"
            value={otp}
            onChange={(e) => {
              setServerError(null);
              setOtp(e.target.value.replace(/[^0-9]/g, "").slice(0, 6));
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && otp.length === 6) handleVerifyOtp();
            }}
            maxLength={6}
            inputMode="numeric"
          />

          <Button
            id="verify-otp-btn"
            type="button"
            size="2xl"
            className="w-full"
            variant="secondary"
            disabled={otp.length < 6}
            onClick={handleVerifyOtp}
          >
            Continue
          </Button>

          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              id="resend-otp-btn"
              className="h-10 flex items-center pr-5 font-medium text-c-80 hover:text-green cursor-pointer disabled:opacity-50 transition-all duration-300"
              disabled={resendSeconds > 0 || sendOtpMutation.isPending}
              onClick={() => {
                setServerError(null);
                sendOtpMutation.mutate(email);
              }}
            >
              {resendSeconds > 0 ? (
                <>
                  Resend in{" "}
                  <span className="font-semibold text-green ml-1">
                    {resendSeconds}s
                  </span>
                </>
              ) : (
                <span className="font-medium">Resend code</span>
              )}
            </button>

            <button
              type="button"
              id="change-email-btn"
              className="h-10 flex items-center pl-5 text-c-80 hover:text-green cursor-pointer transition-all duration-300"
              onClick={() => {
                setStep("email");
                setOtp("");
                setResendSeconds(0);
                setServerError(null);
              }}
            >
              Change email
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: New password ── */}
      {step === "password" && (
        <div className="flex flex-col gap-4">
          <PasswordInput
            id="new-password-input"
            placeholder="New password"
            value={password}
            onChange={(e) => {
              setServerError(null);
              setPassword(e.target.value);
            }}
            maxLength={80}
          />
          <PasswordInput
            id="confirm-password-input"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => {
              setServerError(null);
              setConfirmPassword(e.target.value);
            }}
            maxLength={80}
          />
          <Button
            id="reset-password-btn"
            type="button"
            size="2xl"
            variant="secondary"
            disabled={
              !password ||
              !confirmPassword ||
              changePasswordMutation.isPending
            }
            loading={changePasswordMutation.isPending}
            onClick={handleChangePassword}
          >
            Reset password
          </Button>
        </div>
      )}
    </AuthWrapper>
  );
}
