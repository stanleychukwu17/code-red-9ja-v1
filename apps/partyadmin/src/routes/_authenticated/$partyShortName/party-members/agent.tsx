/**
 * @file Party Members Agent Roster Page
 * @description Filtered sub-roster displaying party members who also serve as active agents.
 * Lists political office, party office, and registration timestamps.
 */

import * as React from "react";
import {
  Layout,
  PageHeader,
  PageSearchLayer,
} from "@repo/ui/components/custom/AdminLayouts";
import { PartyAdminsTable } from "#/components/Tables";
import { getPageHeader } from "#/lib/shared/meta";
import { createFileRoute } from "@tanstack/react-router";
import { getPartyAdminsTabs, getAgentPartyAdmins } from "./-data";
import { PartyAdminsActions } from "#/components/party-members/PartyMembersActions";

export const Route = createFileRoute(
  "/_authenticated/$partyShortName/party-members/agent",
)({
  head: () => getPageHeader({ title: "Party members" }),
  component: RouteComponent,
});

/**
 * Agent Party Members Component
 * Renders members holding agent credentials along with election context filters.
 */
function RouteComponent() {
  const { partyShortName } = Route.useParams();

  return (
    <Layout>
      <PageHeader
        title="Party members"
        activeTab="agent"
        tabs={getPartyAdminsTabs(partyShortName)}
      />
      <PageSearchLayer
        ariaLabel="Search party members"
        placeholder="Search"
        rightComponent={<PartyAdminsActions showElectionFilter />}
      />

      <PartyAdminsTable
        columns={[
          "Party member",
          "Political office",
          "Party office",
          "Joined at",
        ]}
        items={getAgentPartyAdmins(partyShortName)}
      />
    </Layout>
  );
}
