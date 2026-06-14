import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/applications/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello Applications</div>;
}
