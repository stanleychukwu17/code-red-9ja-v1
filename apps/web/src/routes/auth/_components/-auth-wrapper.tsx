import LogoIcon from "@repo/ui/icons/logo-icon";
import { Link } from "@tanstack/react-router";
import { APP_URL } from "#/lib/config";

export const AuthWrapper = ({
  children,
  type,
}: {
  children: React.ReactNode;
  type: "login" | "signup" | "forgot-password";
}) => {
  const flow = type === "login" ? "login" : "forgot-password";

  return (
    <main className="page-wrap px-4 pb-8 py-24 flex justify-center min-h-screen">
      <div className="max-w-[400px] w-full space-y-6">
        <LogoIcon />
        <div className="space-y-1">
          {type === "login" || type === "forgot-password" ? (
            <p className="text-2xl font-bold text-primary">
              {type === "login" ? "Log in" : type === "forgot-password" ? "Recover password" : "Create an account"}
            </p>
          ) : null}
          <p className="text-c-50">
            {type === "login" ? "Making Nigeria great" : type === "forgot-password" ? "Reset your password" : "Join the movement"}
          </p>
        </div>

        {children}

        <div className="flex items-center justify-between text-sm text-primary">
          {type === "login" ? (
            <p className="text-center">
              Don't have an account? &nbsp;
              <Link to={APP_URL.auth.signup} className="text-primary font-medium">
                Sign up
              </Link>
            </p>
          ) : (
            <p className="text-center">
              Already have an account? &nbsp;
              <Link to={APP_URL.auth.login} className="text-primary font-medium">
                Log in
              </Link>
            </p>
          )}

          <p className="text-c-70 hover:text-c-90 cursor-pointer transition-colors duration-200">
              <Link 
                to={APP_URL.auth.securityQuestions}
                search={{flow}}
              >
                Forgot password
              </Link>
          </p>
        </div>
      </div>
    </main>
  );
};
