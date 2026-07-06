import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/$partyShortName/applications")({
  component: ApplicationsRoute,
});

function ApplicationsRoute() {
  return <Outlet />;
}
