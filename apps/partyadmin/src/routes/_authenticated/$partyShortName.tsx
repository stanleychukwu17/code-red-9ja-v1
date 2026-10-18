/**
 * @file Party Tenant Boundary Route
 * @description Dynamic parameter layout route `/$partyShortName`.
 * Ensures tenant isolation by comparing the URL `$partyShortName` with the authenticated user's
 * party affiliation stored in session context. Redirects cross-tenant attempts back to the user's home party.
 */

import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { APP_URL } from "#/lib/config";

export const Route = createFileRoute("/_authenticated/$partyShortName")({
  beforeLoad: ({ params, context }) => {
    const userDetails = context.userDetails;
    const userParty = userDetails?.party?.short_name;
    const pathParty = params.partyShortName;
    const roles: string[] = userDetails?.roles || (userDetails?.role ? [userDetails.role] : []);
    const isAdmin = roles.includes("admin") || roles.includes("super_admin");

    // Prevent cross-party tenant access unless admin/super_admin; bounce user to their own party dashboard
    if (!isAdmin && userParty && userParty.toLowerCase() !== pathParty.toLowerCase()) {
      throw redirect({
        to: APP_URL.partyHome,
        params: { partyShortName: userParty },
      });
    }
  },
  component: RouteComponent,
});

/**
 * Party Tenant Layout Component
 * Passes through to nested child routes within the validated party scope.
 */
function RouteComponent() {
  return <Outlet />;
}
