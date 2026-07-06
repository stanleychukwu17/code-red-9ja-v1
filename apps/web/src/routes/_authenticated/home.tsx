import { Button } from "@repo/ui/components/button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { APP_URL, APP_NAME } from "@/lib/config";
import { getPageHeader } from "#/lib/shared/meta";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => getPageHeader({
    title: "Home"
  }),
  component: Home
});

function Home() {
  return (
    <main>
      <div className="max-w-[400px] mx-auto space-y-5">
        <h1>Welcome to, wetin dey happen {APP_NAME}</h1>
        <div className="flex gap-5 w-full">
          <Link to={APP_URL.auth.login} className="w-full">
            <Button variant="default" className="w-full px-10">
              Login
            </Button>
          </Link>
          <Link to={APP_URL.auth.signup} className="w-full">
            <Button variant="tertiary" className="w-full px-10">
              Signup
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
