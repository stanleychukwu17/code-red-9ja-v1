import * as React from "react";
import {
  Layout,
  PageHeader,
  PageSearchLayer,
  AddButton,
} from "@repo/ui/components/custom/AdminLayouts";
import { PartyMembersTable } from "#/components/Tables";
import { getPageHeader } from "#/lib/shared/meta";
import { createFileRoute } from "@tanstack/react-router";
import { getPartyMembersTabs, getAgentPartyMembers } from "./-data";
import { PartyMembersActions } from "#/components/party-members/PartyMembersActions";
import { UserFormDialog } from "@repo/ui/components/custom/UserFormDialog";

// Server Functions
import { getAllCountries, getStates, getCities } from "#/lib/server/countries";
import { getParties, getPresignedUploadURL, confirmFileUpload } from "#/lib/server/parties";
import { registerCandidate } from "#/lib/server/auth/auth";
import { updateUser } from "#/lib/server/users";

export const Route = createFileRoute("/_authenticated/$partyShortName/party-members/agent")({
  head: () => getPageHeader({ title: "Party members" }),
  component: RouteComponent,
});

function RouteComponent() {
  const { partyShortName } = Route.useParams();
  const [isFormOpen, setIsFormOpen] = React.useState(false);

  return (
    <Layout>
      <PageHeader
        title="Party members"
        activeTab="agent"
        tabs={getPartyMembersTabs(partyShortName)}
      />
      <PageSearchLayer
        ariaLabel="Search party members"
        placeholder="Search"
        rightComponent={
          <>
            <PartyMembersActions showElectionFilter />
            <AddButton onClick={() => setIsFormOpen(true)} />
          </>
        }
      />

      <PartyMembersTable
        columns={[
          "Party member",
          "Political office",
          "Party office",
          "Joined at",
        ]}
        items={getAgentPartyMembers(partyShortName)}
      />

      <UserFormDialog
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        partyShortName={partyShortName}
        defaultRole="user"
        defaultRoleLevel="pollingagent"
        getAllCountries={getAllCountries}
        getStates={getStates}
        getCities={getCities}
        getParties={getParties}
        getPresignedUploadURL={getPresignedUploadURL}
        confirmFileUpload={confirmFileUpload}
        registerCandidate={registerCandidate}
        updateUser={updateUser}
      />
    </Layout>
  );
}
