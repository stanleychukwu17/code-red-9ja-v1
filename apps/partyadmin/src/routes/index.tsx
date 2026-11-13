/**
 * @file Root Landing / Index Route
 * @description Entry point for unauthenticated visitors arriving at the root domain.
 * Provides a minimal redirect link to the Party Admin login portal.
 */

import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { getPageHeader } from "#/lib/shared/meta";
import { APP_URL } from "#/lib/config";
import { checkIfRefreshTokenInCookie, getUserDetailsCookie } from "#/lib/server/auth/auth";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const res = await checkIfRefreshTokenInCookie();
    if (res.success) {
      const user = await getUserDetailsCookie();
      if (user?.party?.short_name) {
        throw redirect({
          to: APP_URL.partyHome,
          params: { partyShortName: user.party.short_name },
        });
      }
      throw redirect({ to: APP_URL.parties });
    }
  },
  head: () =>
    getPageHeader({
      title: "Home",
    }),
  component: App,
});

/**
 * Root Landing Component
 * Renders fallback navigation link to the login screen.
 */
function App() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <Link to={APP_URL.auth.login} className="text-[#234f3e] hover:underline font-medium">
        Go to Log in
      </Link>
    </main>
  );
}
