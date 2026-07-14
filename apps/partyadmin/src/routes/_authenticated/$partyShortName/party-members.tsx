import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/$partyShortName/party-members")({
  component: PartyAdminsRoute,
});

function PartyAdminsRoute() {
  return <Outlet />;
}
