import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/$partyShortName/party-members")({
  beforeLoad: ({ params, location }) => {
    const normalizedPath = location.pathname.replace(/\/$/, "");
    if (normalizedPath === `/${params.partyShortName}/party-members`) {
      throw redirect({
        to: "/$partyShortName/party-members/member",
        params: { partyShortName: params.partyShortName },
      });
    }
  },
  component: PartyAdminsRoute,
});

function PartyAdminsRoute() {
  return <Outlet />;
}
