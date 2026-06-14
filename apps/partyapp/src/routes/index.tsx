import { Button } from "@repo/ui/components/button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { APP_URL } from "@/lib/config";
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
    <main>
      <Link to="/home">
        <p className="underline">Home</p>
      </Link>
    </main>
  );
}
