import LogoIcon from "@repo/ui/icons/logo-icon";
import { Link } from "@tanstack/react-router";
import { APP_URL } from "#/lib/config";

export const AuthWrapper = ({
  children,
  type,
}: {
  children: React.ReactNode;
  type: "login" | "signup";
}) => {

  return (
    <main className="page-wrap px-4 pb-8 py-24 flex justify-center min-h-screen">
      <div className="max-w-100 w-full space-y-6">
        <div className="text-logo">
          <LogoIcon />
        </div>
        <div className="space-y-1">
          {type === "login" ? (
            <p className="text-2xl font-bold text-primary">
              Log in
            </p>
          ) : null}
          <p className="text-c-50">
            {type === "login" ? "Making Nigeria great" : "Join the movement"}
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
        </div>
      </div>
    </main>
  );
};
