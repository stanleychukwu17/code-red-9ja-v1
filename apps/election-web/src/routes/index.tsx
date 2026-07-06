import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { checkIfRefreshTokenInCookie } from "#/lib/server/auth/auth";
import { getPageHeader } from "#/lib/shared/meta";

export const Route = createFileRoute("/")({
  head: () =>
    getPageHeader({
      title: "Home",
    }),
  beforeLoad: async () => {
    const isLoggedIn = await checkIfRefreshTokenInCookie();
    if (isLoggedIn.status === "success") {
      throw redirect({ to: "/home" });
    } else {
      throw redirect({ to: "/auth/login" });
    }
  },
  component: App,
});

function App() {
  return (
    <main>
      <Link to="/home">
        <p className="underline">Home</p>
      </Link>
    </main>
  );
}
