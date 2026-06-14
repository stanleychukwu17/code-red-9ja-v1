import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/applications")({
  component: ApplicationsRoute,
});

function ApplicationsRoute() {
  return <Outlet />;
}
