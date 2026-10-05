/**
 * @file Root Landing / Index Route
 * @description Entry point for unauthenticated visitors arriving at the root domain.
 * Provides a minimal redirect link to the Party Admin login portal.
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { getPageHeader } from "#/lib/shared/meta";
import { APP_URL } from "#/lib/config";

export const Route = createFileRoute("/")({
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
