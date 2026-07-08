import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { APP_URL } from "#/lib/config";

export const Route = createFileRoute("/_authenticated/$partyShortName")({
  beforeLoad: ({ params, context }) => {
    const userDetails = context.userDetails;
    const userParty = userDetails?.party?.short_name;
    const pathParty = params.partyShortName;

    if (userParty && userParty.toLowerCase() !== pathParty.toLowerCase()) {
      throw redirect({
        to: APP_URL.partyHome,
        params: { partyShortName: userParty },
      });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <Outlet />;
}
