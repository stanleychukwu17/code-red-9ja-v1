import LogoIcon from "@repo/ui/icons/logo-icon";
import { Link } from "@tanstack/react-router";
import { APP_URL } from "#/lib/config";
import { cn } from "@repo/ui/lib/utils";
import ArrowDownIcon from "@repo/ui/icons/arrow-down-icon";
import { ReactNode } from "react";

/**
 * Renders the main Free9ja logo with text.
 * Hidden text on small screens, shown on medium+.
 */
export function Free9jaLogo() {
  return (
    <div className="flex items-center gap-4 text-primary w-full">
      <LogoIcon className="size-8 shrink-0" />
      <p className="text-[24px] font-semibold hidden md:block w-full text-center md:text-left">
        Free9ja.
      </p>
    </div>
  );
}

/**
 * Main wrapper layout for authentication pages (login, signup, forgot password, OTP).
 * Handles the dynamic rendering of titles, subtitles, and bottom navigation links.
 */
export const AuthWrapper = ({
  children,
  type,
  email,
}: {
  children: React.ReactNode;
  type: "login" | "signup" | "forgot-password" | "verify-otp";
  email?: string;
}) => {
  const flow = type === "login" ? "login" : "forgot-password";
  let title = "";
  let subtitle: React.ReactNode = "";

  switch (type) {
    case "login":
      title = "Log in";
      subtitle = "Sign in to your account to continue";
      break;
    case "signup":
      title = "Sign up";
      subtitle = "Ensure your vote counts every election.";
      break;
    case "forgot-password":
      title = "Forgot password";
      subtitle = "Enter your email address to reset your password";
      break;
    case "verify-otp":
      title = "Enter verification code";
      subtitle = email ? (
        <span>
          We sent a 6-digit code to{" "}
          <span className="font-semibold text-primary break-all">{email}</span>.
          The code expires in 10 minutes.
        </span>
      ) : (
        "Enter the code we sent to your email address. The code expires in 10 minutes."
      );
      break;
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top Header Logo */}
      <AuthHeader />
      <div className="mx-auto w-full max-w-100 flex flex-col justify-center gap-5 px-4 py-12">
        <div className="space-y-2 pt-7">
          <h1 className="text-primary text-2xl font-bold">{title}</h1>
          <div className="text-c-60 text-sm leading-relaxed">{subtitle}</div>
        </div>

        <div className="h-full w-full pt-3">{children}</div>

        {type !== "verify-otp" && type !== "forgot-password" && (
          <div className="flex items-center justify-between text-sm text-primary">
            {type === "login" ? (
              <p className="h-10 flex items-center text-center">
                Don't have an account? &nbsp;
                <Link to={APP_URL.auth.signup} className="text-primary font-medium">Sign up</Link>
              </p>
            ) : (
              <p className="h-10 flex items-center text-center">
                Already have an account? &nbsp;
                <Link to={APP_URL.auth.login} className="text-primary font-medium">Log in</Link>
              </p>
            )}

            <p className="h-10 flex items-center text-c-70 hover:text-c-90 cursor-pointer transition-colors duration-200">
              <Link to={APP_URL.auth.forgotPassword}> Forgot password </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Header specifically used for Auth pages, containing the logo.
 */
export function AuthHeader({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 text-[#234f3e] h-16 md:h-28 px-4 md:px-12", className)}>
      <Free9jaLogo />
    </div>
  );
}

/**
 * Container wrapper for the onboarding flow to set a consistent max-width.
 */
export function OnboardingWrapper({ children, className }: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto flex w-full max-w-107 flex-1 flex-col", className)}>
      {children}
    </div>
  );
}

/**
 * Header for the onboarding flow. Optionally includes a back button.
 */
export function OnboardingHeader({ onBack }: { onBack?: () => void }) {
  return (
    <div className="z-50 flex items-center gap-4 md:gap-10 h-16 md:h-28 px-4 md:px-12 sticky top-0 bg-background/80 backdrop-blur-2xl">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="flex size-11 items-center justify-center rounded-full text-c-80 transition-colors hover:bg-black/5"
          aria-label="Go back"
        >
          <ArrowDownIcon className="size-7 rotate-90" />
        </button>
      )}
      <Free9jaLogo />
    </div>
  );
}

/**
 * Renders the title, subtitle, and an icon for an onboarding step.
 */
export function OnboardingHeaderContent({ title, subtitle, icon }: {
  title: string;
  subtitle: string;
  icon: ReactNode;
}) {
  return (
    <OnboardingWrapper>
      <div className="mb-5 flex size-12 items-center justify-center rounded-full bg-primary/10 dark:bg-secondary">
        {icon}
      </div>

      <div className="mb-8 space-y-2">
        <h1 className="text-[24px] font-bold leading-none tracking-[-0.04em] text-primary">
          {title}
        </h1>
        <p className="max-w-88 text-base leading-6 text-c-50">{subtitle}</p>
      </div>
    </OnboardingWrapper>
  );
}
