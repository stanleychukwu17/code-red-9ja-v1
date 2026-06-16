import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/$partyShortName/party-members")({
  component: PartyMembersRoute,
});

function PartyMembersRoute() {
  return <Outlet />;
}
