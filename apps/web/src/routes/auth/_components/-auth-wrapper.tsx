import LogoIcon from "@repo/ui/icons/logo-icon";
import { Link } from "@tanstack/react-router";

export const AuthWrapper = ({
  children,
  type,
}: {
  children: React.ReactNode;
  type: "login" | "signup";
}) => {
  return (
    <main className="page-wrap px-4 pb-8 py-24 flex items-center justify-center">
      <div className="max-w-[400px] w-full space-y-6">
        <LogoIcon />
        <div className="space-y-1">
          <p className="text-2xl font-bold text-primary">
            {type === "login" ? "Log in" : "Create an account"}
          </p>
          <p className="text-c-50">
            {type === "login" ? "Make your vote count" : "Join the movement"}
          </p>
        </div>

        {children}

        <div className="flex items-center justify-between text-sm text-primary">
          {type === "login" ? (
            <p className="text-center">
              Don't have an account?{" "}
              <Link to="/auth/signup" className="text-primary font-medium">
                Sign up
              </Link>
            </p>
          ) : (
            <p className="text-center">
              Already have an account?{" "}
              <Link to="/auth/login" className="text-primary font-medium">
                Log in
              </Link>
            </p>
          )}

          <p className="text-c-70 hover:text-c-90 cursor-pointer transition-colors duration-200">
            Forgot password
          </p>
        </div>
      </div>
    </main>
  );
};
