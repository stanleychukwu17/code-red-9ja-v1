import { createFileRoute } from "@tanstack/react-router";
import { getPageHeader } from "#/lib/shared/meta";

export const Route = createFileRoute("/")({
  head: () => getPageHeader({
    title: "Welcome"
  }),
  component: LandingPage
});

function LandingPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-2xl text-center space-y-6">
        <h1 className="text-4xl font-extrabold tracking-tight">
          Welcome to the Landing Page
        </h1>
        <p className="text-xl text-muted-foreground">
          This is some dummy data for the index page. We will build out a full landing page here later!
        </p>
      </div>
    </main>
  );
}
