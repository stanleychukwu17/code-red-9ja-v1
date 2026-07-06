import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/$partyShortName/elections")({
  component: ElectionsRoute,
});

function ElectionsRoute() {
  return <Outlet />;
}
