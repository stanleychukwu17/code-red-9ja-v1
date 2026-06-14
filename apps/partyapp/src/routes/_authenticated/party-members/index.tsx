import {
  Layout,
  PageHeader,
  PageSearchLayer,
} from "@repo/ui/components/custom/AdminLayouts";
import { PartyMembersTable } from "#/components/Tables";
import { getPageHeader } from "#/lib/shared/meta";
import { createFileRoute } from "@tanstack/react-router";
import { PARTY_MEMBERS_TABS, allPartyMembers } from "./dummy_data";
import { PartyMembersActions } from "#/components/party-members/PartyMembersActions";

export const Route = createFileRoute("/_authenticated/party-members/")({
  head: () => getPageHeader({ title: "Party members" }),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <Layout>
      <PageHeader
        title="Party members"
        activeTab="all"
        tabs={PARTY_MEMBERS_TABS}
      />
      <PageSearchLayer
        ariaLabel="Search party members"
        placeholder="Search"
        rightComponent={<PartyMembersActions />}
      />

      <PartyMembersTable
        columns={[
          "Party member",
          "Political office",
          "Party office",
          "Date joined",
        ]}
        items={allPartyMembers}
      />
    </Layout>
  );
}
