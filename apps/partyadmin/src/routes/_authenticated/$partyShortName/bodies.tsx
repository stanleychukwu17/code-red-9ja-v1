import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/$partyShortName/bodies")({
  component: BodiesRoute,
});

function BodiesRoute() {
  return <Outlet />;
}
