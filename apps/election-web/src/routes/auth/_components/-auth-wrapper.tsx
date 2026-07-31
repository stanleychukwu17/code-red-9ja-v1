import LogoIcon from "@repo/ui/icons/logo-icon";
import { Link } from "@tanstack/react-router";
import { APP_URL } from "#/lib/config";
import { cn } from "@repo/ui/lib/utils";
import ArrowDownIcon from "@repo/ui/icons/arrow-down-icon";
import { ReactNode } from "react";

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

export const AuthWrapper = ({
  children,
  type,
}: {
  children: React.ReactNode;
  type: "login" | "signup" | "forgot-password";
}) => {
  const flow = type === "login" ? "login" : "forgot-password";

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top Header Logo */}
      <AuthHeader />
      <div className="mx-auto w-full max-w-[400px] flex flex-col justify-center gap-8 px-4 py-12">
        <div className="space-y-2 pt-7">
          <h1 className="text-primary text-2xl font-bold">Sign Up</h1>
          <p className="text-c-60">Ensure your vote counts every election.</p>
        </div>

        <div className="h-full w-full">{children}</div>

        <div className="flex items-center justify-between text-sm text-primary">
          {type === "login" ? (
            <p className="text-center">
              Don't have an account? &nbsp;
              <Link
                to={APP_URL.auth.signup}
                className="text-primary font-medium"
              >
                Sign up
              </Link>
            </p>
          ) : (
            <p className="text-center">
              Already have an account? &nbsp;
              <Link
                to={APP_URL.auth.login}
                className="text-primary font-medium"
              >
                Log in
              </Link>
            </p>
          )}

          <p className="text-c-70 hover:text-c-90 cursor-pointer transition-colors duration-200">
            <Link to={APP_URL.auth.securityQuestions} search={{ flow }}>
              Forgot password
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export function AuthHeader({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 text-[#234f3e] h-16 md:h-28 px-4 md:px-12",
        className,
      )}
    >
      <Free9jaLogo />
    </div>
  );
}

export function OnboardingWrapper({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-[430px] flex-1 flex-col",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function OnboardingHeader({ onBack }: { onBack: () => void }) {
  return (
    <div className="z-50 flex items-center gap-4 md:gap-10 h-16 md:h-28 px-4 md:px-12 sticky top-0 bg-background/80 backdrop-blur-2xl">
      <button
        type="button"
        onClick={onBack}
        className="flex size-11 items-center justify-center rounded-full text-c-80 transition-colors hover:bg-black/5"
        aria-label="Go back"
      >
        <ArrowDownIcon className="size-7 rotate-90" />
      </button>
      <Free9jaLogo />
    </div>
  );
}

export function OnboardingHeaderContent({
  title,
  subtitle,
  icon,
}: {
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
