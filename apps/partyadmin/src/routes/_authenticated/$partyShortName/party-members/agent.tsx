import * as React from "react";
import {
  Layout,
  PageHeader,
  PageSearchLayer,
} from "@repo/ui/components/custom/AdminLayouts";
import { getPageHeader } from "#/lib/shared/meta";
import { createFileRoute } from "@tanstack/react-router";
import { getPartyAdminsTabs } from "./-data";
import { PartyAdminsActions } from "#/components/party-members/PartyMembersActions";

export const Route = createFileRoute(
  "/_authenticated/$partyShortName/party-members/agent",
)({
  head: () => getPageHeader({ title: "Party members - Polling agents" }),
  component: RouteComponent,
});

/**
 * Agent Party Members Component
 * Renders polling agents view.
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
        ariaLabel="Search party agents"
        placeholder="Search party agents..."
        rightComponent={<PartyAdminsActions showElectionFilter />}
      />

      <div className="w-full p-12 text-center text-c-40 font-medium bg-white dark:bg-neutral-900 rounded-2xl border border-[#dfdfdf] dark:border-neutral-800">
        No party agents found.
      </div>
    </Layout>
  );
}

