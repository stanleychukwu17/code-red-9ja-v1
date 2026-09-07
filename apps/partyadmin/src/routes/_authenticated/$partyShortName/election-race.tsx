import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_authenticated/$partyShortName/election-race",
)({
  component: ElectionRaceRoute,
});

function ElectionRaceRoute() {
  return <Outlet />;
}
