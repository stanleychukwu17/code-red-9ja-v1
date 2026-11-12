/**
 * @file Party Situation Room Tenant Boundary Route
 * @description Dynamic parameter layout route `/$partyShortName`.
 * Ensures tenant isolation for party situation room operators.
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

    if (!pathParty) {
      if (isAdmin) {
        throw redirect({ to: APP_URL.parties });
      }

      if (userParty) {
        throw redirect({
          to: APP_URL.controlCenter.home(userParty),
        });
      }

      throw redirect({ to: APP_URL.auth.login });
    }

    if (!isAdmin) {
      if (!userParty) {
        throw new Error("You are not associated with any political party situation room.");
      }

      if (userParty.toLowerCase() !== pathParty.toLowerCase()) {
        throw redirect({
          to: APP_URL.controlCenter.home(userParty),
        });
      }
    }
  },

  component: () => <Outlet />,
});
