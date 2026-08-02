import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/settings/_general/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/settings/general/"!</div>;
}
