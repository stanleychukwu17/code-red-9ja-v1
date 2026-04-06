import { Button } from "@repo/ui/components/button";
import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: App });

function App() {
  return (
    <main>
      <div className="max-w-[400px] mx-auto space-y-5">
        <h1>Welcome to Free9ja</h1>
        <div className="flex gap-5 w-full">
          <Link to="/auth/login" className="w-full">
            <Button variant="" className="w-full px-10">
              Login
            </Button>
          </Link>
          <Link to="/auth/signup" className="w-full">
            <Button variant="tertiary" className="w-full px-10">
              Signup
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
