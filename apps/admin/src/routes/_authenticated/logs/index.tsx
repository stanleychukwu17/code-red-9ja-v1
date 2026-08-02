import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/logs/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello Logs</div>;
}
