import { createFileRoute, Link } from "@tanstack/react-router";
import { getPageHeader } from "#/lib/shared/meta";

export const Route = createFileRoute("/")({
  head: () =>
    getPageHeader({
      title: "Home",
    }),
  component: App,
});

function App() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <Link to="/auth/login" className="text-[#234f3e] hover:underline font-medium">
        Go to Log in
      </Link>
    </main>
  );
}
