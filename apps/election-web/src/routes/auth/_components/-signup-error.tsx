import type { ErrorComponentProps } from "@tanstack/react-router";
import { AuthWrapper } from "./-auth-wrapper";
import { PiWarningCircleDuotone } from "react-icons/pi";

/**
 * SignupError
 * Fallback error boundary component rendered by TanStack Router
 * if route loader or critical network dependencies fail on /auth/signup.
 */
export function SignupError({ error }: ErrorComponentProps) {

  return (
    <AuthWrapper type="signup">
      <div className="flex flex-col items-center justify-center gap-6 py-12 text-center backdrop-blur-sm rounded-2xl">
        <div className="relative">
          <div className="absolute inset-0 bg-destructive/20 blur-xl rounded-full"></div>
          <PiWarningCircleDuotone className="size-16 text-destructive relative z-1" />
        </div>
        
        <div className="space-y-2 px-6">
          <h2 className="text-2xl font-bold text-destructive tracking-tight">Oops! Something went wrong</h2>
          <p className="text-sm text-c-70 leading-relaxed max-w-[280px] mx-auto">
            {error?.message}
          </p>
        </div>
      </div>
    </AuthWrapper>
  );
}
