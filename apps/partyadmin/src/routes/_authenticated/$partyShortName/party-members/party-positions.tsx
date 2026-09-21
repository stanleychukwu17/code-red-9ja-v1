/**
 * @file Party Positions Roster Page
 * @description Roster displaying party officials, executive positions, and leadership offices.
 * Lists national, zonal, and state executive positions with creation dialog support.
 */

import * as React from "react";
import {
  Layout,
  PageHeader,
  PageSearchLayer,
  AddButton,
} from "@repo/ui/components/custom/AdminLayouts";
import { PartyAdminsTable } from "#/components/Tables";
import { getPageHeader } from "#/lib/shared/meta";
import { createFileRoute } from "@tanstack/react-router";
import { getPartyAdminsTabs, getAllPartyAdmins } from "./-data";
import { PartyAdminsActions } from "#/components/party-members/PartyMembersActions";
import { UserFormDialog } from "@repo/ui/components/custom/UserFormDialog";

// Server Functions
import { getAllCountries, getStates, getCities } from "#/lib/server/countries";
import {
  getParties,
  getPresignedUploadURL,
  confirmFileUpload,
} from "#/lib/server/parties";
import { registerCandidate } from "#/lib/server/auth/auth";
import { updateUser } from "#/lib/server/users";

export const Route = createFileRoute(
  "/_authenticated/$partyShortName/party-members/party-positions",
)({
  head: () => getPageHeader({ title: "Party positions" }),
  component: RouteComponent,
});

/**
 * Party Positions Page Component
 * Renders party officials holding executive leadership and administration positions.
 */
function RouteComponent() {
  const { partyShortName } = Route.useParams();
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  const allPositions = React.useMemo(() => {
    const list = getAllPartyAdmins(partyShortName);
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.partyOffice.toLowerCase().includes(q) ||
        (item.role && item.role.toLowerCase().includes(q)),
    );
  }, [partyShortName, searchQuery]);

  return (
    <Layout>
      <PageHeader
        title="Party members"
        activeTab="party-positions"
        tabs={getPartyAdminsTabs(partyShortName)}
      />
      <PageSearchLayer
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        ariaLabel="Search party positions"
        placeholder="Search positions or officials"
        rightComponent={
          <>
            <PartyAdminsActions />
            <AddButton onClick={() => setIsFormOpen(true)} />
          </>
        }
      />

      {allPositions.length === 0 ? (
        <div className="w-full p-12 text-center text-c-40 font-medium bg-white rounded-2xl border border-[#dfdfdf]">
          No party positions found.
        </div>
      ) : (
        <PartyAdminsTable
          columns={[
            "Party official",
            "Role",
            "Party position / office",
            "Joined at",
          ]}
          items={allPositions}
        />
      )}

      <UserFormDialog
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        partyShortName={partyShortName}
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
